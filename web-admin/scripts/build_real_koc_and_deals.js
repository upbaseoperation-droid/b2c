const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../..');
const MASTER_KOC_FILE = path.join(ROOT_DIR, 'Danh_Ba_Chuan_Hoa_Master_KOC_KOL_B2C_2026.xlsx');
const FILE_34 = path.join(ROOT_DIR, 'B2C_Quản lý Booking_3.4 KOCs tổng hợp.xlsx');
const FILE_32 = path.join(ROOT_DIR, 'B2C_Quản lý Booking_3.2 List duyệt book.xlsx');
const OUT_FILE = path.join(__dirname, '../src/lib/realKocMasterData.ts');

function cellVal(cell) {
  if (!cell || cell.value === null || cell.value === undefined) return '';
  const v = cell.value;
  if (typeof v === 'object') {
    if (v.result !== undefined && v.result !== null) return v.result;
    if (v.text !== undefined) return v.text;
    if (v.hyperlink !== undefined) return v.hyperlink;
    if (v instanceof Date) return v.toISOString();
    return '';
  }
  return v;
}

function cleanStr(val) {
  if (val === null || val === undefined) return '';
  const s = String(val).trim();
  if (s === 'null' || s === 'undefined' || s === '#N/A' || s === 'NaN' || s === '#REF!') return '';
  return s;
}

function cleanNum(val) {
  if (typeof val === 'number') return isFinite(val) ? val : 0;
  if (!val) return 0;
  const s = String(val).replace(/[₫$,\s%]/g, '').trim();
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

function normHandle(raw) {
  return cleanStr(raw).toLowerCase().replace(/^@/, '').replace(/\s+/g, '');
}

const VALID_TEP_KENH = new Set([
  'Review Nữ', 'Review Nam', 'Unboxing', 'Seller', 'Mẹ bé (bầu)', 'Mẹ bé (bé)',
  'Gia đình', 'Couple', 'Beauty', 'Health', 'Makeup Artist', 'Tóc',
  'Bác sỹ/chuyên gia', 'Gym', 'Eat Clean', 'Thời trang (review)',
  'Thời trang (có kiến thức)', 'Lifestyle', 'Nhà cửa đời sống', 'Cooking',
  'Thú cưng', 'POV', 'Dance', 'Cosplay', 'Tin tức', 'LGBT', 'KOL', 'Nữ xinh', 'Chưa phân loại'
]);

function normalizeTepKenh(raw) {
  const s = cleanStr(raw);
  if (!s) return 'Review Nữ';
  if (VALID_TEP_KENH.has(s)) return s;
  const lower = s.toLowerCase();
  if (lower.includes('mẹ') && lower.includes('bầu')) return 'Mẹ bé (bầu)';
  if (lower.includes('mẹ') || lower.includes('bé')) return 'Mẹ bé (bé)';
  if (lower.includes('bác s') || lower.includes('chuyên gia') || lower.includes('dược')) return 'Bác sỹ/chuyên gia';
  if (lower.includes('beauty') || lower.includes('làm đẹp') || lower.includes('skincare')) return 'Beauty';
  if (lower.includes('makeup')) return 'Makeup Artist';
  if (lower.includes('review nam')) return 'Review Nam';
  if (lower.includes('review nữ')) return 'Review Nữ';
  if (lower.includes('unbox')) return 'Unboxing';
  if (lower.includes('gia đình')) return 'Gia đình';
  if (lower.includes('couple') || lower.includes('cặp đôi')) return 'Couple';
  if (lower.includes('thời trang') || lower.includes('fashion')) return 'Thời trang (review)';
  if (lower.includes('nhà cửa')) return 'Nhà cửa đời sống';
  if (lower.includes('cooking') || lower.includes('nấu ăn') || lower.includes('ẩm thực')) return 'Cooking';
  if (lower.includes('gym') || lower.includes('thể thao')) return 'Gym';
  if (lower.includes('lifestyle') || lower.includes('đời sống')) return 'Lifestyle';
  if (lower.includes('kol')) return 'KOL';
  if (lower.includes('nữ xinh')) return 'Nữ xinh';
  return 'Review Nữ';
}

function normalizeKocCategory(raw, tepKenh, topCat34) {
  const s = cleanStr(raw).toLowerCase();
  const top = cleanStr(topCat34).toLowerCase();
  const tep = cleanStr(tepKenh).toLowerCase();
  const combined = `${s} ${top} ${tep}`;

  if (combined.includes('mom') || combined.includes('baby') || combined.includes('mẹ') || combined.includes('bé')) {
    return 'Mom and baby';
  }
  if (combined.includes('fashion') || combined.includes('wear') || combined.includes('shoes') || combined.includes('thời trang')) {
    return 'Fashion';
  }
  if (combined.includes('elha') || combined.includes('điện') || combined.includes('gia dụng') || combined.includes('nhà cửa')) {
    return 'ELHA';
  }
  if (combined.includes('f&b') || combined.includes('food') || combined.includes('cooking') || combined.includes('eat')) {
    return 'F&B';
  }
  if (combined.includes('social') || combined.includes('comedian') || combined.includes('pov') || combined.includes('dance')) {
    return 'Social / Comedian';
  }
  if (combined.includes('travel') || combined.includes('du lịch')) {
    return 'Travel/Hospitality';
  }
  if (combined.includes('lifestyle') || combined.includes('gia đình') || combined.includes('couple')) {
    return 'Lifestyle';
  }
  if (s === 'reviewer' || (combined.includes('review') && !combined.includes('beauty') && !combined.includes('personal'))) {
    return 'Reviewer';
  }
  return 'Personal care';
}

function normalizeSalaryGrade(rawKl, rate) {
  const s = cleanStr(rawKl).toUpperCase();
  if (s === 'KL7') return 'KL7';
  if (s === 'KL6') return 'KL6';
  if (s === 'KL5') return 'KL5';
  if (s === 'KL4') return 'KL4';
  if (s === 'KL3') return 'KL3';
  if (s === 'KL2') return 'KL2';
  if (s === 'KL1') return 'KL1';
  if (s.includes('TAP') && s.includes('NGOÀI')) return 'TAP đối tác ngoài';
  if (s.includes('TAP') || s === 'FOC' || s === 'FREECAST') {
    if (rate > 0) {
      if (rate <= 500000) return 'KL1';
      if (rate <= 1500000) return 'KL2';
      if (rate <= 3000000) return 'KL3';
      if (rate <= 5000000) return 'KL4';
      if (rate <= 10000000) return 'KL5';
      if (rate <= 30000000) return 'KL6';
      return 'KL7';
    }
    return 'TAP UpAffiliate';
  }
  if (rate <= 0) return 'TAP UpAffiliate';
  if (rate <= 500000) return 'KL1';
  if (rate <= 1500000) return 'KL2';
  if (rate <= 3000000) return 'KL3';
  if (rate <= 5000000) return 'KL4';
  if (rate <= 10000000) return 'KL5';
  if (rate <= 30000000) return 'KL6';
  return 'KL7';
}

function getTierFromSalaryGrade(kl) {
  if (kl === 'KL7') return { tier: 'TIER_1_CELEB', tierLabel: 'Tier 1 (Celeb/Mega)', segment: 'Top Creator' };
  if (kl === 'KL6' || kl === 'TAP đối tác ngoài') return { tier: 'TIER_2_MACRO', tierLabel: 'Tier 2 (Macro)', segment: 'Key Creator' };
  if (kl === 'KL4' || kl === 'KL5') return { tier: 'TIER_3_MICRO', tierLabel: 'Tier 3 (Micro)', segment: 'Mid Creator' };
  return { tier: 'TIER_4_AFFILIATE', tierLabel: 'Tier 4 (Affiliate/Nano)', segment: 'Massive Creator' };
}

function normalizePillar(raw) {
  const s = cleanStr(raw);
  if (!s) return 'Review trực tiếp';
  const lower = s.toLowerCase();
  if (lower.includes('nỗi đau') || lower.includes('giải pháp')) return 'Nỗi đau - Giải pháp';
  if (lower.includes('unbox')) return 'Unboxing';
  if (lower.includes('fomo')) return 'FOMO';
  if (lower.includes('vlog') || lower.includes('story')) return 'Daily Vlog';
  if (lower.includes('educate') || lower.includes('kiến thức') || lower.includes('chuyên gia')) return 'Educate';
  return 'Review trực tiếp';
}

function formatIsoDate(val) {
  if (!val) return '';
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10);
  }
  const s = cleanStr(val);
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m1) {
    return `${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`;
  }
  const m2 = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (m2) {
    return `${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}`;
  }
  const m3 = s.match(/^(\d{4})\/(\d{1,2})$/);
  if (m3) {
    return `${m3[1]}-${m3[2].padStart(2, '0')}-15`;
  }
  return '';
}

function toTitleCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function prettifyStageName(handle, holderName) {
  const cleanH = cleanStr(handle).replace(/^@/, '');
  const holder = cleanStr(holderName);
  const isCompany = /CONG TY|CTY|TNHH|CO PHAN|DOANH NGHIEP|HOUSE|NETWORK|MEDIA|GROUP|ENTERTAINMENT/i.test(holder);
  if (holder && !isCompany && holder.length > 3 && !/^\d+$/.test(holder)) {
    return `${cleanH} (${toTitleCase(holder)})`;
  }
  return cleanH;
}

function mapPipelineToDealStatus(pipelineRaw, videoUrl, cost) {
  const p = cleanStr(pipelineRaw).toLowerCase();
  if (p.includes('hủy') || p.includes('cancel') || p.includes('từ chối')) {
    return { status: 'CANCELLED', statusLabel: 'Đã Hủy / Từ Chối' };
  }
  if (p.includes('done') || p.includes('hoàn tất') || p.includes('đã thanh toán') || p.includes('quyết toán')) {
    return cost === 0
      ? { status: 'COMPLETED', statusLabel: 'Hoàn Tất (Suất Gửi Mẫu FOC)' }
      : { status: 'FINAL_PAID', statusLabel: 'Hoàn Tất & Đã Tất Toán' };
  }
  if (p.includes('đã air') || p.includes('nghiệm thu') || videoUrl) {
    return { status: 'VIDEO_VERIFIED', statusLabel: 'Đã Lên Sóng & Nghiệm Thu' };
  }
  if (p.includes('video') || p.includes('draft')) {
    return { status: 'VIDEO_SUBMITTED', statusLabel: 'Đã Nộp Video Draft' };
  }
  if (p.includes('nhận mẫu') || p.includes('sản xuất')) {
    return { status: 'SAMPLE_RECEIVED', statusLabel: 'Đã Nhận Mẫu & Đang Quay' };
  }
  if (p.includes('gửi hàng') || p.includes('gửi mẫu')) {
    return { status: 'SAMPLE_SHIPPED', statusLabel: 'Đang Gửi Mẫu Sản Phẩm' };
  }
  if (p.includes('tạm ứng')) {
    return { status: 'ADVANCE_PAID', statusLabel: 'Đã Tạm Ứng Cát-xê' };
  }
  if (p.includes('hợp đồng')) {
    return { status: 'CONTRACT_GENERATED', statusLabel: 'Đã Lập Hợp Đồng' };
  }
  if (p.includes('kịch bản')) {
    return { status: 'SCRIPT_APPROVED', statusLabel: 'Đã Duyệt Kịch Bản' };
  }
  return cost === 0
    ? { status: 'COMPLETED', statusLabel: 'Hoàn Tất (Suất Gửi Mẫu FOC)' }
    : { status: 'COMPLETED', statusLabel: 'Hoàn Tất Nghiệm Thu' };
}

// Existing handles in koc-1..koc-20 to avoid duplicate KOC IDs
const EXISTING_KOC_HANDLE_MAP = new Map([
  ['megauriviu', 'koc-1'],
  ['chanhbeauty', 'koc-2'],
  ['me_bap_cai', 'koc-3'],
  ['drhangskincare', 'koc-3'],
  ['trang.beautytips', 'koc-4'],
  ['linhmeo.review', 'koc-5'],
  ['danxinhdaily', 'koc-6'],
  ['hamyunbox98', 'koc-7'],
  ['ngocanh.vlog', 'koc-8'],
  ['chloenguyen.official', 'koc-9'],
  ['mebausanhdieu', 'koc-10'],
  ['ninhanhbui', 'koc-11'],
  ['me_sam_sua', 'koc-12'],
  ['dr_le_phuc', 'koc-13'],
  ['huyen_be_map', 'koc-14'],
  ['me_gau_cham_con', 'koc-15'],
  ['trang_skin_lab', 'koc-16'],
  ['co_giao_thao_baby', 'koc-17'],
  ['bs_kim_ngan', 'koc-18'],
  ['nhung_me_ken', 'koc-19'],
  ['an_nhien_beauty', 'koc-20']
]);

// Existing deal codes in INITIAL_DEALS to avoid collision
const EXISTING_DEAL_CODES = new Set([
  'BO260952684', 'BO260811204', 'BO260719042', 'BO260509881', 'BO260947077',
  'BO260612904', 'BO260408192', 'BO260618032', 'BO260747027', 'BO260958301',
  'BO260958305', 'BO260849102', 'BO260849201', 'BO260849301', 'BO260849302',
  'BO260849303', 'BO260849304', 'BO260849310', 'BO260849312', 'BO260849314',
  'BO260849315'
]);

async function run() {
  console.log('1. Đang đọc file B2C_Quản lý Booking_3.4 KOCs tổng hợp.xlsx...');
  const wb34 = new ExcelJS.Workbook();
  await wb34.xlsx.readFile(FILE_34);
  const ws34 = wb34.worksheets[0];
  const map34 = new Map();

  for (let r = 2; r <= ws34.rowCount; r++) {
    const row = ws34.getRow(r);
    const handle = normHandle(cellVal(row.getCell(1)));
    if (!handle) continue;
    const email = cleanStr(cellVal(row.getCell(5)));
    const zalo = cleanStr(cellVal(row.getCell(6)));
    const otherContact = cleanStr(cellVal(row.getCell(7)));
    const gmvBestCase = cleanNum(cellVal(row.getCell(18)));
    const roi30 = cleanNum(cellVal(row.getCell(19)));
    const maleRaw = cleanNum(cellVal(row.getCell(20)));
    const femaleRaw = cleanNum(cellVal(row.getCell(21)));
    const age18Raw = cleanNum(cellVal(row.getCell(22)));
    const age25Raw = cleanNum(cellVal(row.getCell(23)));
    const age35Raw = cleanNum(cellVal(row.getCell(24)));
    const followers = Math.round(cleanNum(cellVal(row.getCell(25))));
    const itemsSold = Math.round(cleanNum(cellVal(row.getCell(26))));
    const gpm = Math.round(cleanNum(cellVal(row.getCell(27))));
    const shareVidRaw = cleanNum(cellVal(row.getCell(28)));
    const shareLiveRaw = cleanNum(cellVal(row.getCell(29)));
    const shareProdRaw = cleanNum(cellVal(row.getCell(30)));
    const avgViews = Math.round(cleanNum(cellVal(row.getCell(31))));
    const gmvReal = cleanNum(cellVal(row.getCell(34))) || cleanNum(cellVal(row.getCell(36)));
    const aov = Math.round(cleanNum(cellVal(row.getCell(38))));
    const videoCount = Math.round(cleanNum(cellVal(row.getCell(39))));
    const top1Cat = cleanStr(cellVal(row.getCell(42)));
    const top2Cat = cleanStr(cellVal(row.getCell(44)));
    const kocScore = cleanNum(cellVal(row.getCell(48)));

    const toPct = (v) => (v > 0 && v <= 1 ? Math.round(v * 100) : Math.round(v));

    map34.set(handle, {
      email: email.includes('@') ? email : '',
      zalo: zalo.replace(/\D/g, '').length >= 9 ? zalo.replace(/\D/g, '').slice(0, 11) : '',
      otherContact,
      gmvBestCase: Math.round(gmvBestCase),
      roi30,
      maleRatio: toPct(maleRaw),
      femaleRatio: toPct(femaleRaw),
      age18_24: toPct(age18Raw),
      age25_34: toPct(age25Raw),
      age35Plus: toPct(age35Raw),
      followers,
      itemsSold,
      gpm,
      gmvShareVideo: toPct(shareVidRaw),
      gmvShareLive: toPct(shareLiveRaw),
      gmvShareProductCard: toPct(shareProdRaw),
      avgViews,
      gmvReal: Math.round(gmvReal),
      aov,
      videoCount,
      topCategories: [top1Cat, top2Cat].filter(Boolean),
      kocScore
    });
  }

  console.log('2. Đang đọc file B2C_Quản lý Booking_3.2 List duyệt book.xlsx...');
  const wb32 = new ExcelJS.Workbook();
  await wb32.xlsx.readFile(FILE_32);
  const ws32 = wb32.worksheets[0];

  const dealsByHandle = new Map();
  for (let r = 2; r <= ws32.rowCount; r++) {
    const row = ws32.getRow(r);
    const dealCode = cleanStr(cellVal(row.getCell(1)));
    const rawKoc = cleanStr(cellVal(row.getCell(2)));
    const handle = normHandle(rawKoc);
    if (!handle || !dealCode || EXISTING_DEAL_CODES.has(dealCode)) continue;

    const storeName = cleanStr(cellVal(row.getCell(3)));
    const brandName = cleanStr(cellVal(row.getCell(4))) || (storeName ? storeName.split('_')[0] : 'Kutieskin');
    const picRaw = cleanStr(cellVal(row.getCell(5))) || cleanStr(cellVal(row.getCell(34)));
    const pic = picRaw.split(/[\r\n,]+/)[0]?.trim() || 'Lê Phương Thảo';
    const airDateIso = formatIsoDate(cellVal(row.getCell(6))) || formatIsoDate(cellVal(row.getCell(58))) || '2026-09-15';
    const videoType = cleanStr(cellVal(row.getCell(8)));
    const linkAirRaw = cleanStr(cellVal(row.getCell(9)));
    const linkAir = linkAirRaw.startsWith('http') ? linkAirRaw : '';
    const taxAccType = cleanStr(cellVal(row.getCell(17)));
    const cost = Math.round(cleanNum(cellVal(row.getCell(18))) || cleanNum(cellVal(row.getCell(42))));
    const formatRaw = cleanStr(cellVal(row.getCell(19)));
    const bankHolder = cleanStr(cellVal(row.getCell(23)));
    const bankAcc = cleanStr(cellVal(row.getCell(24)));
    const bankName = cleanStr(cellVal(row.getCell(25)));
    const cccdOrMst = cleanStr(cellVal(row.getCell(26)));
    const pipelineText = cleanStr(cellVal(row.getCell(28))) || cleanStr(cellVal(row.getCell(27))) || 'Done';
    const product = cleanStr(cellVal(row.getCell(31)));
    const note = cleanStr(cellVal(row.getCell(32)));
    const growthPic = cleanStr(cellVal(row.getCell(35))).split(/[\r\n,]+/)[0]?.trim() || '';
    const monthPlan = cleanStr(cellVal(row.getCell(36))) || cleanStr(cellVal(row.getCell(48))) || '2026/09';
    const tepKenh = cleanStr(cellVal(row.getCell(37)));
    const advanceAmt = Math.round(cleanNum(cellVal(row.getCell(40))));
    const paidAmt = Math.round(cleanNum(cellVal(row.getCell(43))));
    const adsCode = cleanStr(cellVal(row.getCell(45)));
    const contractLink = cleanStr(cellVal(row.getCell(47)));
    const accountPic = cleanStr(cellVal(row.getCell(53))).split(/[\r\n,]+/)[0]?.trim() || '';
    const kl = cleanStr(cellVal(row.getCell(56)));
    const leader = cleanStr(cellVal(row.getCell(62)));
    const views30 = Math.round(cleanNum(cellVal(row.getCell(68))) || cleanNum(cellVal(row.getCell(120))) || cleanNum(cellVal(row.getCell(63))));
    const orders30 = Math.round(cleanNum(cellVal(row.getCell(69))) || cleanNum(cellVal(row.getCell(64))));
    const gmv30 = Math.round(cleanNum(cellVal(row.getCell(70))) || cleanNum(cellVal(row.getCell(115))) || cleanNum(cellVal(row.getCell(65))));
    const gpm30 = Math.round(cleanNum(cellVal(row.getCell(71))));
    const roi30 = cleanNum(cellVal(row.getCell(72)));
    const perfEval = cleanStr(cellVal(row.getCell(76)));
    const segment = cleanStr(cellVal(row.getCell(82)));
    const location = cleanStr(cellVal(row.getCell(83)));
    const kocCat = cleanStr(cellVal(row.getCell(88)));
    const pillar = cleanStr(cellVal(row.getCell(89)));
    const angle = cleanStr(cellVal(row.getCell(93)));

    if (!dealsByHandle.has(handle)) dealsByHandle.set(handle, []);
    dealsByHandle.get(handle).push({
      dealCode,
      handle,
      rawKoc,
      storeName,
      brandName,
      pic,
      airDateIso,
      videoType,
      linkAir,
      taxAccType,
      cost,
      formatRaw,
      bankHolder,
      bankAcc,
      bankName,
      cccdOrMst,
      pipelineText,
      product,
      note,
      growthPic,
      monthPlan,
      tepKenh,
      advanceAmt,
      paidAmt,
      adsCode,
      contractLink: contractLink.startsWith('http') ? contractLink : '',
      accountPic,
      kl,
      leader,
      views30,
      orders30,
      gmv30,
      gpm30,
      roi30,
      perfEval,
      segment,
      location,
      kocCat,
      pillar,
      angle
    });
  }

  console.log('3. Đang đọc file Danh_Ba_Chuan_Hoa_Master_KOC_KOL_B2C_2026.xlsx...');
  const wbMaster = new ExcelJS.Workbook();
  await wbMaster.xlsx.readFile(MASTER_KOC_FILE);
  const wsMaster = wbMaster.worksheets[0];

  const masterRows = [];
  for (let r = 2; r <= wsMaster.rowCount; r++) {
    const row = wsMaster.getRow(r);
    const rawId = cleanStr(cellVal(row.getCell(2)));
    const handle = normHandle(rawId);
    if (!handle) continue;

    masterRows.push({
      stt: cleanNum(cellVal(row.getCell(1))),
      rawId,
      handle,
      channelLink: cleanStr(cellVal(row.getCell(3))) || `https://www.tiktok.com/@${handle}`,
      platformRaw: cleanStr(cellVal(row.getCell(4))),
      klRaw: cleanStr(cellVal(row.getCell(5))),
      collabGroup: cleanStr(cellVal(row.getCell(6))),
      docStatus: cleanStr(cellVal(row.getCell(7))),
      cccd: cleanStr(cellVal(row.getCell(8))),
      taxCode: cleanStr(cellVal(row.getCell(9))),
      bankHolder: cleanStr(cellVal(row.getCell(10))),
      bankAccount: cleanStr(cellVal(row.getCell(11))),
      bankName: cleanStr(cellVal(row.getCell(12))),
      taxAccountType: cleanStr(cellVal(row.getCell(13))),
      latestPic: cleanStr(cellVal(row.getCell(14))),
      latestBookMonth: cleanStr(cellVal(row.getCell(15))),
      latestBrand: cleanStr(cellVal(row.getCell(16))),
      latestBoCode: cleanStr(cellVal(row.getCell(17))),
      picCount: Math.round(cleanNum(cellVal(row.getCell(18)))),
      picList: cleanStr(cellVal(row.getCell(19))).replace(/[\r\n]+/g, ', '),
      latestRate: Math.round(cleanNum(cellVal(row.getCell(20)))),
      minRate: Math.round(cleanNum(cellVal(row.getCell(21)))),
      maxRate: Math.round(cleanNum(cellVal(row.getCell(22)))),
      totalPaidVideos: Math.round(cleanNum(cellVal(row.getCell(23)))),
      totalFocVideos: Math.round(cleanNum(cellVal(row.getCell(24)))),
      totalSpent: Math.round(cleanNum(cellVal(row.getCell(25)))),
      totalGmv30d: Math.round(cleanNum(cellVal(row.getCell(26)))),
      sharedMcnInfo: cleanStr(cellVal(row.getCell(27))),
      contractDriveUrl: cleanStr(cellVal(row.getCell(28)))
    });
  }

  const selectedHandles = new Set();
  const selectedMaster = [];

  function addRow(m) {
    if (EXISTING_KOC_HANDLE_MAP.has(m.handle)) return; // Already in koc-1..koc-20
    if (!selectedHandles.has(m.handle)) {
      selectedHandles.add(m.handle);
      selectedMaster.push(m);
    }
  }

  // Group 1: Top 220 by value (GMV + Spent)
  const byValue = [...masterRows].sort((a, b) => (b.totalGmv30d * 2 + b.totalSpent) - (a.totalGmv30d * 2 + a.totalSpent));
  byValue.slice(0, 220).forEach(addRow);

  // Group 2: Shared CCCD/MST pairs (top 45)
  masterRows.filter(m => m.sharedMcnInfo && (m.cccd || m.taxCode)).slice(0, 45).forEach(addRow);

  // Group 3: Missing legal docs with Paid booking history (top 35)
  masterRows.filter(m => !m.cccd && !m.taxCode && m.totalSpent > 0).slice(0, 35).forEach(addRow);

  // Group 4: FOC / TAP UpAffiliate with high FOC count or GMV (top 40)
  masterRows
    .filter(m => (m.klRaw === 'TAP UpAffiliate' || m.totalFocVideos > 0) && (m.totalGmv30d > 0 || m.totalFocVideos >= 3))
    .sort((a, b) => (b.totalGmv30d + b.totalFocVideos * 1000000) - (a.totalGmv30d + a.totalFocVideos * 1000000))
    .slice(0, 40)
    .forEach(addRow);

  const builtKocs = [];
  const builtDeals = [];
  const seenDealCodes = new Set(EXISTING_DEAL_CODES);

  // Also include deals for megauriviu (koc-1) from File 3.2!
  const megaDeals = dealsByHandle.get('megauriviu') || [];
  let dealCounter = 1;

  function appendDealsForKoc(kocId, stageName, channelId, tier, salaryGrade, segment, defaultTep, defaultCat, dList) {
    // Sort deals by GMV desc, then cost desc, then airDateIso desc, take up to 5
    const sorted = [...dList].sort((a, b) => {
      if (b.gmv30 !== a.gmv30) return b.gmv30 - a.gmv30;
      if (b.cost !== a.cost) return b.cost - a.cost;
      return b.airDateIso.localeCompare(a.airDateIso);
    });
    const picked = sorted.slice(0, 5);
    for (const d of picked) {
      let code = d.dealCode;
      if (seenDealCodes.has(code)) {
        code = `${code}_${dealCounter}`;
      }
      seenDealCodes.add(code);

      const totalVal = d.cost;
      const adv = d.advanceAmt > 0 && d.advanceAmt <= totalVal ? d.advanceAmt : 0;
      const fin = Math.max(0, totalVal - adv);
      const { status, statusLabel } = mapPipelineToDealStatus(d.pipelineText, d.linkAir, totalVal);
      const tep = normalizeTepKenh(d.tepKenh || defaultTep);
      const cat = normalizeKocCategory(d.kocCat, tep, defaultCat);
      const pillar = normalizePillar(d.pillar);
      const gmv = d.gmv30;
      const views = d.views30 > 0 ? d.views30 : (gmv > 0 ? Math.max(8500, Math.round(gmv / 650)) : 12000);
      const orders = d.orders30 > 0 ? d.orders30 : (gmv > 0 ? Math.max(1, Math.round(gmv / 245000)) : 0);
      const roi = d.roi30 > 0
        ? Number(d.roi30.toFixed(2))
        : (totalVal > 0 && gmv > 0 ? Number((gmv / totalVal).toFixed(2)) : (totalVal === 0 && gmv > 0 ? 50 : 0));
      const cpo = orders > 0 && totalVal > 0 ? Math.round(totalVal / orders) : 0;
      const isFoc = totalVal === 0 || d.videoType.toLowerCase().includes('free') || d.kl === 'TAP UpAffiliate';
      const bookingFormat = d.formatRaw.toLowerCase().includes('live')
        ? 'Booking Livestream KOC'
        : isFoc
        ? 'Affiliate Thuần'
        : 'Booking Video KOC';

      const perfRating = roi >= 3.5 || (isFoc && gmv >= 3000000)
        ? 'XUẤT_SẮC'
        : roi >= 1.5 || gmv > 0
        ? 'ĐẠT_MỤC_TIÊU'
        : 'CẦN_CẢI_THIỆN';

      const dealObj = {
        id: `deal-real-${dealCounter++}`,
        dealCode: code,
        jobId: code.replace(/^BO/, 'ID'),
        campaignCode: `CAMP-${(d.brandName || 'B2C').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)}-${(d.monthPlan || '2026').replace(/\D/g, '').slice(-4) || '2026'}`,
        campaignTitle: `Chiến dịch Booking ${d.brandName || 'B2C'} (${d.monthPlan || '2026'})`,
        brandName: d.brandName || 'Kutieskin',
        storeName: d.storeName || `${d.brandName || 'Kutieskin'}_TikTok`,
        productName: d.product || `Sản phẩm chiến dịch ${d.brandName || 'B2C'}`,
        bookingBatch: d.monthPlan || 'Đợt 1',
        bookingFormat,
        kocId,
        kocStageName: stageName,
        kocChannelId: `@${channelId}`,
        kocTier: tier,
        salaryGrade,
        segment,
        tepKenh: tep,
        kocCategory: cat,
        contentPillar: pillar,
        brandApprovalStatus: 'ĐÃ_DUYỆT',
        kocResponseStatus: 'ĐỒNG_Ý',
        pipelineText: d.pipelineText || 'Done',
        status,
        statusLabel,
        sampleStatus: 'ĐÃ_NHẬN',
        adsCodeStatus: d.adsCode ? 'ĐÃ_NGHIỆM_THU' : 'CHƯA_CẤP',
        ...(d.adsCode ? { sparkAdsCode: d.adsCode } : {}),
        ...(d.linkAir ? { videoUrl: d.linkAir, tiktokVideoUrl: d.linkAir } : {}),
        assignedStaff: d.pic || 'Lê Phương Thảo',
        bookingPic: d.pic || 'Lê Phương Thảo',
        ...(d.growthPic ? { growthPic: d.growthPic } : {}),
        ...(d.accountPic ? { accountPic: d.accountPic } : {}),
        ...(d.leader ? { leadBooking: d.leader } : {}),
        ...(d.note ? { contentNote: d.note } : {}),
        totalValue: totalVal,
        advanceAmount: adv,
        finalAmount: fin,
        deadlinePost: d.airDateIso || '2026-09-15',
        postedDate: d.airDateIso || '2026-09-15',
        viewsCount: views,
        affiliateGmv: gmv,
        gmv30: gmv,
        roi,
        publishedDays: 30,
        isWinnerTop20: roi >= 4.0 && gmv >= 15000000,
        hasGmv: gmv > 0,
        isBreakEven: roi >= 1.5,
        remainingSlaHours: 0,
        isSlaWarning: false,
        ordersCount: orders,
        ...(cpo > 0 ? { cpo } : {}),
        ...(isFoc ? { focSampleCost: 180000 } : {}),
        organicGmv: Math.round(gmv * 0.7),
        adsGmv: Math.round(gmv * 0.3),
        isScriptOnTime: true,
        isPostOnTime: true,
        ratingScore: perfRating === 'XUẤT_SẮC' ? 4.9 : perfRating === 'ĐẠT_MỤC_TIÊU' ? 4.5 : 4.0,
        performanceRating: perfRating,
        ...(d.contractLink ? { signedContractUrl: d.contractLink } : {})
      };
      builtDeals.push(dealObj);
    }
  }

  // Append megauriviu deals to koc-1
  appendDealsForKoc(
    'koc-1',
    'Mega Uri Review',
    'megauriviu',
    'TIER_2_MACRO',
    'KL6',
    'Key Creator',
    'Review Nữ',
    'Personal care',
    megaDeals
  );

  for (let i = 0; i < selectedMaster.length; i++) {
    const m = selectedMaster[i];
    const kocId = `koc-${i + 21}`;
    const info34 = map34.get(m.handle) || {};
    const dList = dealsByHandle.get(m.handle) || [];
    const latestDeal = dList[0] || {};

    const rate = m.latestRate || m.maxRate || latestDeal.cost || 0;
    const salaryGrade = normalizeSalaryGrade(m.klRaw || latestDeal.kl, rate);
    const { tier, tierLabel, segment } = getTierFromSalaryGrade(salaryGrade);
    const tepKenh = normalizeTepKenh(latestDeal.tepKenh);
    const topCats = info34.topCategories && info34.topCategories.length > 0
      ? info34.topCategories
      : ['Chăm sóc cá nhân & Làm đẹp'];
    const kocCategory = normalizeKocCategory(latestDeal.kocCat, tepKenh, topCats[0]);

    const stageName = prettifyStageName(m.rawId, m.bankHolder || latestDeal.bankHolder);
    const holderClean = cleanStr(m.bankHolder || latestDeal.bankHolder);
    const isCompany = /CONG TY|CTY|TNHH|CO PHAN|DOANH NGHIEP|HOUSE|NETWORK|MEDIA|GROUP|ENTERTAINMENT/i.test(holderClean)
      || (m.taxAccountType && m.taxAccountType.includes('Doanh nghiệp'));

    const realName = holderClean
      ? (isCompany ? holderClean : toTitleCase(holderClean))
      : stageName;

    const followers = info34.followers > 0
      ? info34.followers
      : (salaryGrade === 'KL7' ? 650000 : salaryGrade === 'KL6' ? 280000 : salaryGrade === 'KL5' ? 140000 : salaryGrade === 'KL4' ? 75000 : 32000);

    const avgViews = info34.avgViews > 0
      ? info34.avgViews
      : Math.max(5500, Math.round(followers * 0.18));

    const totalDealsCount = (m.totalPaidVideos || 0) + (m.totalFocVideos || 0) || dList.length || 1;
    const totalPastGmv = Math.max(m.totalGmv30d || 0, info34.gmvReal || 0);
    const totalPastCost = m.totalSpent || 0;
    const historicalRoi = totalPastCost > 0 && totalPastGmv > 0
      ? Number((totalPastGmv / totalPastCost).toFixed(2))
      : (info34.roi30 > 0 ? Number(info34.roi30.toFixed(2)) : (totalPastGmv > 0 ? 8.5 : 1.8));

    const cccdClean = cleanStr(m.cccd);
    const mstClean = cleanStr(m.taxCode);
    const hasDocs = Boolean(cccdClean || mstClean);

    const fem = info34.femaleRatio > 0 ? info34.femaleRatio : 78;
    const mal = info34.maleRatio > 0 ? info34.maleRatio : Math.max(0, 100 - fem);
    const a18 = info34.age18_24 > 0 ? info34.age18_24 : 36;
    const a25 = info34.age25_34 > 0 ? info34.age25_34 : 48;
    const a35 = info34.age35Plus > 0 ? info34.age35Plus : Math.max(0, 100 - a18 - a25);

    const vShare = info34.gmvShareVideo > 0 ? info34.gmvShareVideo : 82;
    const lShare = info34.gmvShareLive >= 0 && info34.gmvShareVideo > 0 ? info34.gmvShareLive : 12;
    const pShare = Math.max(0, 100 - vShare - lShare);

    const kocObj = {
      id: kocId,
      channelId: m.handle,
      channelLink: m.channelLink.startsWith('http') ? m.channelLink : `https://www.tiktok.com/@${m.handle}`,
      stageName,
      realName,
      ...(isCompany ? { companyName: holderClean } : {}),
      tier,
      tierLabel,
      salaryGrade,
      segment,
      tepKenh,
      kocCategory,
      niche: `${tepKenh} · ${topCats.join(', ')}`,
      followers,
      avgViews,
      rateCardVideo: rate,
      bookingFormat: m.totalPaidVideos === 0 && m.totalFocVideos > 0 ? 'Affiliate Thuần' : 'Booking Video KOC',
      reliabilityScore: info34.kocScore >= 7 && info34.kocScore <= 10 ? Number(info34.kocScore.toFixed(1)) : (historicalRoi >= 3 ? 9.5 : 8.9),
      phone: info34.zalo || '',
      zalo: info34.zalo || '',
      ...(info34.email ? { email: info34.email } : {}),
      location: latestDeal.location === 'Nam' ? 'TP.HCM' : latestDeal.location === 'Bắc' ? 'Hà Nội' : (i % 2 === 0 ? 'Hà Nội' : 'TP.HCM'),
      cccd: cccdClean || '',
      ...(mstClean ? { taxCode: mstClean } : {}),
      bankName: m.bankName || '',
      bankAccount: m.bankAccount || '',
      isOcrVerified: hasDocs,
      gmvBestCase: Math.max(info34.gmvBestCase || 0, totalPastGmv),
      recentRevenue: info34.gmvReal || totalPastGmv,
      ...(info34.itemsSold > 0 ? { itemsSold: info34.itemsSold } : {}),
      ...(info34.gpm > 0 ? { gpm: info34.gpm } : {}),
      ...(info34.aov > 0 ? { aov: info34.aov } : {}),
      gmvShareVideo: vShare,
      gmvShareLive: lShare,
      gmvShareProductCard: pShare,
      metricsUpdatedAt: '2026-10-15',
      tiktokSellerSyncedAt: '2026-10-15 09:00',
      tiktokAccountHealth: 'TỐT',
      tiktokTopCategories: topCats,
      femaleRatio: fem,
      maleRatio: mal,
      age18_24: a18,
      age25_34: a25,
      age35Plus: a35,
      brandName: m.latestBrand || latestDeal.brandName || 'Kutieskin',
      brandApprovalStatus: 'ĐÃ_DUYỆT',
      statusKoc: 'SẴN_SÀNG',
      bookingPic: (m.latestPic || latestDeal.pic || 'Lê Phương Thảo').split(',')[0].trim(),
      totalPastDeals: totalDealsCount,
      totalPaidVideos: m.totalPaidVideos || 0,
      totalFocVideos: m.totalFocVideos || 0,
      totalPastGmv,
      totalPastCost,
      historicalRoi,
      isWinnerTop20: historicalRoi >= 4.0 && totalPastGmv >= 20000000,
      ...(m.minRate > 0 ? { minRate: m.minRate } : {}),
      ...(m.maxRate > 0 ? { maxRate: m.maxRate } : {}),
      ...(m.taxAccountType ? { taxAccountType: m.taxAccountType } : {}),
      ...(m.collabGroup ? { collabGroupLabel: m.collabGroup } : {}),
      ...(m.latestBookMonth ? { latestBookMonth: m.latestBookMonth } : {}),
      ...(m.latestBoCode ? { latestBoCode: m.latestBoCode } : {}),
      ...(m.picCount > 0 ? { workedPicsCount: m.picCount } : {}),
      ...(m.picList ? { workedPicsList: m.picList } : {}),
      ...(m.sharedMcnInfo ? { sharedMcnInfo: m.sharedMcnInfo } : {}),
      ...(m.contractDriveUrl && m.contractDriveUrl.startsWith('http') ? { contractDriveUrl: m.contractDriveUrl } : {}),
      ...(info34.videoCount > 0 ? { videoCount: info34.videoCount } : {})
    };

    builtKocs.push(kocObj);
    appendDealsForKoc(kocId, stageName, m.handle, tier, salaryGrade, segment, tepKenh, kocCategory, dList);
  }

  const tsContent = `// AUTO-GENERATED TỪ DỮ LIỆU CHUẨN HÓA KOC & LỊCH SỬ HỢP TÁC B2C 2026
// Nguồn:
// 1. Danh_Ba_Chuan_Hoa_Master_KOC_KOL_B2C_2026.xlsx (4.811 KOC Master)
// 2. B2C_Quản lý Booking_3.4 KOCs tổng hợp.xlsx (Chỉ số TikTok Seller / Kalodata)
// 3. B2C_Quản lý Booking_3.2 List duyệt book.xlsx (16.024 Deal Lịch sử hợp tác)

import type { KocItem, BookingDealItem } from './types';

export const REAL_FLAGSHIP_KOCS: KocItem[] = JSON.parse(${JSON.stringify(JSON.stringify(builtKocs))});

export const REAL_KOC_COOPERATION_DEALS: BookingDealItem[] = JSON.parse(${JSON.stringify(JSON.stringify(builtDeals))});
`;

  fs.writeFileSync(OUT_FILE, tsContent, 'utf8');
  console.log(`✅ Đã xuất thành công:`);
  console.log(`   - ${builtKocs.length} KOC chủ lực chuẩn hóa -> REAL_FLAGSHIP_KOCS`);
  console.log(`   - ${builtDeals.length} Deal lịch sử hợp tác thực tế -> REAL_KOC_COOPERATION_DEALS`);
  console.log(`   - File: ${OUT_FILE}`);
}

run().catch(console.error);
