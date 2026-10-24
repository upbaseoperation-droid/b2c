'use client';

import React, { useState, useMemo } from 'react';
import {
  Calculator,
  TrendingUp,
  CalendarRange,
  Link2,
  QrCode,
  Share2,
  ShieldAlert,
  Clock,
  FileText,
  GitCompare,
  Pin,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Award,
  CalendarCheck,
  Download,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  BrandDetail,
  BookingDealItem,
  KocItem,
  StoreDifficultyTier,
  StorePortfolioItem,
  UserProfile,
} from '../../lib/types';
import {
  computeGrossFeeWithTax,
  computeTepBookingFromNetFee,
  normalizeTikTokId,
  buildTikTokChannelUrl,
  CONTENT_TAG_OPTIONS,
} from '../../lib/staffBrandListingSheet';
import { extractTikTokChannelAndVideoFromInput } from '../../lib/approvedBookingList';
import { getVietnamDateYmd } from '../../lib/format';
import {
  VIETQR_BANKS,
  TIKTOK_RESTRICTED_DICTIONARY,
  formatVnd,
  stripVietnameseTones,
  matchBankBinByName,
  parseBatchQuoteLines,
  computeSlaTimelineFromAirDate,
  computeP3SimulationRow,
  downloadTextFile,
  type ToolCategoryKey,
  type ToolId,
  type RestrictedWordRule,
  type BatchTaxRow,
  type SlaMilestoneRow,
} from '../../lib/workToolkitRules';
import {
  StatRow,
  Stat,
  Tabs,
  Panel,
  FilterBar,
  Chips,
  Button,
  Status,
  Field,
  Input,
  Select,
  Textarea,
  DataTable,
  Segmented,
  EmptyState,
  type Column,
} from '../ui';

export interface WorkToolkitHubViewProps {
  currentUser: UserProfile;
  brands: BrandDetail[];
  stores: StorePortfolioItem[];
  kocs: KocItem[];
  deals?: BookingDealItem[];
  onNotify?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

interface ToolCatalogItem {
  id: ToolId;
  title: string;
  category: Exclude<ToolCategoryKey, 'ALL' | 'PINNED'>;
  categoryLabel: string;
  badgeText: string;
  targetRoles: string;
  icon: LucideIcon;
}

const TOOL_CATALOG: ToolCatalogItem[] = [
  {
    id: 'tax-gross-net',
    title: 'Quy đổi Gross ↔ Net & Bậc KL',
    category: 'FINANCE',
    categoryLabel: 'Tài chính & Định mức',
    badgeText: 'Đơn lẻ & Hàng loạt · TNCN/VAT',
    targetRoles: 'Booking · Kế toán · Quản lý',
    icon: Calculator,
  },
  {
    id: 'roas-breakeven',
    title: 'Tính ROAS, CIR & Điểm hòa vốn',
    category: 'FINANCE',
    categoryLabel: 'Tài chính & Định mức',
    badgeText: 'GMV hòa vốn · Biên lãi',
    targetRoles: 'Growth · Media · Quản lý',
    icon: TrendingUp,
  },
  {
    id: 'kpi-splitter',
    title: 'Chia định mức KPI & Ngân sách tuần',
    category: 'FINANCE',
    categoryLabel: 'Tài chính & Định mức',
    badgeText: 'W1–W4 · Paid & FOC',
    targetRoles: 'Quản lý · Leader · Growth',
    icon: CalendarRange,
  },
  {
    id: 'bulk-link-extractor',
    title: 'Bóc tách hàng loạt Link TikTok & Shopee',
    category: 'OPERATIONS',
    categoryLabel: 'Vận hành & Link',
    badgeText: 'ID kênh · Mã video · Khớp KOC',
    targetRoles: 'Booking · Content · Media',
    icon: Link2,
  },
  {
    id: 'vietqr-generator',
    title: 'Tạo mã QR VietQR & Nội dung CK',
    category: 'OPERATIONS',
    categoryLabel: 'Vận hành & Link',
    badgeText: 'Chuẩn ĐNTT Bảng 3.2',
    targetRoles: 'Kế toán · Booking · Admin',
    icon: QrCode,
  },
  {
    id: 'utm-builder',
    title: 'Tạo Link UTM & Tracking Chiến dịch',
    category: 'OPERATIONS',
    categoryLabel: 'Vận hành & Link',
    badgeText: 'Bio · Comment · Spark Ads',
    targetRoles: 'Media · Growth · Brand PIC',
    icon: Share2,
  },
  {
    id: 'script-policy-checker',
    title: 'Kiểm tra từ hạn chế TikTok Shop',
    category: 'CONTENT',
    categoryLabel: 'Nội dung & Đối soát',
    badgeText: '6 nhóm rủi ro · Gợi ý sửa',
    targetRoles: 'Content · Booking · Leader',
    icon: ShieldAlert,
  },
  {
    id: 'voiceover-timer',
    title: 'Đếm chữ & Thời lượng đọc kịch bản',
    category: 'CONTENT',
    categoryLabel: 'Nội dung & Đối soát',
    badgeText: '15s · 30s · 60s · Tách nhịp',
    targetRoles: 'Content · CTV · Booking',
    icon: Clock,
  },
  {
    id: 'brief-hashtag-builder',
    title: 'Soạn khung Brief & Hashtag chuẩn Brand',
    category: 'CONTENT',
    categoryLabel: 'Nội dung & Đối soát',
    badgeText: 'Zalo/Lark Brief · #Hashtag',
    targetRoles: 'Brand PIC · Content · Booking',
    icon: FileText,
  },
  {
    id: 'list-diff-checker',
    title: 'Đối soát 2 danh sách Mã KOC / Mã BO',
    category: 'CONTENT',
    categoryLabel: 'Nội dung & Đối soát',
    badgeText: 'Tìm dòng thiếu · Trùng lặp',
    targetRoles: 'Kế toán · Quản lý · Booking',
    icon: GitCompare,
  },
  {
    id: 'p3-workload-calc',
    title: 'Tính điểm Tải công việc & Thưởng P3',
    category: 'MANAGEMENT',
    categoryLabel: 'Quản trị & SLA',
    badgeText: 'Hệ số Gian 0.80–1.50 · P3',
    targetRoles: 'Quản lý · Leader · Nhân sự',
    icon: Award,
  },
  {
    id: 'sla-timeline-calc',
    title: 'Tra cứu Mốc hạn SLA từ Ngày Air',
    category: 'MANAGEMENT',
    categoryLabel: 'Quản trị & SLA',
    badgeText: 'T-7 → T+7 · Khóa sổ mùng 02',
    targetRoles: 'Booking · Kế toán · Leader',
    icon: CalendarCheck,
  },
];

const PINNED_TOOLS_STORAGE_KEY = 'upbase_b2c_pinned_work_tools_v1';
const DEFAULT_PINNED_TOOLS: ToolId[] = [
  'tax-gross-net',
  'bulk-link-extractor',
  'script-policy-checker',
  'vietqr-generator',
];

export const WorkToolkitHubView: React.FC<WorkToolkitHubViewProps> = ({
  brands,
  stores,
  kocs,
  onNotify,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ToolCategoryKey>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeToolId, setActiveToolId] = useState<ToolId>('tax-gross-net');
  const [pinnedIds, setPinnedIds] = useState<ToolId[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_PINNED_TOOLS;
    try {
      const saved = window.localStorage.getItem(PINNED_TOOLS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ToolId[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_PINNED_TOOLS;
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const togglePinTool = (id: ToolId, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPinnedIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem(PINNED_TOOLS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleCopyText = (text: string, label: string, keyId: string) => {
    if (!text.trim()) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    onNotify?.(`Đã sao chép: ${label}`, 'success');
    setTimeout(() => {
      setCopiedKey((prev) => (prev === keyId ? null : prev));
    }, 1800);
  };

  // =========================================================================
  // 1. STATE: QUY ĐỔI GROSS ↔ NET & BẬC KL
  // =========================================================================
  const [calcDirection, setCalcDirection] = useState<'NET_TO_GROSS' | 'GROSS_TO_NET'>('NET_TO_GROSS');
  const [taxScheme, setTaxScheme] = useState<'PIT_10' | 'VAT_8' | 'VAT_10' | 'FOC_0'>('PIT_10');
  const [feeInputAmount, setFeeInputAmount] = useState<string>('2500000');
  const [videoQty, setVideoQty] = useState<string>('1');
  const [advancePct, setAdvancePct] = useState<string>('0');

  const taxCalculation = useMemo(() => {
    const rawAmount = Math.max(0, Number(feeInputAmount.replace(/[^0-9]/g, '')) || 0);
    const qty = Math.max(1, Math.min(200, Number(videoQty) || 1));
    const advRate = Math.max(0, Math.min(100, Number(advancePct) || 0)) / 100;

    let unitNet = 0;
    let unitGross = 0;
    let unitTax = 0;

    if (taxScheme === 'FOC_0') {
      unitNet = 0;
      unitGross = 0;
      unitTax = 0;
    } else if (taxScheme === 'PIT_10') {
      if (calcDirection === 'NET_TO_GROSS') {
        unitNet = rawAmount;
        unitGross = computeGrossFeeWithTax(rawAmount);
        unitTax = unitGross - unitNet;
      } else {
        unitGross = rawAmount;
        unitNet = Math.round(rawAmount * 0.9);
        unitTax = unitGross - unitNet;
      }
    } else {
      const vatRate = taxScheme === 'VAT_8' ? 0.08 : 0.1;
      if (calcDirection === 'NET_TO_GROSS') {
        unitNet = rawAmount;
        unitTax = Math.round(unitNet * vatRate);
        unitGross = unitNet + unitTax;
      } else {
        unitGross = rawAmount;
        unitNet = Math.round(unitGross / (1 + vatRate));
        unitTax = unitGross - unitNet;
      }
    }

    const totalNet = unitNet * qty;
    const totalGross = unitGross * qty;
    const totalTax = unitTax * qty;
    const advanceAmount = Math.round(totalNet * advRate);
    const remainingNet = totalNet - advanceAmount;
    const klGrade = computeTepBookingFromNetFee(unitNet);

    return {
      unitNet,
      unitGross,
      unitTax,
      qty,
      totalNet,
      totalGross,
      totalTax,
      advanceAmount,
      remainingNet,
      klGrade,
    };
  }, [feeInputAmount, videoQty, advancePct, calcDirection, taxScheme]);

  // =========================================================================
  // 2. STATE: TÍNH ROAS, CIR & ĐIỂM HÒA VỐN
  // =========================================================================
  const [roasStoreName, setRoasStoreName] = useState<string>(stores[0]?.storeName || '');
  const [roasBookingNet, setRoasBookingNet] = useState<string>('5000000');
  const [roasAdsSpend, setRoasAdsSpend] = useState<string>('3000000');
  const [roasSampleCost, setRoasSampleCost] = useState<string>('450000');
  const [roasAov, setRoasAov] = useState<string>('320000');
  const [roasGrossMarginPct, setRoasGrossMarginPct] = useState<string>('55');
  const [roasPlatformFeePct, setRoasPlatformFeePct] = useState<string>('12');
  const [roasAffiliatePct, setRoasAffiliatePct] = useState<string>('8');
  const [roasTargetGmv, setRoasTargetGmv] = useState<string>('35000000');

  const roasMetrics = useMemo(() => {
    const bookingNet = Math.max(0, Number(roasBookingNet) || 0);
    const bookingGross = computeGrossFeeWithTax(bookingNet);
    const adsSpend = Math.max(0, Number(roasAdsSpend) || 0);
    const sampleCost = Math.max(0, Number(roasSampleCost) || 0);
    const totalFixedCost = bookingGross + adsSpend + sampleCost;

    const aov = Math.max(1000, Number(roasAov) || 1000);
    const grossMargin = Math.max(1, Math.min(99, Number(roasGrossMarginPct) || 55)) / 100;
    const platformFee = Math.max(0, Math.min(50, Number(roasPlatformFeePct) || 12)) / 100;
    const affiliateFee = Math.max(0, Math.min(50, Number(roasAffiliatePct) || 8)) / 100;

    const contributionMarginRatio = Math.max(0.01, grossMargin - platformFee - affiliateFee);
    const breakEvenGmv = Math.round(totalFixedCost / contributionMarginRatio);
    const breakEvenOrders = Math.ceil(breakEvenGmv / aov);
    const breakEvenRoas = totalFixedCost > 0 ? breakEvenGmv / totalFixedCost : 0;

    const expectedGmv = Math.max(0, Number(roasTargetGmv) || 0);
    const expectedOrders = Math.floor(expectedGmv / aov);
    const expectedRoas = totalFixedCost > 0 ? expectedGmv / totalFixedCost : 0;
    const cirNetPct = expectedGmv > 0 ? ((bookingNet + adsSpend) / expectedGmv) * 100 : 0;
    const cirGrossPct = expectedGmv > 0 ? (totalFixedCost / expectedGmv) * 100 : 0;
    const estimatedProfit = Math.round(expectedGmv * contributionMarginRatio - totalFixedCost);

    return {
      bookingNet,
      bookingGross,
      adsSpend,
      sampleCost,
      totalFixedCost,
      contributionMarginPct: contributionMarginRatio * 100,
      breakEvenGmv,
      breakEvenOrders,
      breakEvenRoas,
      expectedGmv,
      expectedOrders,
      expectedRoas,
      cirNetPct,
      cirGrossPct,
      estimatedProfit,
    };
  }, [
    roasBookingNet,
    roasAdsSpend,
    roasSampleCost,
    roasAov,
    roasGrossMarginPct,
    roasPlatformFeePct,
    roasAffiliatePct,
    roasTargetGmv,
  ]);

  // =========================================================================
  // 3. STATE: CHIA ĐỊNH MỨC KPI & NGÂN SÁCH TUẦN (W1-W4)
  // =========================================================================
  const [kpiMonthlyBudgetNet, setKpiMonthlyBudgetNet] = useState<string>('60000000');
  const [kpiPaidVideos, setKpiPaidVideos] = useState<string>('24');
  const [kpiFocVideos, setKpiFocVideos] = useState<string>('16');
  const [kpiStaffCount, setKpiStaffCount] = useState<string>('1');
  const [kpiWeightPreset, setKpiWeightPreset] = useState<'EVEN' | 'DOUBLE_DAY_W1' | 'MEGA_MID_MONTH' | 'PAYDAY_END'>('DOUBLE_DAY_W1');

  const kpiWeeklyRows = useMemo(() => {
    const budgetNet = Math.max(0, Number(kpiMonthlyBudgetNet) || 0);
    const paidTotal = Math.max(0, Number(kpiPaidVideos) || 0);
    const focTotal = Math.max(0, Number(kpiFocVideos) || 0);
    const staffCount = Math.max(1, Number(kpiStaffCount) || 1);

    const weightsMap: Record<typeof kpiWeightPreset, [number, number, number, number]> = {
      EVEN: [0.25, 0.25, 0.25, 0.25],
      DOUBLE_DAY_W1: [0.35, 0.25, 0.2, 0.2],
      MEGA_MID_MONTH: [0.2, 0.35, 0.25, 0.2],
      PAYDAY_END: [0.2, 0.2, 0.25, 0.35],
    };
    const weights = weightsMap[kpiWeightPreset];
    const weekLabels = [
      'Tuần 1 (W1 · Mở sóng / Double Day)',
      'Tuần 2 (W2 · Duy trì / Mid-month)',
      'Tuần 3 (W3 · Đẩy sản phẩm chủ lực)',
      'Tuần 4 (W4 · Về đích / Payday)',
    ];

    return weights.map((w, idx) => {
      const weekNet = Math.round(budgetNet * w);
      const weekGross = computeGrossFeeWithTax(weekNet);
      const weekPaid = Math.round(paidTotal * w);
      const weekFoc = Math.round(focTotal * w);
      const weekTotalVideos = weekPaid + weekFoc;
      const perStaffVideos = Number((weekTotalVideos / staffCount).toFixed(1));
      return {
        id: `W${idx + 1}`,
        weekLabel: weekLabels[idx],
        weightPct: Math.round(w * 100),
        weekNet,
        weekGross,
        weekPaid,
        weekFoc,
        weekTotalVideos,
        perStaffVideos,
      };
    });
  }, [kpiMonthlyBudgetNet, kpiPaidVideos, kpiFocVideos, kpiStaffCount, kpiWeightPreset]);

  // =========================================================================
  // 4. STATE: BÓC TÁCH HÀNG LOẠT LINK TIKTOK & SHOPEE
  // =========================================================================
  const [rawLinksInput, setRawLinksInput] = useState<string>(
    () => [
      'https://www.tiktok.com/@goc.cua.ru/video/7421889123456789012',
      'https://www.tiktok.com/@review.mypham.chinhhang',
      'https://vn.shp.ee/8abc123',
    ].join('\n')
  );

  const kocLookupByHandle = useMemo(() => {
    const map = new Map<string, KocItem>();
    for (const k of kocs) {
      const h1 = normalizeTikTokId(k.channelId || '');
      const h2 = normalizeTikTokId(k.tiktokChannel || '');
      if (h1) map.set(h1.toLowerCase(), k);
      if (h2) map.set(h2.toLowerCase(), k);
    }
    return map;
  }, [kocs]);

  const extractedLinkRows = useMemo(() => {
    const lines = rawLinksInput
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    return lines.map((line, index) => {
      const urlMatch = line.match(/https?:\/\/[^\s,;]+/i);
      const cleanInput = urlMatch ? urlMatch[0] : line;
      const lower = cleanInput.toLowerCase();

      if (lower.includes('shopee.vn') || lower.includes('shp.ee')) {
        const itemMatch = cleanInput.match(/i\.(\d+)\.(\d+)/i) || cleanInput.match(/product\/(\d+)\/(\d+)/i);
        return {
          id: `row-${index + 1}`,
          index: index + 1,
          platform: 'Shopee',
          channelId: itemMatch ? `shop_${itemMatch[1]}` : '—',
          channelUrl: cleanInput,
          videoOrItemId: itemMatch ? itemMatch[2] : 'Link rút gọn Shopee',
          originalUrl: cleanInput,
          matchedKocName: '—',
          matchedKlGrade: '—',
          matchedRateNet: 0,
        };
      }

      const parsed = extractTikTokChannelAndVideoFromInput(cleanInput);
      const handle = parsed.channelHandle || normalizeTikTokId(cleanInput);
      const matchedKoc = handle ? kocLookupByHandle.get(handle.toLowerCase()) : undefined;
      const rateNet = Number(matchedKoc?.rateCardVideo ?? 0);

      return {
        id: `row-${index + 1}`,
        index: index + 1,
        platform: 'TikTok',
        channelId: handle || '—',
        channelUrl: handle ? buildTikTokChannelUrl(handle) : '—',
        videoOrItemId: parsed.videoId || '—',
        originalUrl: cleanInput,
        matchedKocName: matchedKoc?.stageName || 'Chưa có trong Danh bạ',
        matchedKlGrade: matchedKoc ? computeTepBookingFromNetFee(rateNet) : '—',
        matchedRateNet: rateNet,
      };
    });
  }, [rawLinksInput, kocLookupByHandle]);

  // =========================================================================
  // 5. STATE: TẠO MÃ QR VIETQR & NỘI DUNG CHUYỂN KHOẢN CHUẨN
  // =========================================================================
  const [qrSelectedKocId, setQrSelectedKocId] = useState<string>('');
  const [qrBankBin, setQrBankBin] = useState<string>('970436');
  const [qrAccountNo, setQrAccountNo] = useState<string>('0011004123456');
  const [qrAccountName, setQrAccountName] = useState<string>('NGUYEN THI MINH ANH');
  const [qrAmountNet, setQrAmountNet] = useState<string>('2500000');
  const [qrBookingCode, setQrBookingCode] = useState<string>('BO2610018');
  const [qrBrandName, setQrBrandName] = useState<string>(brands[0]?.name || 'ClubClio');
  const [qrPaymentType, setQrPaymentType] = useState<'THANH_TOAN' | 'TAM_UNG' | 'TAT_TOAN'>('THANH_TOAN');

  const handleSelectKocForQr = (kocId: string) => {
    setQrSelectedKocId(kocId);
    const found = kocs.find((k) => k.id === kocId);
    if (!found) return;
    if (found.bankAccount) setQrAccountNo(found.bankAccount);
    if (found.realName || found.stageName) {
      setQrAccountName(stripVietnameseTones(found.realName || found.stageName).toUpperCase());
    }
    if (found.rateCardVideo) setQrAmountNet(String(found.rateCardVideo));
    if (found.bankName) {
      setQrBankBin(matchBankBinByName(found.bankName));
    }
  };

  const qrTransferNote = useMemo(() => {
    const prefix =
      qrPaymentType === 'TAM_UNG' ? 'TU' : qrPaymentType === 'TAT_TOAN' ? 'TT CUOI' : 'TT';
    const cleanBrand = stripVietnameseTones(qrBrandName).toUpperCase().slice(0, 14);
    const cleanBo = stripVietnameseTones(qrBookingCode).toUpperCase();
    const cleanHolder = stripVietnameseTones(qrAccountName).toUpperCase().slice(0, 18);
    return `UPBASE ${prefix} ${cleanBo} ${cleanBrand} ${cleanHolder}`.replace(/\s+/g, ' ').trim();
  }, [qrPaymentType, qrBrandName, qrBookingCode, qrAccountName]);

  const vietQrImageUrl = useMemo(() => {
    const cleanAcc = qrAccountNo.replace(/\s+/g, '');
    const amt = Math.max(0, Number(qrAmountNet) || 0);
    if (!cleanAcc || !qrBankBin) return '';
    const params = new URLSearchParams({
      amount: String(amt),
      addInfo: qrTransferNote,
      accountName: stripVietnameseTones(qrAccountName).toUpperCase(),
    });
    return `https://img.vietqr.io/image/${qrBankBin}-${cleanAcc}-compact2.png?${params.toString()}`;
  }, [qrBankBin, qrAccountNo, qrAmountNet, qrTransferNote, qrAccountName]);

  // =========================================================================
  // 6. STATE: TẠO LINK UTM & TRACKING CHIẾN DỊCH
  // =========================================================================
  const [utmBaseUrl, setUtmBaseUrl] = useState<string>('https://shopee.vn/clubclio.official');
  const [utmSource, setUtmSource] = useState<string>('tiktok');
  const [utmMedium, setUtmMedium] = useState<string>('koc_booking');
  const [utmCampaign, setUtmCampaign] = useState<string>('202610_clubclio_mega');
  const [utmContentHandles, setUtmContentHandles] = useState<string>('goc.cua.ru\nreview.mypham.chinhhang\nbeauty.daily.vn');

  const generatedUtmLinks = useMemo(() => {
    const base = utmBaseUrl.trim() || 'https://shopee.vn';
    const handles = utmContentHandles
      .split(/\r?\n/)
      .map((h) => normalizeTikTokId(h))
      .filter(Boolean);

    const list = handles.length > 0 ? handles : ['general'];
    return list.map((handle, idx) => {
      const separator = base.includes('?') ? '&' : '?';
      const query = new URLSearchParams({
        utm_source: stripVietnameseTones(utmSource).toLowerCase().replace(/\s+/g, '_'),
        utm_medium: stripVietnameseTones(utmMedium).toLowerCase().replace(/\s+/g, '_'),
        utm_campaign: stripVietnameseTones(utmCampaign).toLowerCase().replace(/\s+/g, '_'),
        utm_content: stripVietnameseTones(handle).toLowerCase().replace(/\s+/g, '_'),
      }).toString();
      return {
        id: `utm-${idx + 1}`,
        handle,
        fullUrl: `${base}${separator}${query}`,
      };
    });
  }, [utmBaseUrl, utmSource, utmMedium, utmCampaign, utmContentHandles]);

  // =========================================================================
  // 7. STATE: KIỂM TRA TỪ HẠN CHẾ TIKTOK SHOP
  // =========================================================================
  const [scriptTextToScan, setScriptTextToScan] = useState<string>(
    'Em này cam kết 100% trị dứt điểm mụn viêm và thâm sạm tức thì chỉ sau 3 ngày! Hàng bác sĩ khuyên dùng số 1 thị trường, ai muốn mua giá rẻ nhất thì nhắn Zalo hoặc qua Shopee nha.'
  );

  const scriptScanMatches = useMemo(() => {
    const lowerText = scriptTextToScan.toLowerCase();
    const matches: Array<RestrictedWordRule & { count: number }> = [];

    for (const rule of TIKTOK_RESTRICTED_DICTIONARY) {
      const escaped = rule.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'gi');
      const found = lowerText.match(regex);
      if (found && found.length > 0) {
        matches.push({
          ...rule,
          count: found.length,
        });
      }
    }
    return matches;
  }, [scriptTextToScan]);

  const handleAutoReplaceRestrictedWords = () => {
    let nextText = scriptTextToScan;
    for (const m of scriptScanMatches) {
      const escaped = m.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'gi');
      const firstSuggestion = m.suggestion.split('/')[0].trim();
      nextText = nextText.replace(regex, firstSuggestion);
    }
    setScriptTextToScan(nextText);
    onNotify?.(`Đã thay thế ${scriptScanMatches.length} cụm từ hạn chế bằng từ ngữ an toàn`, 'success');
  };

  // =========================================================================
  // 8. STATE: ĐẾM CHỮ & THỜI LƯỢNG ĐỌC KỊCH BẢN VOICEOVER
  // =========================================================================
  const [voiceoverScript, setVoiceoverScript] = useState<string>(
    '3 giây đầu: Da dầu mụn ẩn dùng gì để vừa kiềm dầu vừa không bị bí da?\nThân bài: Đây là lọ tinh chất rau má mình đã dùng hết 2 lọ trong tháng qua. Kết cấu thấm nhanh, hỗ trợ làm dịu vùng da mẩn đỏ sau khi nặn mụn và cấp ẩm vừa đủ dưới lớp kem chống nắng.\nCTA: Mình có gắn giỏ hàng góc trái màn hình kèm ưu đãi tặng kèm bông tẩy trang, mọi người bấm vào tham khảo nha!'
  );
  const [targetVideoDurationSec, setTargetVideoDurationSec] = useState<'15' | '30' | '45' | '60' | '90'>('30');
  const [speakingSpeedWpm, setSpeakingSpeedWpm] = useState<'130' | '155' | '185'>('155');

  const voiceoverStats = useMemo(() => {
    const trimmed = voiceoverScript.trim();
    const words = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
    const wordCount = words.length;
    const charCount = trimmed.length;
    const lines = trimmed ? trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0) : [];
    const wpm = Number(speakingSpeedWpm) || 155;
    const targetSec = Number(targetVideoDurationSec) || 30;
    const estimatedSec = Math.round((wordCount / wpm) * 60);
    const recommendedMinWords = Math.round((targetSec * 0.85 * wpm) / 60);
    const recommendedMaxWords = Math.round((targetSec * 1.1 * wpm) / 60);

    const hookWordsTarget = Math.round((3.5 * wpm) / 60);
    const ctaWordsTarget = Math.round((4 * wpm) / 60);

    return {
      wordCount,
      charCount,
      lineCount: lines.length,
      estimatedSec,
      targetSec,
      recommendedMinWords,
      recommendedMaxWords,
      hookWordsTarget,
      ctaWordsTarget,
      diffSec: estimatedSec - targetSec,
    };
  }, [voiceoverScript, targetVideoDurationSec, speakingSpeedWpm]);

  // =========================================================================
  // 9. STATE: SOẠN KHUNG BRIEF & BỘ HASHTAG CHUẨN BRAND
  // =========================================================================
  const [briefBrandName, setBriefBrandName] = useState<string>(brands[0]?.name || 'ClubClio');
  const [briefHeroProduct, setBriefHeroProduct] = useState<string>('Phấn nước Kill Cover Mesh Glow Cushion');
  const [briefContentPillar, setBriefContentPillar] = useState<string>(CONTENT_TAG_OPTIONS[0] || 'Review trực tiếp');
  const [briefKeyUsp, setBriefKeyUsp] = useState<string>(
    'Độ che phủ mịn lì 54h, kiềm dầu tốt nhưng không mốc nền, có chống nắng SPF50+ PA++++'
  );
  const [briefMandatoryDo, setBriefMandatoryDo] = useState<string>(
    'Quay rõ cận cảnh chất phấn trên da thật 3 giây đầu, gắn giỏ hàng sản phẩm chính hãng, giữ video tối thiểu 30 ngày & cấp mã Spark Ads 60 ngày'
  );
  const [briefMandatoryDont, setBriefMandatoryDont] = useState<string>(
    'Không nhắc tên thương hiệu đối thủ, không cam kết điều trị y khoa, không điều hướng sang sàn khác'
  );

  const generatedBriefOutput = useMemo(() => {
    const cleanBrandSlug = stripVietnameseTones(briefBrandName).replace(/\s+/g, '');
    const cleanProductSlug = stripVietnameseTones(briefHeroProduct)
      .split(/\s+/)
      .slice(0, 4)
      .join('');

    const hashtags = [
      `#${cleanBrandSlug}`,
      `#${cleanBrandSlug}Vietnam`,
      cleanProductSlug ? `#${cleanProductSlug}` : '',
      '#TikTokShopVietnam',
      '#ReviewLamDep',
      '#GocLamDep',
    ]
      .filter(Boolean)
      .join(' ');

    const briefText = [
      `[BRIEF HỢP TÁC VIDEO KOC — ${briefBrandName.toUpperCase()}]`,
      `1. Sản phẩm trọng tâm: ${briefHeroProduct}`,
      `2. Góc nội dung (Pillar): ${briefContentPillar}`,
      `3. Điểm nhấn sản phẩm (USP): ${briefKeyUsp}`,
      `4. Yêu cầu bắt buộc (DOs): ${briefMandatoryDo}`,
      `5. Lưu ý tránh vi phạm (DONTs): ${briefMandatoryDont}`,
      `6. Bộ Hashtag gắn bài: ${hashtags}`,
    ].join('\n');

    return { hashtags, briefText };
  }, [
    briefBrandName,
    briefHeroProduct,
    briefContentPillar,
    briefKeyUsp,
    briefMandatoryDo,
    briefMandatoryDont,
  ]);

  // =========================================================================
  // 10. STATE: ĐỐI SOÁT 2 DANH SÁCH MÃ KOC / MÃ BO
  // =========================================================================
  const [listAText, setListAText] = useState<string>('BO2610001\nBO2610002\nBO2610003\nBO2610005\nBO2610002');
  const [listBText, setListBText] = useState<string>('BO2610001\nBO2610003\nBO2610004\nBO2610006');

  const listComparison = useMemo(() => {
    const normalizeToken = (s: string) => s.trim().replace(/^@/, '');
    const rawA = listAText.split(/[\r\n,;]+/).map(normalizeToken).filter(Boolean);
    const rawB = listBText.split(/[\r\n,;]+/).map(normalizeToken).filter(Boolean);

    const mapLowerA = new Map<string, string>();
    const duplicatesInA = new Set<string>();
    for (const item of rawA) {
      const k = item.toLowerCase();
      if (mapLowerA.has(k)) duplicatesInA.add(item);
      else mapLowerA.set(k, item);
    }

    const mapLowerB = new Map<string, string>();
    const duplicatesInB = new Set<string>();
    for (const item of rawB) {
      const k = item.toLowerCase();
      if (mapLowerB.has(k)) duplicatesInB.add(item);
      else mapLowerB.set(k, item);
    }

    const inBoth: string[] = [];
    const onlyInA: string[] = [];
    const onlyInB: string[] = [];

    for (const [k, val] of mapLowerA.entries()) {
      if (mapLowerB.has(k)) inBoth.push(val);
      else onlyInA.push(val);
    }
    for (const [k, val] of mapLowerB.entries()) {
      if (!mapLowerA.has(k)) onlyInB.push(val);
    }

    return {
      totalRawA: rawA.length,
      totalRawB: rawB.length,
      uniqueA: mapLowerA.size,
      uniqueB: mapLowerB.size,
      inBoth,
      onlyInA,
      onlyInB,
      duplicatesInA: Array.from(duplicatesInA),
      duplicatesInB: Array.from(duplicatesInB),
    };
  }, [listAText, listBText]);

  // =========================================================================
  // 11. STATE: BÁO GIÁ HÀNG LOẠT & TÍNH ĐIỂM P3 / MỐC SLA
  // =========================================================================
  const [batchQuoteInput, setBatchQuoteInput] = useState<string>(
    'goc.cua.ru\t2500000\t1\nreview.mypham.chinhhang\t4500000\t2'
  );
  const batchTaxRows = useMemo(
    () => parseBatchQuoteLines(batchQuoteInput, taxScheme, kocLookupByHandle),
    [batchQuoteInput, taxScheme, kocLookupByHandle]
  );

  const [p3SelectedStoreId, setP3SelectedStoreId] = useState<string>(stores[0]?.id || '');
  const [p3CompletedCases, setP3CompletedCases] = useState<string>('32');
  const [p3QualityMultiplier, setP3QualityMultiplier] = useState<string>('1.1');
  const [p3SlaMultiplier, setP3SlaMultiplier] = useState<string>('1.0');
  const [p3UnitRateVnd, setP3UnitRateVnd] = useState<string>('120000');

  const p3Simulation = useMemo(() => {
    const selectedStore = stores.find((s) => s.id === p3SelectedStoreId) || stores[0];
    const tier: StoreDifficultyTier = selectedStore?.difficultyTier || 'Tiêu chuẩn';
    return computeP3SimulationRow({
      id: selectedStore?.id || 'sim-1',
      storeName: selectedStore?.storeName || 'Gian hàng B2C',
      brandName: selectedStore?.brandName || 'Thương hiệu',
      picName: selectedStore?.b2cOwnerName || 'Chuyên viên B2C',
      difficultyTier: tier,
      completedCases: Math.max(0, Number(p3CompletedCases) || 0),
      qualityMultiplier: Math.max(0.5, Number(p3QualityMultiplier) || 1),
      slaMultiplier: Math.max(0.5, Number(p3SlaMultiplier) || 1),
      unitRateVnd: Math.max(0, Number(p3UnitRateVnd) || 0),
    });
  }, [stores, p3SelectedStoreId, p3CompletedCases, p3QualityMultiplier, p3SlaMultiplier, p3UnitRateVnd]);

  const [slaAirDateIso, setSlaAirDateIso] = useState<string>(() => getVietnamDateYmd());
  const [slaHasSampleOnHand, setSlaHasSampleOnHand] = useState<'NO' | 'YES'>('NO');
  const [slaDealFeeNet, setSlaDealFeeNet] = useState<string>('2500000');

  const slaTimelineRows = useMemo(
    () =>
      computeSlaTimelineFromAirDate(
        slaAirDateIso,
        slaHasSampleOnHand === 'YES',
        Math.max(0, Number(slaDealFeeNet) || 0)
      ),
    [slaAirDateIso, slaHasSampleOnHand, slaDealFeeNet]
  );

  // =========================================================================
  // FILTERED TOOL CARDS
  // =========================================================================
  const filteredTools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return TOOL_CATALOG.filter((tool) => {
      if (selectedCategory === 'PINNED' && !pinnedIds.includes(tool.id)) return false;
      if (
        selectedCategory !== 'ALL' &&
        selectedCategory !== 'PINNED' &&
        tool.category !== selectedCategory
      ) {
        return false;
      }
      if (!q) return true;
      return (
        tool.title.toLowerCase().includes(q) ||
        tool.badgeText.toLowerCase().includes(q) ||
        tool.targetRoles.toLowerCase().includes(q) ||
        tool.categoryLabel.toLowerCase().includes(q)
      );
    }).sort((a, b) => {
      const aPin = pinnedIds.includes(a.id) ? 1 : 0;
      const bPin = pinnedIds.includes(b.id) ? 1 : 0;
      return bPin - aPin;
    });
  }, [selectedCategory, searchQuery, pinnedIds]);

  const activeTool = useMemo(
    () => TOOL_CATALOG.find((t) => t.id === activeToolId) || TOOL_CATALOG[0],
    [activeToolId]
  );

  const linkExtractorColumns: Column<(typeof extractedLinkRows)[number]>[] = [
    {
      key: 'index',
      header: '#',
      width: 44,
      render: (r) => <span className="tabular-nums text-ink-3">{r.index}</span>,
    },
    {
      key: 'platform',
      header: 'Nền tảng',
      width: 85,
      render: (r) => (
        <Status tone={r.platform === 'TikTok' ? 'info' : 'warning'}>{r.platform}</Status>
      ),
    },
    {
      key: 'channelId',
      header: 'ID Kênh (@handle)',
      width: 155,
      render: (r) => <span className="font-medium text-ink">{r.channelId}</span>,
    },
    {
      key: 'videoOrItemId',
      header: 'Mã Video / Sản phẩm',
      width: 175,
      render: (r) => <span className="font-mono text-xs text-ink-2">{r.videoOrItemId}</span>,
    },
    {
      key: 'matchedKoc',
      header: 'Đối chiếu Danh bạ KOC',
      width: 190,
      render: (r) =>
        r.matchedRateNet > 0 || r.matchedKocName !== 'Chưa có trong Danh bạ' ? (
          <div className="flex flex-col">
            <span className="font-medium text-ink">{r.matchedKocName}</span>
            {r.matchedKlGrade !== '—' && (
              <span className="text-2xs text-ink-3">
                {r.matchedKlGrade} · {formatVnd(r.matchedRateNet)}
              </span>
            )}
          </div>
        ) : (
          <span className="text-ink-3">{r.matchedKocName}</span>
        ),
    },
    {
      key: 'channelUrl',
      header: 'Link kênh chuẩn',
      width: 210,
      render: (r) =>
        r.channelUrl !== '—' ? (
          <a
            href={r.channelUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-accent hover:underline truncate max-w-[200px]"
          >
            <span className="truncate">{r.channelUrl}</span>
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        ) : (
          <span className="text-ink-3">—</span>
        ),
    },
  ];

  const kpiColumns: Column<(typeof kpiWeeklyRows)[number]>[] = [
    {
      key: 'weekLabel',
      header: 'Tuần thực thi',
      width: 210,
      render: (r) => <span className="font-medium text-ink">{r.weekLabel}</span>,
    },
    {
      key: 'weightPct',
      header: 'Tỷ trọng',
      align: 'right',
      width: 85,
      render: (r) => <span className="tabular-nums font-medium">{r.weightPct}%</span>,
    },
    {
      key: 'weekNet',
      header: 'Hạn mức Order Net',
      align: 'right',
      width: 140,
      render: (r) => <span className="tabular-nums font-semibold text-ink">{formatVnd(r.weekNet)}</span>,
    },
    {
      key: 'weekGross',
      header: 'Hạn mức Gross (kèm thuế)',
      align: 'right',
      width: 155,
      render: (r) => <span className="tabular-nums text-ink-2">{formatVnd(r.weekGross)}</span>,
    },
    {
      key: 'videos',
      header: 'Số lượng Video (Paid / FOC)',
      align: 'right',
      width: 165,
      render: (r) => (
        <span className="tabular-nums">
          <strong>{r.weekTotalVideos}</strong> video ({r.weekPaid} Paid · {r.weekFoc} FOC)
        </span>
      ),
    },
    {
      key: 'perStaff',
      header: 'Định mức / PIC',
      align: 'right',
      width: 115,
      render: (r) => <span className="tabular-nums text-accent font-medium">{r.perStaffVideos} video/tuần</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <StatRow size="sm">
        <Stat
          label="Tổng công cụ nghiệp vụ"
          value={TOOL_CATALOG.length}
          note="Tài chính · Vận hành · Nội dung"
          icon={Calculator}
        />
        <Stat
          label="Công cụ đã ghim ưu tiên"
          value={pinnedIds.length}
          note="Lưu tự động trên trình duyệt"
          tone="positive"
          icon={Pin}
        />
        <Stat
          label="Danh bạ KOC kết nối"
          value={kocs.length.toLocaleString('vi-VN')}
          note="Đối chiếu nhanh ID kênh & Ngân hàng"
          icon={Link2}
        />
        <Stat
          label="Từ ngữ hạn chế TikTok Shop"
          value={TIKTOK_RESTRICTED_DICTIONARY.length}
          note="Quét 5 nhóm rủi ro vi phạm"
          tone="warning"
          icon={ShieldAlert}
        />
      </StatRow>

      <Tabs
        items={[
          { key: 'ALL' as ToolCategoryKey, label: 'Tất cả công cụ', count: TOOL_CATALOG.length },
          { key: 'PINNED' as ToolCategoryKey, label: 'Đã ghim', count: pinnedIds.length },
          {
            key: 'FINANCE' as ToolCategoryKey,
            label: 'Tài chính & Định mức',
            count: TOOL_CATALOG.filter((t) => t.category === 'FINANCE').length,
          },
          {
            key: 'OPERATIONS' as ToolCategoryKey,
            label: 'Vận hành & Link',
            count: TOOL_CATALOG.filter((t) => t.category === 'OPERATIONS').length,
          },
          {
            key: 'CONTENT' as ToolCategoryKey,
            label: 'Nội dung & Đối soát',
            count: TOOL_CATALOG.filter((t) => t.category === 'CONTENT').length,
          },
          {
            key: 'MANAGEMENT' as ToolCategoryKey,
            label: 'Quản trị & SLA',
            count: TOOL_CATALOG.filter((t) => t.category === 'MANAGEMENT').length,
          },
        ]}
        value={selectedCategory}
        onChange={setSelectedCategory}
      />

      <FilterBar
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: 'Tìm công cụ theo tên, nghiệp vụ (thuế, ROAS, QR, link, từ cấm, kịch bản)...',
        }}
        resultCount={filteredTools.length}
      />

      {/* BENTO GRID KHO CÔNG CỤ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
        {filteredTools.map((tool) => {
          const Icon = tool.icon;
          const isSelected = tool.id === activeTool.id;
          const isPinned = pinnedIds.includes(tool.id);
          return (
            <div
              key={tool.id}
              role="button"
              tabIndex={0}
              onClick={() => setActiveToolId(tool.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveToolId(tool.id);
                }
              }}
              className={`group relative rounded-xl border p-3.5 text-left transition-colors cursor-pointer flex flex-col justify-between gap-2.5 ${
                isSelected
                  ? 'bg-accent-soft/45 border-accent shadow-xs'
                  : 'bg-surface border-line hover:border-line-strong hover:bg-canvas/60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className={`h-8 w-8 rounded-lg inline-flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-accent text-white' : 'bg-sunken text-ink-2'
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                </div>
                <button
                  type="button"
                  onClick={(e) => togglePinTool(tool.id, e)}
                  title={isPinned ? 'Bỏ ghim công cụ' : 'Ghim công cụ lên đầu'}
                  aria-label={isPinned ? 'Bỏ ghim công cụ' : 'Ghim công cụ lên đầu'}
                  className={`h-7 w-7 rounded-md inline-flex items-center justify-center transition-colors ${
                    isPinned
                      ? 'text-accent bg-accent-soft'
                      : 'text-ink-3 opacity-70 group-hover:opacity-100 hover:bg-sunken hover:text-ink'
                  }`}
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1">
                <div className="text-[13.5px] font-semibold text-ink leading-snug">{tool.title}</div>
                <div className="text-2xs text-ink-3">{tool.badgeText}</div>
              </div>

              <div className="pt-1 border-t border-line/70 flex items-center justify-between gap-1 text-2xs text-ink-3">
                <span className="truncate">{tool.targetRoles}</span>
                {isSelected && <Status tone="info">Đang mở</Status>}
              </div>
            </div>
          );
        })}
      </div>

      {/* KHÔNG GIAN THAO TÁC TRỰC TIẾP CỦA CÔNG CỤ ĐANG CHỌN */}
      {activeTool.id === 'tax-gross-net' && (
        <Panel
          title="1. Máy tính Quy đổi Gross ↔ Net & Phân bậc Khung lương (KL)"
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={RotateCcw}
                onClick={() => {
                  setFeeInputAmount('2500000');
                  setVideoQty('1');
                  setAdvancePct('0');
                  setCalcDirection('NET_TO_GROSS');
                  setTaxScheme('PIT_10');
                }}
              >
                Đặt lại
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={copiedKey === 'tax-quote' ? Check : Copy}
                onClick={() => {
                  const summary = [
                    `BÁO GIÁ BOOKING KOC (${taxCalculation.klGrade})`,
                    `- Đơn giá Net (Thực nhận): ${formatVnd(taxCalculation.unitNet)} / video`,
                    `- Đơn giá Gross (Kèm thuế): ${formatVnd(taxCalculation.unitGross)} / video`,
                    `- Thuế khấu trừ: ${formatVnd(taxCalculation.unitTax)} / video`,
                    `- Số lượng: ${taxCalculation.qty} video`,
                    `- Tổng thanh toán Net: ${formatVnd(taxCalculation.totalNet)}`,
                    `- Tổng ngân sách Gross: ${formatVnd(taxCalculation.totalGross)}`,
                  ].join('\n');
                  handleCopyText(summary, 'Bảng tính Gross/Net', 'tax-quote');
                }}
              >
                Sao chép báo giá
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 space-y-3.5">
              <Field label="Chiều quy đổi">
                <Segmented
                  items={[
                    { key: 'NET_TO_GROSS', label: 'Biết giá Net → Tính Gross' },
                    { key: 'GROSS_TO_NET', label: 'Biết giá Gross → Tính Net' },
                  ]}
                  value={calcDirection}
                  onChange={setCalcDirection}
                />
              </Field>

              <Field label="Hình thức thuế áp dụng">
                <Select
                  value={taxScheme}
                  onChange={(e) => setTaxScheme(e.target.value as typeof taxScheme)}
                >
                  <option value="PIT_10">Cá nhân KOC — Thuế TNCN 10% (Gross = Net / 0.9)</option>
                  <option value="VAT_8">Công ty / Agency — Hóa đơn VAT 8%</option>
                  <option value="VAT_10">Công ty / Agency — Hóa đơn VAT 10%</option>
                  <option value="FOC_0">Suất gửi mẫu miễn phí (FOC — 0 ₫)</option>
                </Select>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field
                  label={calcDirection === 'NET_TO_GROSS' ? 'Đơn giá Net / video (₫)' : 'Đơn giá Gross / video (₫)'}
                  className="sm:col-span-1"
                >
                  <Input
                    type="number"
                    min={0}
                    step={50000}
                    value={feeInputAmount}
                    onChange={(e) => setFeeInputAmount(e.target.value)}
                  />
                </Field>
                <Field label="Số lượng video">
                  <Input
                    type="number"
                    min={1}
                    max={200}
                    value={videoQty}
                    onChange={(e) => setVideoQty(e.target.value)}
                  />
                </Field>
                <Field label="Tạm ứng trước (%)">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={advancePct}
                    onChange={(e) => setAdvancePct(e.target.value)}
                  />
                </Field>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {[300000, 800000, 1500000, 2500000, 4000000, 7000000, 15000000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setFeeInputAmount(String(preset))}
                    className="h-7 px-2.5 rounded-md border border-line bg-sunken/60 hover:bg-sunken text-2xs font-medium text-ink-2 tabular-nums"
                  >
                    {(preset / 1000000 >= 1 ? `${preset / 1000000}M` : `${preset / 1000}k`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
              <div className="rounded-xl border border-line bg-canvas p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-3">Đơn giá 1 Video</span>
                  <Status tone="info">Bậc {taxCalculation.klGrade}</Status>
                </div>
                <div className="space-y-1.5 pt-1 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-ink-2">Thực nhận KOC (Net):</span>
                    <span className="font-semibold text-ink tabular-nums">{formatVnd(taxCalculation.unitNet)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-2">Thuế khấu trừ / VAT:</span>
                    <span className="font-medium text-warning tabular-nums">{formatVnd(taxCalculation.unitTax)}</span>
                  </div>
                  <div className="flex justify-between border-t border-line pt-1.5">
                    <span className="text-ink-2 font-medium">Chi phí Gross kèm thuế:</span>
                    <span className="font-semibold text-accent tabular-nums">{formatVnd(taxCalculation.unitGross)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-line bg-canvas p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-3">Tổng cộng ({taxCalculation.qty} video)</span>
                  <Status tone="positive">Kế toán kiểm soát Net</Status>
                </div>
                <div className="space-y-1.5 pt-1 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-ink-2">Tổng chi Net (ĐNTT):</span>
                    <span className="font-semibold text-positive tabular-nums">{formatVnd(taxCalculation.totalNet)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-2">Tổng chi Gross:</span>
                    <span className="font-semibold text-ink tabular-nums">{formatVnd(taxCalculation.totalGross)}</span>
                  </div>
                  <div className="flex justify-between border-t border-line pt-1.5">
                    <span className="text-ink-2">Tạm ứng / Còn lại:</span>
                    <span className="font-medium text-ink tabular-nums">
                      {formatVnd(taxCalculation.advanceAmount)} / {formatVnd(taxCalculation.remainingNet)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2 rounded-xl border border-line bg-surface p-3 text-xs text-ink-2 flex flex-wrap items-center justify-between gap-2">
                <span>
                  Khung lương B2C: <strong>Freecast</strong> (0đ) · <strong>KL1</strong> (&lt;500k) · <strong>KL2</strong> (500k–&lt;1.5M) · <strong>KL3</strong> (1.5M–&lt;3M) · <strong>KL4</strong> (3M–&lt;5M) · <strong>KL5</strong> (5M–&lt;10M) · <strong>KL6</strong> (10M–&lt;30M) · <strong>KL7</strong> (≥30M)
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-line grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-4">
              <Field label="Tính thuế & đối chiếu Ratecard hàng loạt (ID KOC | Giá Net | SL)">
                <Textarea
                  rows={5}
                  value={batchQuoteInput}
                  onChange={(e) => setBatchQuoteInput(e.target.value)}
                  placeholder="goc.cua.ru 2500000 1"
                />
              </Field>
            </div>
            <div className="lg:col-span-8 border border-line rounded-xl overflow-hidden">
              <DataTable<BatchTaxRow>
                rowKey={(r) => r.id}
                rows={batchTaxRows}
                columns={[
                  {
                    key: 'handle',
                    header: 'Kênh KOC',
                    width: 170,
                    render: (r) => (
                      <div className="flex flex-col">
                        <span className="font-medium text-ink">@{r.handle}</span>
                        <span className="text-2xs text-ink-3">{r.kocName}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'klGrade',
                    header: 'Bậc KL',
                    width: 90,
                    render: (r) => <Status tone="info">{r.klGrade}</Status>,
                  },
                  {
                    key: 'totalNet',
                    header: 'Tổng Net',
                    align: 'right',
                    width: 130,
                    render: (r) => (
                      <span className="tabular-nums font-semibold text-ink">
                        {formatVnd(r.totalNet)} ({r.videoQty}v)
                      </span>
                    ),
                  },
                  {
                    key: 'totalGross',
                    header: 'Tổng Gross',
                    align: 'right',
                    width: 130,
                    render: (r) => (
                      <span className="tabular-nums font-medium text-accent">{formatVnd(r.totalGross)}</span>
                    ),
                  },
                  {
                    key: 'compliance',
                    header: 'Quy chuẩn Hợp đồng',
                    render: (r) =>
                      r.requiresLegalFinanceReview ? (
                        <Status tone="critical">≥50M: Duyệt Pháp chế & KT</Status>
                      ) : r.requiresContract ? (
                        <Status tone="warning">&gt;9M: Bắt buộc HĐ/SOW</Status>
                      ) : (
                        <Status tone="positive">Chuẩn khung</Status>
                      ),
                  },
                ]}
              />
            </div>
          </div>
        </Panel>
      )}

      {activeTool.id === 'roas-breakeven' && (
        <Panel
          title="2. Máy tính ROAS, CIR & Điểm hòa vốn Chiến dịch / Video"
          actions={
            <Button
              variant="primary"
              size="sm"
              icon={copiedKey === 'roas-copy' ? Check : Copy}
              onClick={() => {
                const text = [
                  `ƯỚC TÍNH HIỆU QUẢ & ĐIỂM HÒA VỐN (${roasStoreName || 'Gian hàng B2C'})`,
                  `- Tổng chi phí cố định (Gross + Ads + Mẫu): ${formatVnd(roasMetrics.totalFixedCost)}`,
                  `- Biên lợi nhuận đóng góp sau phí sàn & affiliate: ${roasMetrics.contributionMarginPct.toFixed(1)}%`,
                  `- GMV Hòa vốn: ${formatVnd(roasMetrics.breakEvenGmv)} (${roasMetrics.breakEvenOrders} đơn · ROAS ${roasMetrics.breakEvenRoas.toFixed(2)}x)`,
                  `- GMV Mục tiêu: ${formatVnd(roasMetrics.expectedGmv)} (CIR Net: ${roasMetrics.cirNetPct.toFixed(1)}% · Lãi/Lỗ dự kiến: ${formatVnd(roasMetrics.estimatedProfit)})`,
                ].join('\n');
                handleCopyText(text, 'Báo cáo ước tính ROAS & Hòa vốn', 'roas-copy');
              }}
            >
              Sao chép kết quả
            </Button>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Gian hàng tham chiếu">
                <Select value={roasStoreName} onChange={(e) => setRoasStoreName(e.target.value)}>
                  {stores.map((s) => (
                    <option key={s.id} value={s.storeName}>
                      {s.storeName} ({s.brandName})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Giá trị đơn trung bình — AOV (₫)">
                <Input type="number" value={roasAov} onChange={(e) => setRoasAov(e.target.value)} />
              </Field>
              <Field label="Chi phí Booking KOC Net (₫)">
                <Input type="number" value={roasBookingNet} onChange={(e) => setRoasBookingNet(e.target.value)} />
              </Field>
              <Field label="Ngân sách chạy Spark Ads (₫)">
                <Input type="number" value={roasAdsSpend} onChange={(e) => setRoasAdsSpend(e.target.value)} />
              </Field>
              <Field label="Chi phí hàng mẫu & vận chuyển (₫)">
                <Input type="number" value={roasSampleCost} onChange={(e) => setRoasSampleCost(e.target.value)} />
              </Field>
              <Field label="GMV mục tiêu kỳ vọng (₫)">
                <Input type="number" value={roasTargetGmv} onChange={(e) => setRoasTargetGmv(e.target.value)} />
              </Field>
              <Field label="Biên lãi gộp trước phí sàn (%)">
                <Input type="number" value={roasGrossMarginPct} onChange={(e) => setRoasGrossMarginPct(e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Phí sàn (%)">
                  <Input type="number" value={roasPlatformFeePct} onChange={(e) => setRoasPlatformFeePct(e.target.value)} />
                </Field>
                <Field label="Affiliate (%)">
                  <Input type="number" value={roasAffiliatePct} onChange={(e) => setRoasAffiliatePct(e.target.value)} />
                </Field>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-line bg-canvas p-3.5 space-y-1">
                  <span className="text-2xs text-ink-3">Doanh thu hòa vốn (Break-even GMV)</span>
                  <div className="text-lg font-semibold text-ink tabular-nums">{formatVnd(roasMetrics.breakEvenGmv)}</div>
                  <span className="text-2xs text-ink-2">
                    Cần tối thiểu <strong>{roasMetrics.breakEvenOrders}</strong> đơn · ROAS hòa vốn{' '}
                    <strong>{roasMetrics.breakEvenRoas.toFixed(2)}x</strong>
                  </span>
                </div>
                <div className="rounded-xl border border-line bg-canvas p-3.5 space-y-1">
                  <span className="text-2xs text-ink-3">CIR Net & ROAS ở mức GMV mục tiêu</span>
                  <div className="text-lg font-semibold text-accent tabular-nums">
                    CIR {roasMetrics.cirNetPct.toFixed(1)}% · ROAS {roasMetrics.expectedRoas.toFixed(2)}x
                  </div>
                  <span className="text-2xs text-ink-2">
                    Ước đạt <strong>{roasMetrics.expectedOrders}</strong> đơn hàng
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-line bg-surface p-3.5 space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-ink-2">Tổng chi phí cố định (Booking Gross + Ads + Mẫu):</span>
                  <span className="font-semibold text-ink tabular-nums">{formatVnd(roasMetrics.totalFixedCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-2">Biên đóng góp ròng (sau phí sàn & hoa hồng):</span>
                  <span className="font-medium text-ink tabular-nums">{roasMetrics.contributionMarginPct.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between border-t border-line pt-2">
                  <span className="text-ink-2 font-medium">Lợi nhuận ròng dự kiến tại GMV mục tiêu:</span>
                  <span
                    className={`font-semibold tabular-nums ${
                      roasMetrics.estimatedProfit >= 0 ? 'text-positive' : 'text-critical'
                    }`}
                  >
                    {formatVnd(roasMetrics.estimatedProfit)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {activeTool.id === 'kpi-splitter' && (
        <Panel
          title="3. Chia định mức KPI & Ngân sách Order theo Tuần (W1–W4)"
          flush
          actions={
            <Button
              variant="primary"
              size="sm"
              icon={copiedKey === 'kpi-copy' ? Check : Copy}
              onClick={() => {
                const lines = kpiWeeklyRows.map(
                  (r) =>
                    `${r.weekLabel}\t${r.weightPct}%\t${r.weekNet}\t${r.weekGross}\t${r.weekPaid} Paid + ${r.weekFoc} FOC\t${r.perStaffVideos} video/PIC`
                );
                handleCopyText(
                  ['Tuần\tTỷ trọng\tOrder Net\tOrder Gross\tSố Video\tĐịnh mức/PIC', ...lines].join('\n'),
                  'Bảng phân bổ KPI tuần',
                  'kpi-copy'
                );
              }}
            >
              Sao chép bảng TSV
            </Button>
          }
        >
          <div className="p-3.5 sm:p-4 border-b border-line grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Field label="Hạn mức Order Net tháng (₫)">
              <Input
                type="number"
                value={kpiMonthlyBudgetNet}
                onChange={(e) => setKpiMonthlyBudgetNet(e.target.value)}
              />
            </Field>
            <Field label="Tổng Video KOC trả phí (Paid)">
              <Input type="number" value={kpiPaidVideos} onChange={(e) => setKpiPaidVideos(e.target.value)} />
            </Field>
            <Field label="Tổng Video gửi mẫu 0đ (FOC)">
              <Input type="number" value={kpiFocVideos} onChange={(e) => setKpiFocVideos(e.target.value)} />
            </Field>
            <Field label="Số nhân sự thực thi (PIC)">
              <Input type="number" min={1} value={kpiStaffCount} onChange={(e) => setKpiStaffCount(e.target.value)} />
            </Field>
            <Field label="Nhịp phân bổ chiến dịch">
              <Select
                value={kpiWeightPreset}
                onChange={(e) => setKpiWeightPreset(e.target.value as typeof kpiWeightPreset)}
              >
                <option value="DOUBLE_DAY_W1">Dồn sóng Double Day W1 (35/25/20/20)</option>
                <option value="MEGA_MID_MONTH">Dồn sóng Giữa tháng W2 (20/35/25/20)</option>
                <option value="PAYDAY_END">Dồn sóng Payday cuối tháng W4 (20/20/25/35)</option>
                <option value="EVEN">Chia đều 4 tuần (25/25/25/25)</option>
              </Select>
            </Field>
          </div>
          <DataTable columns={kpiColumns} rows={kpiWeeklyRows} rowKey={(r) => r.id} />
        </Panel>
      )}

      {activeTool.id === 'bulk-link-extractor' && (
        <Panel
          title="4. Bóc tách hàng loạt Link TikTok & Shopee (Lấy ID Kênh, Mã Video & Đối chiếu Danh bạ)"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={copiedKey === 'copy-handles' ? Check : Copy}
                onClick={() => {
                  const handles = extractedLinkRows
                    .map((r) => r.channelId)
                    .filter((h) => h && h !== '—')
                    .join('\n');
                  handleCopyText(handles, 'Danh sách ID kênh', 'copy-handles');
                }}
              >
                Chép cột ID kênh
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={copiedKey === 'copy-videoids' ? Check : Copy}
                onClick={() => {
                  const ids = extractedLinkRows
                    .map((r) => r.videoOrItemId)
                    .filter((v) => v && v !== '—')
                    .join('\n');
                  handleCopyText(ids, 'Danh sách Mã video', 'copy-videoids');
                }}
              >
                Chép cột Mã video
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={copiedKey === 'copy-tsv-links' ? Check : Copy}
                onClick={() => {
                  const tsv = extractedLinkRows
                    .map(
                      (r) =>
                        `${r.channelId}\t${r.channelUrl}\t${r.videoOrItemId}\t${r.matchedKocName}\t${r.matchedKlGrade}\t${r.originalUrl}`
                    )
                    .join('\n');
                  handleCopyText(tsv, 'Bảng dữ liệu bóc tách (TSV)', 'copy-tsv-links');
                }}
              >
                Chép bảng dán Excel
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-4">
              <Field label="Dán danh sách Link TikTok / @handle / Link Shopee (mỗi dòng 1 link)">
                <Textarea
                  rows={8}
                  value={rawLinksInput}
                  onChange={(e) => setRawLinksInput(e.target.value)}
                  placeholder="https://www.tiktok.com/@user/video/74123456789..."
                />
              </Field>
            </div>
            <div className="lg:col-span-8 border border-line rounded-xl overflow-hidden">
              <DataTable
                columns={linkExtractorColumns}
                rows={extractedLinkRows}
                rowKey={(r) => r.id}
                empty={<EmptyState title="Chưa có đường dẫn nào" />}
              />
            </div>
          </div>
        </Panel>
      )}

      {activeTool.id === 'vietqr-generator' && (
        <Panel
          title="5. Tạo mã QR VietQR & Nội dung chuyển khoản chuẩn Kế toán"
          actions={
            <Button
              variant="primary"
              size="sm"
              icon={copiedKey === 'copy-qr-note' ? Check : Copy}
              onClick={() => handleCopyText(qrTransferNote, 'Nội dung chuyển khoản', 'copy-qr-note')}
            >
              Sao chép nội dung CK
            </Button>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
              <Field label="Chọn nhanh từ Danh bạ KOC (Tùy chọn)" className="sm:col-span-2">
                <Select value={qrSelectedKocId} onChange={(e) => handleSelectKocForQr(e.target.value)}>
                  <option value="">-- Nhập thủ công hoặc chọn KOC từ danh bạ --</option>
                  {kocs.slice(0, 120).map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.stageName} (@{k.channelId}) — {k.bankName || 'Chưa rõ NH'} {k.bankAccount || ''}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Ngân hàng thụ hưởng">
                <Select value={qrBankBin} onChange={(e) => setQrBankBin(e.target.value)}>
                  {VIETQR_BANKS.map((b) => (
                    <option key={b.bin} value={b.bin}>
                      {b.shortName} ({b.code})
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Số tài khoản ngân hàng">
                <Input value={qrAccountNo} onChange={(e) => setQrAccountNo(e.target.value)} />
              </Field>

              <Field label="Tên chủ tài khoản (Không dấu)">
                <Input value={qrAccountName} onChange={(e) => setQrAccountName(e.target.value)} />
              </Field>

              <Field label="Số tiền chuyển khoản Net (₫)">
                <Input type="number" value={qrAmountNet} onChange={(e) => setQrAmountNet(e.target.value)} />
              </Field>

              <Field label="Mã Booking Order (BO...)">
                <Input value={qrBookingCode} onChange={(e) => setQrBookingCode(e.target.value)} />
              </Field>

              <Field label="Thương hiệu (Brand)">
                <Select value={qrBrandName} onChange={(e) => setQrBrandName(e.target.value)}>
                  {brands.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Loại đợt thanh toán" className="sm:col-span-2">
                <Segmented
                  items={[
                    { key: 'THANH_TOAN', label: 'Thanh toán 100%' },
                    { key: 'TAM_UNG', label: 'Tạm ứng trước' },
                    { key: 'TAT_TOAN', label: 'Tất toán phần còn lại' },
                  ]}
                  value={qrPaymentType}
                  onChange={setQrPaymentType}
                />
              </Field>

              <div className="sm:col-span-2 rounded-xl border border-line bg-canvas p-3 space-y-1">
                <span className="text-2xs text-ink-3">Nội dung chuyển khoản chuẩn (Bảng 3.2):</span>
                <div className="font-mono text-sm font-semibold text-ink break-all">{qrTransferNote}</div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col items-center justify-center rounded-xl border border-line bg-canvas p-4 gap-3">
              {vietQrImageUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={vietQrImageUrl}
                    alt="Mã QR chuyển khoản VietQR"
                    className="w-56 h-auto rounded-lg border border-line bg-white p-2"
                  />
                  <div className="text-center space-y-0.5">
                    <div className="text-sm font-semibold text-ink tabular-nums">
                      {formatVnd(Number(qrAmountNet) || 0)}
                    </div>
                    <div className="text-2xs text-ink-3">
                      {qrAccountName} · {qrAccountNo}
                    </div>
                  </div>
                </>
              ) : (
                <EmptyState title="Nhập số tài khoản để hiển thị mã QR" />
              )}
            </div>
          </div>
        </Panel>
      )}

      {activeTool.id === 'utm-builder' && (
        <Panel
          title="6. Tạo Link UTM & Tracking Chiến dịch hàng loạt cho KOC"
          actions={
            <Button
              variant="primary"
              size="sm"
              icon={copiedKey === 'copy-utm-all' ? Check : Copy}
              onClick={() => {
                const all = generatedUtmLinks.map((u) => `${u.handle}\t${u.fullUrl}`).join('\n');
                handleCopyText(all, 'Danh sách Link UTM', 'copy-utm-all');
              }}
            >
              Sao chép toàn bộ Link UTM
            </Button>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 space-y-3">
              <Field label="Đường dẫn trang đích (Gian hàng / Sản phẩm)">
                <Input value={utmBaseUrl} onChange={(e) => setUtmBaseUrl(e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nguồn (utm_source)">
                  <Select value={utmSource} onChange={(e) => setUtmSource(e.target.value)}>
                    <option value="tiktok">tiktok</option>
                    <option value="facebook">facebook</option>
                    <option value="instagram">instagram</option>
                    <option value="threads">threads</option>
                    <option value="youtube">youtube</option>
                  </Select>
                </Field>
                <Field label="Hình thức (utm_medium)">
                  <Select value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)}>
                    <option value="koc_booking">koc_booking</option>
                    <option value="self_channel">self_channel</option>
                    <option value="spark_ads">spark_ads</option>
                    <option value="livestream">livestream</option>
                    <option value="bio_link">bio_link</option>
                  </Select>
                </Field>
              </div>
              <Field label="Tên chiến dịch (utm_campaign)">
                <Input value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} />
              </Field>
              <Field label="Danh sách ID KOC / Mã nội dung (mỗi dòng 1 mã)">
                <Textarea
                  rows={4}
                  value={utmContentHandles}
                  onChange={(e) => setUtmContentHandles(e.target.value)}
                />
              </Field>
            </div>

            <div className="lg:col-span-7 space-y-2">
              {generatedUtmLinks.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-line bg-canvas px-3 py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-ink">@{item.handle}</div>
                    <div className="font-mono text-2xs text-ink-2 break-all">{item.fullUrl}</div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={copiedKey === item.id ? Check : Copy}
                    onClick={() => handleCopyText(item.fullUrl, `Link UTM @${item.handle}`, item.id)}
                  >
                    Chép
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      )}

      {activeTool.id === 'script-policy-checker' && (
        <Panel
          title="7. Kiểm tra từ ngữ hạn chế TikTok Shop trong Kịch bản & Caption"
          actions={
            <div className="flex items-center gap-2">
              {scriptScanMatches.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Sparkles}
                  onClick={handleAutoReplaceRestrictedWords}
                >
                  Thay thế từ gợi ý ({scriptScanMatches.length})
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                icon={copiedKey === 'copy-clean-script' ? Check : Copy}
                onClick={() =>
                  handleCopyText(scriptTextToScan, 'Nội dung kịch bản đã kiểm tra', 'copy-clean-script')
                }
              >
                Sao chép kịch bản
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6">
              <Field label="Nội dung kịch bản, lời thoại hoặc caption cần rà soát">
                <Textarea
                  rows={9}
                  value={scriptTextToScan}
                  onChange={(e) => setScriptTextToScan(e.target.value)}
                  placeholder="Dán nội dung kịch bản KOC hoặc lời thoại video vào đây..."
                />
              </Field>
            </div>

            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-line bg-canvas px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  {scriptScanMatches.length === 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-positive" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-critical" />
                  )}
                  <span className="text-[13px] font-semibold text-ink">
                    {scriptScanMatches.length === 0
                      ? 'Không phát hiện từ ngữ nằm trong danh mục hạn chế'
                      : `Phát hiện ${scriptScanMatches.length} cụm từ có nguy cơ bóp tương tác / vi phạm`}
                  </span>
                </div>
                <Status tone={scriptScanMatches.length === 0 ? 'positive' : 'critical'}>
                  {scriptScanMatches.length === 0 ? 'An toàn' : `${scriptScanMatches.length} cảnh báo`}
                </Status>
              </div>

              {scriptScanMatches.length > 0 && (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {scriptScanMatches.map((m) => (
                    <div
                      key={m.term}
                      className="rounded-lg border border-line bg-surface p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-critical">&ldquo;{m.term}&rdquo;</span>
                          <Status tone={m.severity === 'CAO' ? 'critical' : 'warning'}>
                            {m.categoryLabel}
                          </Status>
                          <span className="text-2xs text-ink-3">({m.count} lần)</span>
                        </div>
                        <div className="text-xs text-ink-2">
                          Gợi ý thay bằng: <strong className="text-positive">{m.suggestion}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Panel>
      )}

      {activeTool.id === 'voiceover-timer' && (
        <Panel
          title="8. Đếm chữ, Ước tính thời lượng đọc Voiceover & Nhịp kịch bản"
          actions={
            <Button
              variant="primary"
              size="sm"
              icon={copiedKey === 'copy-vo-script' ? Check : Copy}
              onClick={() => handleCopyText(voiceoverScript, 'Kịch bản Voiceover', 'copy-vo-script')}
            >
              Sao chép kịch bản
            </Button>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Field label="Thời lượng video mục tiêu">
                  <Chips
                    items={[
                      { key: '15', label: '15 giây (Short Hook)' },
                      { key: '30', label: '30 giây (Tiêu chuẩn)' },
                      { key: '45', label: '45 giây (Review)' },
                      { key: '60', label: '60 giây (Chi tiết)' },
                      { key: '90', label: '90 giây (Storytelling)' },
                    ]}
                    value={targetVideoDurationSec}
                    onChange={setTargetVideoDurationSec}
                  />
                </Field>
                <Field label="Tốc độ giọng đọc">
                  <Segmented
                    items={[
                      { key: '130', label: 'Chậm (130 từ/p)' },
                      { key: '155', label: 'Vừa (155 từ/p)' },
                      { key: '185', label: 'Nhanh (185 từ/p)' },
                    ]}
                    value={speakingSpeedWpm}
                    onChange={setSpeakingSpeedWpm}
                  />
                </Field>
              </div>

              <Field label="Lời thoại kịch bản (Voiceover)">
                <Textarea
                  rows={8}
                  value={voiceoverScript}
                  onChange={(e) => setVoiceoverScript(e.target.value)}
                />
              </Field>
            </div>

            <div className="lg:col-span-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-line bg-canvas p-3.5 space-y-1">
                  <span className="text-2xs text-ink-3">Thời lượng đọc ước tính</span>
                  <div className="text-xl font-semibold text-ink tabular-nums">
                    {voiceoverStats.estimatedSec} giây
                  </div>
                  <Status
                    tone={
                      Math.abs(voiceoverStats.diffSec) <= 5
                        ? 'positive'
                        : voiceoverStats.diffSec > 5
                        ? 'critical'
                        : 'warning'
                    }
                  >
                    {Math.abs(voiceoverStats.diffSec) <= 5
                      ? 'Vừa khớp khung thời lượng'
                      : voiceoverStats.diffSec > 0
                      ? `Dài hơn mục tiêu ${voiceoverStats.diffSec}s`
                      : `Ngắn hơn mục tiêu ${Math.abs(voiceoverStats.diffSec)}s`}
                  </Status>
                </div>

                <div className="rounded-xl border border-line bg-canvas p-3.5 space-y-1">
                  <span className="text-2xs text-ink-3">Tổng số từ / Ký tự</span>
                  <div className="text-xl font-semibold text-accent tabular-nums">
                    {voiceoverStats.wordCount} từ
                  </div>
                  <span className="text-2xs text-ink-2">
                    {voiceoverStats.charCount} ký tự · {voiceoverStats.lineCount} đoạn
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-line bg-surface p-3.5 space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-ink-2">Số từ khuyến nghị cho video {voiceoverStats.targetSec}s:</span>
                  <span className="font-semibold text-ink tabular-nums">
                    {voiceoverStats.recommendedMinWords} – {voiceoverStats.recommendedMaxWords} từ
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-2">Độ dài Hook 3 giây đầu nên gói gọn:</span>
                  <span className="font-medium text-ink tabular-nums">~{voiceoverStats.hookWordsTarget} từ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-2">Độ dài CTA điều hướng giỏ hàng cuối bài:</span>
                  <span className="font-medium text-ink tabular-nums">~{voiceoverStats.ctaWordsTarget} từ</span>
                </div>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {activeTool.id === 'brief-hashtag-builder' && (
        <Panel
          title="9. Soạn khung Brief gửi KOC & Bộ Hashtag chuẩn Brand"
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={copiedKey === 'copy-hashtags' ? Check : Copy}
                onClick={() =>
                  handleCopyText(generatedBriefOutput.hashtags, 'Bộ Hashtag chuẩn', 'copy-hashtags')
                }
              >
                Chép Hashtag
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={copiedKey === 'copy-brief-full' ? Check : Copy}
                onClick={() =>
                  handleCopyText(generatedBriefOutput.briefText, 'Bản Brief gửi KOC', 'copy-brief-full')
                }
              >
                Sao chép toàn bộ Brief
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Thương hiệu (Brand)">
                <Select value={briefBrandName} onChange={(e) => setBriefBrandName(e.target.value)}>
                  {brands.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Trụ cột nội dung (Content Pillar)">
                <Select value={briefContentPillar} onChange={(e) => setBriefContentPillar(e.target.value)}>
                  {CONTENT_TAG_OPTIONS.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Sản phẩm trọng tâm (Hero SKU)" className="sm:col-span-2">
                <Input value={briefHeroProduct} onChange={(e) => setBriefHeroProduct(e.target.value)} />
              </Field>
              <Field label="Điểm bán hàng độc nhất (USP cần nhấn mạnh)" className="sm:col-span-2">
                <Textarea rows={2} value={briefKeyUsp} onChange={(e) => setBriefKeyUsp(e.target.value)} />
              </Field>
              <Field label="Yêu cầu bắt buộc (DOs)" className="sm:col-span-2">
                <Textarea rows={2} value={briefMandatoryDo} onChange={(e) => setBriefMandatoryDo(e.target.value)} />
              </Field>
              <Field label="Lưu ý tránh vi phạm (DONTs)" className="sm:col-span-2">
                <Textarea
                  rows={2}
                  value={briefMandatoryDont}
                  onChange={(e) => setBriefMandatoryDont(e.target.value)}
                />
              </Field>
            </div>

            <div className="lg:col-span-6 space-y-3">
              <div className="rounded-xl border border-line bg-canvas p-3.5 space-y-2">
                <span className="text-2xs font-medium text-ink-3">Bản tóm tắt gửi nhanh qua Zalo / Lark cho KOC:</span>
                <pre className="whitespace-pre-wrap font-sans text-[13px] text-ink leading-relaxed bg-surface p-3 rounded-lg border border-line">
                  {generatedBriefOutput.briefText}
                </pre>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {activeTool.id === 'list-diff-checker' && (
        <Panel
          title="10. Đối soát nhanh 2 danh sách Mã Booking (BO...) / ID Kênh KOC"
          actions={
            <Button
              variant="primary"
              size="sm"
              icon={copiedKey === 'copy-diff-report' ? Check : Copy}
              onClick={() => {
                const summary = [
                  `KẾT QUẢ ĐỐI SOÁT DANH SÁCH`,
                  `- Khớp cả 2 bên (${listComparison.inBoth.length}): ${listComparison.inBoth.join(', ')}`,
                  `- Chỉ có ở Danh sách A (${listComparison.onlyInA.length}): ${listComparison.onlyInA.join(', ')}`,
                  `- Chỉ có ở Danh sách B (${listComparison.onlyInB.length}): ${listComparison.onlyInB.join(', ')}`,
                ].join('\n');
                handleCopyText(summary, 'Kết quả đối soát 2 danh sách', 'copy-diff-report');
              }}
            >
              Sao chép kết quả đối soát
            </Button>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={`Danh sách A — Kế hoạch / Sheet Listing (${listComparison.totalRawA} dòng)`}>
                <Textarea rows={8} value={listAText} onChange={(e) => setListAText(e.target.value)} />
              </Field>
              <Field label={`Danh sách B — Thực tế nghiệm thu / Kế toán (${listComparison.totalRawB} dòng)`}>
                <Textarea rows={8} value={listBText} onChange={(e) => setListBText(e.target.value)} />
              </Field>
            </div>

            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
              <div className="rounded-xl border border-line bg-canvas p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-2">Có ở A nhưng thiếu ở B</span>
                  <Status tone={listComparison.onlyInA.length > 0 ? 'warning' : 'positive'}>
                    {listComparison.onlyInA.length} mã
                  </Status>
                </div>
                <div className="font-mono text-xs text-ink break-words">
                  {listComparison.onlyInA.length > 0 ? listComparison.onlyInA.join(', ') : 'Không có'}
                </div>
              </div>

              <div className="rounded-xl border border-line bg-canvas p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-2">Phát sinh ở B nhưng chưa có ở A</span>
                  <Status tone={listComparison.onlyInB.length > 0 ? 'critical' : 'positive'}>
                    {listComparison.onlyInB.length} mã
                  </Status>
                </div>
                <div className="font-mono text-xs text-ink break-words">
                  {listComparison.onlyInB.length > 0 ? listComparison.onlyInB.join(', ') : 'Không có'}
                </div>
              </div>

              <div className="rounded-xl border border-line bg-canvas p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-2">Khớp trùng cả 2 danh sách</span>
                  <Status tone="positive">{listComparison.inBoth.length} mã</Status>
                </div>
                <div className="font-mono text-xs text-ink-2 break-words">
                  {listComparison.inBoth.length > 0 ? listComparison.inBoth.join(', ') : 'Không có'}
                </div>
              </div>

              <div className="rounded-xl border border-line bg-canvas p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-2">Mã bị lặp trong cùng danh sách</span>
                  <Status
                    tone={
                      listComparison.duplicatesInA.length + listComparison.duplicatesInB.length > 0
                        ? 'warning'
                        : 'neutral'
                    }
                  >
                    {listComparison.duplicatesInA.length + listComparison.duplicatesInB.length} mã
                  </Status>
                </div>
                <div className="font-mono text-xs text-ink-2 break-words">
                  {[...listComparison.duplicatesInA, ...listComparison.duplicatesInB].join(', ') ||
                    'Không có mã trùng'}
                </div>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {activeTool.id === 'p3-workload-calc' && (
        <Panel
          title="11. Tính điểm Tải công việc & Ước tính Thưởng P3 theo Hệ số Gian hàng"
          actions={
            <Button
              variant="primary"
              size="sm"
              icon={copiedKey === 'copy-p3-sim' ? Check : Copy}
              onClick={() => {
                const summary = [
                  `ƯỚC TÍNH ĐIỂM TẢI & THƯỞNG P3 — ${p3Simulation.storeName}`,
                  `- Thương hiệu: ${p3Simulation.brandName} · PIC: ${p3Simulation.picName}`,
                  `- Phân hạng Gian hàng: ${p3Simulation.difficultyTier} (Hệ số ×${p3Simulation.storeMultiplier.toFixed(2)})`,
                  `- Số đầu việc hoàn thành: ${p3Simulation.completedCases}`,
                  `- Điểm tải quy đổi: ${p3Simulation.workloadPoints} điểm`,
                  `- Thưởng P3 dự kiến: ${formatVnd(p3Simulation.estimatedBonusVnd)}`,
                ].join('\n');
                handleCopyText(summary, 'Bảng tính Điểm tải & Thưởng P3', 'copy-p3-sim');
              }}
            >
              Sao chép kết quả P3
            </Button>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Chọn Gian hàng B2C" className="sm:col-span-2">
                <Select value={p3SelectedStoreId} onChange={(e) => setP3SelectedStoreId(e.target.value)}>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.storeName} ({s.brandName} · {s.difficultyTier || 'Tiêu chuẩn'})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Số Video / Đầu việc nghiệm thu">
                <Input
                  type="number"
                  min={0}
                  value={p3CompletedCases}
                  onChange={(e) => setP3CompletedCases(e.target.value)}
                />
              </Field>
              <Field label="Đơn giá thưởng / 1 điểm tải (₫)">
                <Input
                  type="number"
                  min={0}
                  step={10000}
                  value={p3UnitRateVnd}
                  onChange={(e) => setP3UnitRateVnd(e.target.value)}
                />
              </Field>
              <Field label="Hệ số Chất lượng (Quality)">
                <Select value={p3QualityMultiplier} onChange={(e) => setP3QualityMultiplier(e.target.value)}>
                  <option value="0.8">0.80 — Cần cải thiện</option>
                  <option value="1.0">1.00 — Đạt chuẩn</option>
                  <option value="1.1">1.10 — Tốt</option>
                  <option value="1.25">1.25 — Xuất sắc</option>
                </Select>
              </Field>
              <Field label="Hệ số Đúng hạn (SLA)">
                <Select value={p3SlaMultiplier} onChange={(e) => setP3SlaMultiplier(e.target.value)}>
                  <option value="0.85">0.85 — Trễ hạn nhẹ</option>
                  <option value="1.0">1.00 — Đúng hạn SLA</option>
                  <option value="1.1">1.10 — Vượt tiến độ</option>
                </Select>
              </Field>
            </div>

            <div className="lg:col-span-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-line bg-canvas p-3.5 space-y-1">
                  <span className="text-2xs text-ink-3">Điểm tải quy đổi (Workload Points)</span>
                  <div className="text-xl font-semibold text-ink tabular-nums">
                    {p3Simulation.workloadPoints} điểm
                  </div>
                  <Status tone="info">
                    Hệ số gian ×{p3Simulation.storeMultiplier.toFixed(2)} ({p3Simulation.difficultyTier})
                  </Status>
                </div>
                <div className="rounded-xl border border-line bg-canvas p-3.5 space-y-1">
                  <span className="text-2xs text-ink-3">Thưởng P3 ước tính</span>
                  <div className="text-xl font-semibold text-positive tabular-nums">
                    {formatVnd(p3Simulation.estimatedBonusVnd)}
                  </div>
                  <span className="text-2xs text-ink-2">PIC: {p3Simulation.picName}</span>
                </div>
              </div>
              <div className="rounded-xl border border-line bg-surface p-3.5 text-xs text-ink-2">
                Công thức chuẩn B2C: <strong>Điểm tải = Số đầu việc × Hệ số Gian hàng (0.80 / 1.00 / 1.25 / 1.50) × Hệ số Chất lượng × Hệ số SLA</strong>.
              </div>
            </div>
          </div>
        </Panel>
      )}

      {activeTool.id === 'sla-timeline-calc' && (
        <Panel
          title="12. Tra cứu Mốc hạn SLA Booking & Khóa sổ Nghiệm thu từ Ngày Air"
          flush
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={Download}
                onClick={() => {
                  const csv = [
                    'Mốc hạn,Ngày mục tiêu,Đầu việc,Quy tắc SLA,Phụ trách,Trạng thái',
                    ...slaTimelineRows.map(
                      (r) =>
                        `"${r.stepCode}","${r.targetDateStr}","${r.milestoneName}","${r.ruleSummary}","${r.ownerRole}","${r.statusLabel}"`
                    ),
                  ].join('\n');
                  downloadTextFile(`sla-timeline-${slaAirDateIso}.csv`, csv);
                }}
              >
                Tải CSV
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={copiedKey === 'copy-sla-timeline' ? Check : Copy}
                onClick={() => {
                  const text = slaTimelineRows
                    .map((r) => `[${r.stepCode} · ${r.targetDateStr}] ${r.milestoneName} (${r.statusLabel})`)
                    .join('\n');
                  handleCopyText(text, 'Lịch mốc hạn SLA Booking', 'copy-sla-timeline');
                }}
              >
                Sao chép lịch SLA
              </Button>
            </div>
          }
        >
          <div className="p-3.5 sm:p-4 border-b border-line grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Ngày dự kiến KOC Air Video (T0)">
              <Input
                type="date"
                value={slaAirDateIso}
                onChange={(e) => setSlaAirDateIso(e.target.value)}
              />
            </Field>
            <Field label="Tình trạng sản phẩm mẫu của KOC">
              <Segmented
                items={[
                  { key: 'NO', label: 'Chưa có mẫu (Cần gửi hàng)' },
                  { key: 'YES', label: 'Đã cầm sẵn sản phẩm trên tay' },
                ]}
                value={slaHasSampleOnHand}
                onChange={setSlaHasSampleOnHand}
              />
            </Field>
            <Field label="Đơn giá Cát-xê Net của Job (₫)">
              <Input
                type="number"
                min={0}
                step={100000}
                value={slaDealFeeNet}
                onChange={(e) => setSlaDealFeeNet(e.target.value)}
              />
            </Field>
          </div>
          <DataTable<SlaMilestoneRow>
            rowKey={(r) => r.id}
            rows={slaTimelineRows}
            columns={[
              {
                key: 'stepCode',
                header: 'Mốc SLA',
                width: 130,
                render: (r) => <span className="font-semibold text-ink">{r.stepCode}</span>,
              },
              {
                key: 'targetDateStr',
                header: 'Ngày hạn chót',
                width: 120,
                render: (r) => <span className="font-mono text-xs font-semibold text-accent">{r.targetDateStr}</span>,
              },
              {
                key: 'milestoneName',
                header: 'Hạng mục công việc & Quy chuẩn kiểm soát',
                render: (r) => (
                  <div className="space-y-0.5">
                    <div className="font-medium text-ink">{r.milestoneName}</div>
                    <div className="text-2xs text-ink-3">{r.ruleSummary}</div>
                  </div>
                ),
              },
              {
                key: 'ownerRole',
                header: 'Vai trò',
                width: 135,
                render: (r) => <span className="text-xs text-ink-2">{r.ownerRole}</span>,
              },
              {
                key: 'statusLabel',
                header: 'Trạng thái hạn',
                width: 135,
                render: (r) => <Status tone={r.statusTone}>{r.statusLabel}</Status>,
              },
            ]}
          />
        </Panel>
      )}
    </div>
  );
};
