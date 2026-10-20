'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button, Modal, Segmented } from './ui';
import { AlertTriangle, CheckCircle2, Lock, Plus, ShieldAlert, Trash2, Unlock, Zap } from 'lucide-react';
import {
  KocItem,
  BookingDealItem,
  SalaryGrade,
  BookingDealType,
  KocPricingDisplayMode,
  DealDeliverableItem,
  MediaChannelPlatform,
  AffiliateChannelPlatform,
  DealRightsTermItem,
} from '../lib/types';
import { INITIAL_KOCS } from '../lib/mockData';
import { REAL_B2C_42_BRANDS } from '../lib/realB2cBrandsData';
import { formatVnd, formatNumber } from '../lib/format';
import { findBrandProfile, getBrandRatecardCeiling, useBrandProfiles } from '../lib/brands/useBrandProfiles';
import {
  OPERATING_MODEL_LABEL,
  PROJECT_TIER_LABEL,
  SAMPLE_RETURN_LABEL,
  SAMPLE_SENDER_LABEL,
  SAMPLE_STOCK_LABEL,
} from './brands/brandUi';

interface QuickBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDealCreated: (deal: BookingDealItem) => void;
  preselectedKoc?: KocItem | null;
  preselectedBrand?: string | null;
}

const SALARY_GRADES: SalaryGrade[] = ['KL1', 'KL2', 'KL3', 'KL4', 'KL5', 'KL6', 'KL7'];
const MEDIA_CHANNELS: MediaChannelPlatform[] = ['TikTok', 'Facebook', 'Instagram', 'Shopee Video', 'YouTube', 'Threads'];
const AFFILIATE_CHANNELS: AffiliateChannelPlatform[] = ['TikTok Shop', 'Shopee', 'Lazada', 'Không gắn giỏ'];
const CHANNEL_PICS = [
  'Khánh Vy',
  'Lê Phương Thảo',
  'Phạm Thị Thu Hằng',
  'Lương Thị Như Quỳnh',
  'Hoàng Hải Long',
  'Trần Minh Đức',
];

function createDealIdentifiers(stageName: string) {
  const cleanName = stageName.toUpperCase().replace(/\s+/g, '');
  const now = Date.now();
  const suffix4 = String(1000 + (now % 9000));
  const suffix8 = String(10000000 + (now % 90000000));
  return {
    id: `deal-${now}`,
    dealCode: `BO26_${cleanName}_${suffix4}`,
    jobId: `ID26${suffix8}`,
    appendixCode: `PLHD-202610-${cleanName.slice(0, 6)}`,
  };
}

function maskLast4(value?: string | null): string {
  if (!value) return '—';
  const clean = String(value).trim();
  if (clean.length <= 4) return clean;
  return `•••• ${clean.slice(-4)}`;
}

function buildDefaultDeliverables(totalRate: number, defaultPic: string): DealDeliverableItem[] {
  return [
    {
      id: 'deliv-w0-tt',
      title: 'Video gốc TikTok 60s',
      mediaChannel: 'TikTok',
      affiliateChannel: 'TikTok Shop',
      productionType: 'ORIGINAL',
      wave: 0,
      lockStatus: 'UNLOCKED',
      assignedChannelPic: defaultPic,
      allocatedWeightPct: 70,
      allocatedCostVnd: Math.round(totalRate * 0.7),
    },
    {
      id: 'deliv-w1-fb',
      title: 'Đăng chéo Facebook Reels gắn link Shopee',
      mediaChannel: 'Facebook',
      affiliateChannel: 'Shopee',
      productionType: 'CROSS_POST',
      wave: 1,
      dependsOnDeliverableId: 'deliv-w0-tt',
      lockStatus: 'LOCKED_BY_WAVE_0',
      assignedChannelPic: 'Phạm Thị Thu Hằng',
      allocatedWeightPct: 15,
      allocatedCostVnd: Math.round(totalRate * 0.15),
    },
    {
      id: 'deliv-w1-sp',
      title: 'Đăng chéo Shopee Video gắn giỏ Mall',
      mediaChannel: 'Shopee Video',
      affiliateChannel: 'Shopee',
      productionType: 'CROSS_POST',
      wave: 1,
      dependsOnDeliverableId: 'deliv-w0-tt',
      lockStatus: 'LOCKED_BY_WAVE_0',
      assignedChannelPic: 'Phạm Thị Thu Hằng',
      allocatedWeightPct: 15,
      allocatedCostVnd: Math.max(0, totalRate - Math.round(totalRate * 0.7) - Math.round(totalRate * 0.15)),
    },
  ];
}

export const QuickBookModal: React.FC<QuickBookModalProps> = ({
  isOpen,
  onClose,
  onDealCreated,
  preselectedKoc,
  preselectedBrand,
}) => {
  const { profiles } = useBrandProfiles();

  const [selectedKocId, setSelectedKocId] = useState<string>(preselectedKoc?.id || INITIAL_KOCS[0].id);
  const [campaign, setCampaign] = useState<string>('CAMP-1010');
  const [brandName, setBrandName] = useState<string>(preselectedBrand || 'Kutieskin');
  const [productName, setProductName] = useState<string>('Kem bôi dịu da & Nước tắm thảo dược');
  const [bookingBatch, setBookingBatch] = useState<string>('Đợt 1');
  const [salaryGrade, setSalaryGrade] = useState<SalaryGrade>(preselectedKoc?.salaryGrade || INITIAL_KOCS[0].salaryGrade || 'KL4');
  const [rate, setRate] = useState<number>(preselectedKoc?.rateCardVideo || INITIAL_KOCS[0].rateCardVideo || 5000000);
  const [deadline, setDeadline] = useState<string>('2026-10-20');
  const [advanceType, setAdvanceType] = useState<'FIXED_2M' | 'PERCENT_20'>('FIXED_2M');
  const [overCeilingReason, setOverCeilingReason] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Cấu hình Booking Đa Nền Tảng
  const [dealType, setDealType] = useState<BookingDealType>('MULTI_PLATFORM_CONTENT');
  const [sourceDealCode, setSourceDealCode] = useState<string>('BO260611204');
  const [pricingDisplayMode, setPricingDisplayMode] = useState<KocPricingDisplayMode>('ITEMIZED_SOW');
  const [deliverables, setDeliverables] = useState<DealDeliverableItem[]>(() =>
    buildDefaultDeliverables(preselectedKoc?.rateCardVideo || INITIAL_KOCS[0].rateCardVideo || 5000000, 'Khánh Vy'),
  );

  // Đồng bộ khi mở modal với KOC hoặc Brand chọn sẵn
  useEffect(() => {
    if (!isOpen) return;
    const initKoc = preselectedKoc || INITIAL_KOCS.find(k => k.id === selectedKocId) || INITIAL_KOCS[0];
    if (preselectedKoc) {
      setSelectedKocId(preselectedKoc.id);
      setRate(preselectedKoc.rateCardVideo);
      if (preselectedKoc.salaryGrade) {
        setSalaryGrade(preselectedKoc.salaryGrade);
        const isSmallKoc = ['KL1', 'KL2', 'KL3'].includes(preselectedKoc.salaryGrade);
        setPricingDisplayMode(isSmallKoc ? 'PACKAGE_TOTAL' : 'ITEMIZED_SOW');
      }
      setDeliverables(buildDefaultDeliverables(preselectedKoc.rateCardVideo, preselectedKoc.bookingPic || 'Khánh Vy'));
    } else if (initKoc) {
      const isSmallKoc = ['KL1', 'KL2', 'KL3'].includes(initKoc.salaryGrade || 'KL4');
      setPricingDisplayMode(isSmallKoc ? 'PACKAGE_TOTAL' : 'ITEMIZED_SOW');
    }
    if (preselectedBrand && preselectedBrand !== 'ALL') {
      setBrandName(preselectedBrand);
    }
    setOverCeilingReason('');
    setValidationError(null);
  }, [isOpen, preselectedKoc, preselectedBrand, selectedKocId]);

  // Danh sách toàn bộ thương hiệu B2C từ Hồ sơ thương hiệu & Master
  const brandOptions = useMemo(() => {
    const names = new Set<string>();
    for (const p of profiles) names.add(p.brandName);
    for (const b of REAL_B2C_42_BRANDS) names.add(b.name);
    if (brandName) names.add(brandName);
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [profiles, brandName]);

  const activeProfile = useMemo(
    () => findBrandProfile(profiles, brandName),
    [profiles, brandName],
  );

  const brandProducts = useMemo(() => activeProfile?.products || [], [activeProfile]);
  const workflowRules = activeProfile?.workflowRules;

  const selectedProductItem = useMemo(
    () => brandProducts.find(p => p.name.trim().toLowerCase() === productName.trim().toLowerCase()) || brandProducts[0],
    [brandProducts, productName],
  );
  const isSelectedSkuOutOfStock = dealType !== 'SERVICE_ONLY' && selectedProductItem?.sampleStockStatus === 'OUT_OF_STOCK';

  const isAutoApprovedByBrandRule = useMemo(() => {
    if (!workflowRules) return false;
    if (workflowRules.kocApprovalMode === 'NONE_AUTO') return true;
    if (workflowRules.kocApprovalMode === 'KL4_PLUS_ONLY') {
      return salaryGrade === 'KL1' || salaryGrade === 'KL2' || salaryGrade === 'KL3';
    }
    return false;
  }, [workflowRules, salaryGrade]);

  const handleBrandChange = (nextBrand: string) => {
    setBrandName(nextBrand);
    const prof = findBrandProfile(profiles, nextBrand);
    if (prof && prof.products.length > 0) {
      const firstAvailable = prof.products.find(p => p.sampleStockStatus !== 'OUT_OF_STOCK') || prof.products[0];
      setProductName(firstAvailable.name);
    }
    setValidationError(null);
  };

  const handleRateChange = (nextRate: number) => {
    setRate(nextRate);
    setDeliverables(prev =>
      prev.map(d => ({
        ...d,
        allocatedCostVnd: Math.round((nextRate * d.allocatedWeightPct) / 100),
      })),
    );
    setValidationError(null);
  };

  const applyBenchmarkAllocation = () => {
    if (deliverables.length === 0) return;
    if (deliverables.length === 1) {
      setDeliverables([{ ...deliverables[0], allocatedWeightPct: 100, allocatedCostVnd: rate }]);
      return;
    }
    const wave0Weight = 70;
    const remainWeight = Math.floor(30 / (deliverables.length - 1));
    setDeliverables(
      deliverables.map((d, idx) => {
        const w = idx === 0 ? wave0Weight : idx === deliverables.length - 1 ? 100 - wave0Weight - remainWeight * (deliverables.length - 2) : remainWeight;
        return {
          ...d,
          allocatedWeightPct: w,
          allocatedCostVnd: Math.round((rate * w) / 100),
        };
      }),
    );
  };

  const ratecardCeiling = useMemo(
    () => getBrandRatecardCeiling(activeProfile, salaryGrade),
    [activeProfile, salaryGrade],
  );
  const isOverCeiling = dealType !== 'SERVICE_ONLY' && typeof ratecardCeiling === 'number' && rate > ratecardCeiling;
  const overAmount = isOverCeiling && ratecardCeiling ? rate - ratecardCeiling : 0;

  // Tổng hợp P&L theo từng Sàn Affiliate
  const affiliatePnlBreakdown = useMemo(() => {
    const map = new Map<AffiliateChannelPlatform, number>();
    const activeList = dealType === 'SINGLE_CONTENT' ? deliverables.slice(0, 1) : deliverables;
    for (const item of activeList) {
      map.set(item.affiliateChannel, (map.get(item.affiliateChannel) || 0) + item.allocatedCostVnd);
    }
    return Array.from(map.entries());
  }, [deliverables, dealType]);

  const currentKoc = useMemo(
    () => (isOpen ? INITIAL_KOCS.find(k => k.id === selectedKocId) : undefined) || preselectedKoc || INITIAL_KOCS[0],
    [isOpen, selectedKocId, preselectedKoc],
  );
  const selectableKocs = useMemo(() => {
    if (!isOpen) return [];
    const slice = INITIAL_KOCS.slice(0, 200);
    if (currentKoc && !slice.some(k => k.id === currentKoc.id)) {
      return [currentKoc, ...slice];
    }
    return slice;
  }, [isOpen, currentKoc]);
  const advanceAmount = dealType === 'SERVICE_ONLY' ? 0 : advanceType === 'FIXED_2M' ? Math.min(2000000, rate) : Math.round(rate * 0.2);
  const finalAmount = Math.max(0, rate - advanceAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSelectedSkuOutOfStock) {
      setValidationError(
        `Sản phẩm "${selectedProductItem?.name}" đang đứt hàng mẫu gửi KOC trong Hồ sơ thương hiệu ${brandName}. Vui lòng chọn SKU còn mẫu hoặc cập nhật tồn kho mẫu trước khi tạo deal.`,
      );
      return;
    }
    if (isOverCeiling && !overCeilingReason.trim()) {
      setValidationError(
        `Đơn giá đề xuất vượt trần ${salaryGrade} của nhãn ${brandName} (${formatVnd(ratecardCeiling!)}). Vui lòng hạ về mức trần hoặc nhập lý do trình Trưởng phòng B2C (Đặng Thị Yến Nhi) phê duyệt ngoại lệ.`,
      );
      return;
    }
    setValidationError(null);

    const { id, dealCode, jobId, appendixCode } = createDealIdentifiers(currentKoc.stageName);
    const masterBrand = REAL_B2C_42_BRANDS.find(b => b.name.toLowerCase() === brandName.toLowerCase());
    const bannedNote = activeProfile?.contentRules?.banned.length
      ? `Tránh ${activeProfile.contentRules.banned.length} từ cấm (${activeProfile.contentRules.banned.slice(0, 2).map(b => `"${b.phrase}"`).join(', ')}).`
      : 'Quay review thực tế sản phẩm và gắn link giỏ hàng chính hãng.';
    const ruleSummary = workflowRules
      ? ` [Luồng nhãn: ${SAMPLE_SENDER_LABEL[workflowRules.sampleSender]} (${workflowRules.samplePrepSlaHours}h) · ${
          workflowRules.requiresAdsCode ? `Cấp mã QC ${workflowRules.adsCodeDurationDays} ngày` : 'Không bắt buộc mã QC'
        } · Tự động cho phép đăng sau ${workflowRules.autoAirAfterHours}h]`
      : '';
    const baseNote = `${bannedNote}${ruleSummary}`;

    const autoPassBrandGate = !isOverCeiling && isAutoApprovedByBrandRule;

    const finalDeliverables: DealDeliverableItem[] | undefined =
      dealType === 'SERVICE_ONLY'
        ? undefined
        : dealType === 'SINGLE_CONTENT'
          ? [{ ...deliverables[0], allocatedWeightPct: 100, allocatedCostVnd: rate }]
          : deliverables;

    const finalRightsTerms: DealRightsTermItem[] =
      dealType === 'SERVICE_ONLY'
        ? [
            {
              id: `rt-${Date.now()}-ads`,
              termType: 'ADS_CODE',
              termLabel: `Gia hạn mã Spark Ads 30 ngày (từ deal ${sourceDealCode})`,
              scopeType: 'ASSET',
              anchorType: 'ACCEPTANCE_DATE',
              durationDays: 30,
              allocatedWeightPct: 100,
              allocatedCostVnd: rate,
              status: 'ACTIVE',
            },
          ]
        : [
            {
              id: `rt-${Date.now()}-ads`,
              termType: 'ADS_CODE',
              termLabel: `Cấp mã Spark Ads ${workflowRules?.adsCodeDurationDays || 60} ngày`,
              scopeType: 'ASSET',
              targetDeliverableId: finalDeliverables?.[0]?.id,
              anchorType: 'ACCEPTANCE_DATE',
              durationDays: workflowRules?.adsCodeDurationDays || 60,
              status: 'PENDING_ANCHOR',
            },
            ...(workflowRules?.exclusivityDays
              ? [
                  {
                    id: `rt-${Date.now()}-excl`,
                    termType: 'EXCLUSIVITY' as const,
                    termLabel: `Độc quyền ngành hàng ${workflowRules.exclusivityDays} ngày`,
                    scopeType: 'DEAL' as const,
                    anchorType: 'AIR_DATE' as const,
                    durationDays: workflowRules.exclusivityDays,
                    status: 'PENDING_ANCHOR' as const,
                  },
                ]
              : []),
          ];

    const newDeal: BookingDealItem = {
      id,
      dealCode,
      jobId,
      campaignCode: campaign,
      campaignTitle:
        dealType === 'SERVICE_ONLY'
          ? `Mua thêm dịch vụ từ Deal ${sourceDealCode} — ${brandName}`
          : campaign === 'CAMP-1010'
            ? 'Chiến dịch 10.10 — Chăm sóc da'
            : 'Chiến dịch Thu Đông — Dược mỹ phẩm',
      brandName,
      storeName: masterBrand?.stores?.[0]?.storeName || `${brandName.replace(/\s+/g, '')}_TikTok_E2E-C`,
      productName: productName.trim() || 'Sản phẩm chủ lực chiến dịch',
      bookingBatch,
      bookingFormat: 'Booking Video KOC',
      kocId: currentKoc.id,
      kocStageName: currentKoc.stageName,
      kocChannelId: currentKoc.channelId,
      kocTier: currentKoc.tier,
      salaryGrade,
      segment: currentKoc.segment || 'Mid Creator',
      tepKenh: currentKoc.tepKenh || currentKoc.creatorCategory || 'Review Nữ',
      creatorCategory: currentKoc.tepKenh || currentKoc.creatorCategory || 'Review Nữ',
      kocCategory: currentKoc.kocCategory || 'Personal care',
      contentPillar: (activeProfile?.positioning?.contentPillars?.[0] as BookingDealItem['contentPillar']) || 'Review trực tiếp',

      brandApprovalStatus: autoPassBrandGate ? 'ĐÃ_DUYỆT' : 'CHỜ_DUYỆT',
      kocResponseStatus: 'ĐỒNG_Ý',

      pipelineText:
        dealType === 'SERVICE_ONLY'
          ? 'Nghiệm thu Ads'
          : isOverCeiling
            ? 'Chờ Trưởng phòng B2C duyệt vượt định mức'
            : autoPassBrandGate
              ? workflowRules?.requireScriptApproval
                ? 'Đã chốt KOC (tự chủ theo hồ sơ nhãn) — Chờ kịch bản'
                : 'Đã chốt KOC — Chuyển xuất kho gửi mẫu'
              : `Chờ nhãn hàng (${workflowRules?.brandApproverName || brandName}) duyệt KOC`,
      status: dealType === 'SERVICE_ONLY' ? 'VIDEO_VERIFIED' : 'SCRIPT_PENDING',
      statusLabel:
        dealType === 'SERVICE_ONLY'
          ? `Mua thêm dịch vụ từ ${sourceDealCode}`
          : isOverCeiling
            ? `Vượt trần ${salaryGrade} (+${formatVnd(overAmount)}) — Chờ Đặng Thị Yến Nhi duyệt`
            : autoPassBrandGate
              ? `Tự chủ chốt ${salaryGrade} (theo quy tắc ${brandName}) — Chuyển làm kịch bản`
              : `Chờ ${workflowRules?.brandApproverName || 'nhãn hàng'} duyệt danh sách KOC`,
      sampleStatus: dealType === 'SERVICE_ONLY' ? 'ĐÃ_NHẬN' : 'CHƯA_GỬI',
      adsCodeStatus: 'CHƯA_CẤP',

      assignedStaff: masterBrand?.brandPicName || 'Lê Phương Thảo',
      bookingPic: masterBrand?.brandPicName || 'Lê Phương Thảo',
      growthPic: masterBrand?.growthPic || 'Nguyễn Văn Tú',
      accountPic: masterBrand?.accountPic || 'Đặng Thị Yến Nhi',
      contentNote: isOverCeiling
        ? `[VƯỢT TRẦN ${salaryGrade}: Đề xuất ${formatVnd(rate)} / Trần ${formatVnd(ratecardCeiling!)} — Lý do: ${overCeilingReason.trim()}] ${baseNote}`
        : baseNote,

      totalValue: rate,
      advanceAmount,
      finalAmount,
      deadlinePost: deadline,
      viewsCount: 0,
      affiliateGmv: 0,
      gmv30: 0,
      roi: 0,
      publishedDays: 0,
      hasGmv: false,
      isBreakEven: false,
      isWinnerTop20: currentKoc.isWinnerTop20 || false,
      remainingSlaHours: workflowRules?.samplePrepSlaHours || 24.0,
      isSlaWarning: false,

      dealType,
      sourceDealCode: dealType === 'SERVICE_ONLY' ? sourceDealCode : undefined,
      pricingDisplayMode,
      contractAppendixCode: appendixCode,
      deliverables: finalDeliverables,
      rightsTerms: finalRightsTerms,
    };

    onDealCreated(newDeal);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="lg"
      title="Tạo booking deal mới"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="primary" icon={Zap} onClick={handleSubmit} className="max-w-full truncate">
            <span className="truncate">
              {isOverCeiling
                ? 'Tạo deal & trình duyệt vượt trần'
                : dealType === 'SERVICE_ONLY'
                  ? 'Tạo deal mua thêm dịch vụ'
                  : isAutoApprovedByBrandRule
                    ? `Chốt thẳng ${salaryGrade} & chuyển làm kịch bản`
                    : `Tạo deal & trình ${workflowRules?.brandApproverName || 'nhãn hàng'} duyệt`}
            </span>
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Chọn cấu trúc Deal: Đa nền tảng / Đơn kênh / Mua lẻ dịch vụ từ video cũ */}
        <div>
          <label className="block text-xs font-semibold text-ink-2 mb-1.5">
            Loại hình Booking Deal
          </label>
          <Segmented
            value={dealType}
            onChange={(v) => setDealType(v as BookingDealType)}
            items={[
              { key: 'MULTI_PLATFORM_CONTENT', label: 'Sản xuất đa nền tảng (Wave 0 → Wave 1)' },
              { key: 'SINGLE_CONTENT', label: 'Sản xuất đơn kênh' },
              { key: 'SERVICE_ONLY', label: 'Mua thêm dịch vụ từ video cũ' },
            ]}
          />
        </div>

        {dealType === 'SERVICE_ONLY' && (
          <div className="p-3 rounded-lg bg-info-soft border border-info-line flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-ink-2 font-medium">
              Tham chiếu mã Deal / Video gốc (bỏ qua bước gửi mẫu &amp; duyệt kịch bản):
            </span>
            <input
              type="text"
              value={sourceDealCode}
              onChange={(e) => setSourceDealCode(e.target.value)}
              placeholder="VD: BO260611204"
              className="bg-surface border border-line-strong rounded px-2.5 py-1 text-xs font-mono font-semibold text-ink w-44"
            />
          </div>
        )}

        {/* Field 1: Campaign & Brand */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="qb-campaign" className="block text-xs font-semibold text-ink-2 mb-1.5">
              Chiến dịch áp dụng
            </label>
            <select
              id="qb-campaign"
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition"
            >
              <option value="CAMP-1010">Chiến dịch 10.10 — Chăm sóc da</option>
              <option value="CAMP-GLOW">Chiến dịch Thu Đông — Dược mỹ phẩm</option>
            </select>
          </div>

          <div>
            <label htmlFor="qb-brand" className="block text-xs font-semibold text-ink-2 mb-1.5">
              Thương hiệu B2C ({brandOptions.length} nhãn)
            </label>
            <select
              id="qb-brand"
              value={brandName}
              onChange={(e) => handleBrandChange(e.target.value)}
              className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-primary font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition"
            >
              {brandOptions.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Bảng Quy tắc vận hành thương hiệu áp dụng cho deal đang tạo */}
        {workflowRules && (
          <div className="p-3 rounded-lg bg-canvas border border-line space-y-1.5 text-2xs">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <span className="font-semibold text-ink">
                Quy tắc vận hành {brandName}: {PROJECT_TIER_LABEL[workflowRules.projectTier]}
              </span>
              <span className="text-ink-3">
                {OPERATING_MODEL_LABEL[workflowRules.operatingModel]}
              </span>
            </div>
            <div className="grid sm:grid-cols-2 gap-1 text-ink-2">
              <span>
                • <strong>Cổng duyệt KOC ({salaryGrade}):</strong>{' '}
                {isAutoApprovedByBrandRule ? (
                  <strong className="text-emerald-700">Được chốt thẳng (không cần chờ nhãn duyệt)</strong>
                ) : (
                  <strong className="text-amber-700">Trình {workflowRules.brandApproverName || 'nhãn hàng'} duyệt</strong>
                )}
              </span>
              <span>
                • <strong>Gửi mẫu:</strong> {SAMPLE_SENDER_LABEL[workflowRules.sampleSender]} (SLA {workflowRules.samplePrepSlaHours}h)
              </span>
              <span>
                • <strong>Bản quyền:</strong>{' '}
                {workflowRules.requiresAdsCode ? `Cấp mã QC ${workflowRules.adsCodeDurationDays} ngày (từ ngày nghiệm thu)` : 'Không bắt buộc mã QC'}
                {workflowRules.exclusivityDays > 0 ? ` · Độc quyền ${workflowRules.exclusivityDays} ngày (từ ngày đăng)` : ''}
              </span>
              <span>
                • <strong>Duyệt kịch bản:</strong>{' '}
                {workflowRules.requireScriptApproval ? `Bắt buộc (tự động cho đăng sau ${workflowRules.autoAirAfterHours}h)` : 'Không bắt buộc'}
              </span>
            </div>
          </div>
        )}

        {/* Field 2: Product & Batch */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="qb-product" className="block text-xs font-semibold text-ink-2">
                Sản phẩm chủ lực (SKU)
              </label>
              {brandProducts.length > 0 && (
                <span className="text-2xs text-ink-3">
                  {brandProducts.length} SKU trong hồ sơ nhãn
                </span>
              )}
            </div>
            <input
              id="qb-product"
              type="text"
              placeholder="VD: Kem bôi dịu da & Nước tắm thảo dược"
              value={productName}
              onChange={(e) => {
                setProductName(e.target.value);
                setValidationError(null);
              }}
              className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
            />
            {brandProducts.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {brandProducts.slice(0, 4).map(prod => {
                  const isOut = prod.sampleStockStatus === 'OUT_OF_STOCK';
                  const stockLabel = prod.sampleStockStatus ? SAMPLE_STOCK_LABEL[prod.sampleStockStatus].label : 'Còn mẫu';
                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => {
                        setProductName(prod.name);
                        setValidationError(null);
                      }}
                      className={`px-2 py-0.5 rounded text-2xs border transition truncate max-w-[260px] ${
                        productName === prod.name
                          ? isOut
                            ? 'bg-rose-50 text-rose-700 border-rose-400 font-semibold'
                            : 'bg-accent-soft text-accent border-accent font-semibold'
                          : isOut
                            ? 'bg-rose-50/50 text-rose-700 border-rose-200'
                            : 'bg-sunken text-ink-2 border-line hover:text-ink'
                      }`}
                      title={`${prod.name} — ${stockLabel}${prod.commissionOrganicPct ? ` — HH tự nhiên ${prod.commissionOrganicPct}%` : ''}`}
                    >
                      {prod.name} ({isOut ? 'Đứt hàng mẫu' : `HH ${prod.commissionOrganicPct ?? 10}%`})
                    </button>
                  );
                })}
              </div>
            )}
            {selectedProductItem && (
              <p className={`text-2xs mt-1 ${isSelectedSkuOutOfStock ? 'text-rose-700 font-medium' : 'text-ink-3'}`}>
                {isSelectedSkuOutOfStock ? (
                  <>Cảnh báo: SKU này đang đứt hàng mẫu gửi KOC trong hồ sơ nhãn — không thể tạo lệnh gửi mẫu.</>
                ) : (
                  <>
                    Giá deal: <strong>{formatVnd(selectedProductItem.dealPriceVnd || selectedProductItem.priceVnd || 0)}</strong>
                    {' · '}Hoa hồng: <strong>{selectedProductItem.commissionOrganicPct ?? 10}% tự nhiên</strong>
                    {selectedProductItem.commissionAdsPct ? ` / ${selectedProductItem.commissionAdsPct}% quảng cáo` : ''}
                    {' · '}{selectedProductItem.sampleReturnRule ? SAMPLE_RETURN_LABEL[selectedProductItem.sampleReturnRule] : 'Tặng luôn KOC'}
                  </>
                )}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="qb-batch" className="block text-xs font-semibold text-ink-2 mb-1">
              Đợt Booking
            </label>
            <select
              id="qb-batch"
              value={bookingBatch}
              onChange={(e) => setBookingBatch(e.target.value)}
              className="w-full bg-surface border border-line-strong rounded-lg px-2.5 py-2 text-xs text-ink font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
            >
              <option value="Đợt 1">Đợt 1 (Hạn ngày 10)</option>
              <option value="Đợt 2">Đợt 2 (Hạn ngày 20)</option>
              <option value="Đợt 3">Đợt 3 (Hạn ngày 30)</option>
            </select>
          </div>
        </div>

        {/* Field 3: KOC Selector & Salary Grade */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="sm:col-span-3">
            <label htmlFor="qb-koc" className="block text-xs font-semibold text-ink-2 mb-1.5">
              Chọn KOC (từ danh bạ Index)
            </label>
            <select
              id="qb-koc"
              value={selectedKocId}
              onChange={(e) => {
                setSelectedKocId(e.target.value);
                const k = INITIAL_KOCS.find(item => item.id === e.target.value);
                if (k) {
                  handleRateChange(k.rateCardVideo);
                  if (k.salaryGrade) {
                    setSalaryGrade(k.salaryGrade);
                    setPricingDisplayMode(['KL1', 'KL2', 'KL3'].includes(k.salaryGrade) ? 'PACKAGE_TOTAL' : 'ITEMIZED_SOW');
                  }
                }
                setValidationError(null);
              }}
              className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition"
            >
              {selectableKocs.map(koc => (
                <option key={koc.id} value={koc.id}>
                  {koc.stageName} ({koc.salaryGrade || koc.tierLabel}) — Rate: {formatVnd(koc.rateCardVideo)} • Follow: {formatNumber(koc.followers)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="qb-grade" className="block text-xs font-semibold text-ink-2 mb-1.5">
              Khung lương
            </label>
            <select
              id="qb-grade"
              value={salaryGrade}
              onChange={(e) => {
                const nextGrade = e.target.value as SalaryGrade;
                setSalaryGrade(nextGrade);
                setPricingDisplayMode(['KL1', 'KL2', 'KL3'].includes(nextGrade) ? 'PACKAGE_TOTAL' : 'ITEMIZED_SOW');
                setValidationError(null);
              }}
              className="w-full bg-surface border border-line-strong rounded-lg px-2.5 py-2 text-xs font-mono font-semibold text-ink focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
            >
              {SALARY_GRADES.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>

        {currentKoc && (
          <div className="p-2.5 bg-info-soft border border-info-line rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs text-info">
            <span>CCCD: <strong className="font-mono text-ink">{maskLast4(currentKoc.cccd)}</strong></span>
            <span><strong>{currentKoc.bankName}</strong>: <span className="font-mono text-ink">{maskLast4(currentKoc.bankAccount)}</span></span>
            <span className="text-positive font-semibold">Uy tín {currentKoc.reliabilityScore}/10</span>
          </div>
        )}

        {/* Cấu hình Hạng mục đa nền tảng (Media Channel vs Affiliate Channel, Wave 0/1, Multi-PIC & P&L Allocation) */}
        {dealType === 'MULTI_PLATFORM_CONTENT' && (
          <div className="p-3.5 rounded-lg bg-canvas border border-line space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-ink">
                  Hạng mục bàn giao đa kênh &amp; Phân bổ P&amp;L theo sàn
                </span>
                <button
                  type="button"
                  onClick={applyBenchmarkAllocation}
                  className="px-2 py-0.5 rounded bg-accent-soft text-accent border border-accent/30 text-2xs font-semibold hover:bg-accent/15 transition"
                >
                  Áp tỷ lệ chuẩn (70/15/15)
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-2xs">
                <span className="text-ink-3">Hiển thị báo giá KOC:</span>
                <button
                  type="button"
                  onClick={() => setPricingDisplayMode(pricingDisplayMode === 'PACKAGE_TOTAL' ? 'ITEMIZED_SOW' : 'PACKAGE_TOTAL')}
                  className="px-2 py-0.5 rounded border border-line-strong bg-surface font-semibold text-ink"
                >
                  {pricingDisplayMode === 'PACKAGE_TOTAL' ? 'Trọn gói (Ẩn giá lẻ cho KL1-KL3)' : 'Bóc tách từng hạng mục (KL4-KL7)'}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {deliverables.map((deliv, idx) => (
                <div key={deliv.id} className="p-2.5 rounded-lg bg-surface border border-line grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs">
                  <div className="sm:col-span-3 flex items-center gap-1.5">
                    {deliv.wave === 0 ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-2xs font-semibold shrink-0">
                        <Unlock className="w-3 h-3" />
                        Wave 0
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-2xs font-semibold shrink-0" title="Tự động mở khóa sau khi nghiệm thu bài gốc Wave 0">
                        <Lock className="w-3 h-3" />
                        Wave 1
                      </span>
                    )}
                    <span className="font-medium text-ink truncate" title={deliv.title}>{deliv.title}</span>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-2xs text-ink-3">Kênh đăng (Media)</label>
                    <select
                      value={deliv.mediaChannel}
                      onChange={(e) => {
                        const nextMedia = e.target.value as MediaChannelPlatform;
                        setDeliverables(prev => prev.map((item, i) => (i === idx ? { ...item, mediaChannel: nextMedia } : item)));
                      }}
                      className="w-full bg-sunken border border-line rounded px-1.5 py-1 text-2xs font-medium text-ink"
                    >
                      {MEDIA_CHANNELS.map(ch => <option key={ch} value={ch}>{ch}</option>)}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-2xs text-ink-3">Sàn gắn link (P&amp;L)</label>
                    <select
                      value={deliv.affiliateChannel}
                      onChange={(e) => {
                        const nextAff = e.target.value as AffiliateChannelPlatform;
                        setDeliverables(prev => prev.map((item, i) => (i === idx ? { ...item, affiliateChannel: nextAff } : item)));
                      }}
                      className="w-full bg-sunken border border-line rounded px-1.5 py-1 text-2xs font-semibold text-primary"
                    >
                      {AFFILIATE_CHANNELS.map(ch => <option key={ch} value={ch}>{ch}</option>)}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-2xs text-ink-3">PIC phụ trách sàn</label>
                    <select
                      value={deliv.assignedChannelPic}
                      onChange={(e) => {
                        const nextPic = e.target.value;
                        setDeliverables(prev => prev.map((item, i) => (i === idx ? { ...item, assignedChannelPic: nextPic } : item)));
                      }}
                      className="w-full bg-sunken border border-line rounded px-1.5 py-1 text-2xs text-ink"
                    >
                      {CHANNEL_PICS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>

                  <div className="sm:col-span-2 text-right">
                    <label className="block text-2xs text-ink-3">P&amp;L ({deliv.allocatedWeightPct}%)</label>
                    <span className="font-mono font-semibold text-2xs text-ink tabular-nums">
                      {formatVnd(deliv.allocatedCostVnd)}
                    </span>
                  </div>

                  <div className="sm:col-span-1 flex justify-end">
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => setDeliverables(prev => prev.filter((_, i) => i !== idx))}
                        className="p-1 text-ink-3 hover:text-rose-600 rounded"
                        title="Xóa hạng mục"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-2xs">
              <button
                type="button"
                onClick={() => {
                  const newItem: DealDeliverableItem = {
                    id: `deliv-w1-${Date.now()}`,
                    title: 'Đăng chéo đa kênh (Wave 1)',
                    mediaChannel: 'Instagram',
                    affiliateChannel: 'Shopee',
                    productionType: 'CROSS_POST',
                    wave: 1,
                    dependsOnDeliverableId: deliverables[0]?.id,
                    lockStatus: 'LOCKED_BY_WAVE_0',
                    assignedChannelPic: 'Phạm Thị Thu Hằng',
                    allocatedWeightPct: 10,
                    allocatedCostVnd: Math.round(rate * 0.1),
                  };
                  setDeliverables(prev => [...prev, newItem]);
                }}
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm hạng mục đăng chéo (Wave 1)
              </button>

              <div className="flex flex-wrap items-center gap-2 text-ink-2">
                <span>Hạch toán P&amp;L theo sàn:</span>
                {affiliatePnlBreakdown.map(([aff, cost]) => (
                  <span key={aff} className="px-2 py-0.5 rounded bg-surface border border-line font-mono font-semibold text-ink">
                    {aff}: {formatVnd(cost)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Field 4: Deal Value, Ratecard Ceiling Enforcement & Auto-Split Advance */}
        <div className={`p-3.5 rounded-lg border space-y-2.5 ${
          isOverCeiling ? 'bg-rose-50/70 border-rose-300' : 'bg-sunken border-line'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <label className="block text-xs font-semibold text-ink">
                Giá deal &amp; kiểm soát trần thù lao ({salaryGrade})
              </label>
              {typeof ratecardCeiling === 'number' ? (
                <span className="text-2xs text-ink-2">
                  Trần định mức {salaryGrade} của <strong>{brandName}</strong>:{' '}
                  <strong className="font-mono text-ink">{formatVnd(ratecardCeiling)}</strong>
                </span>
              ) : (
                <span className="text-2xs text-ink-3">Nhãn hàng chưa giới hạn trần cứng cho bậc {salaryGrade}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setAdvanceType('FIXED_2M')}
                className={`px-2 py-1 rounded text-xs font-semibold transition ${advanceType === 'FIXED_2M' ? 'bg-primary text-primary-fg' : 'bg-surface text-ink-2 border border-line-strong'}`}
              >
                Cố định 2 Tr
              </button>
              <button
                type="button"
                onClick={() => setAdvanceType('PERCENT_20')}
                className={`px-2 py-1 rounded text-xs font-semibold transition ${advanceType === 'PERCENT_20' ? 'bg-primary text-primary-fg' : 'bg-surface text-ink-2 border border-line-strong'}`}
              >
                Tỷ lệ 20%
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <div>
              <span className="text-xs text-ink-2 font-medium block mb-1">Tổng deal (VNĐ)</span>
              <input
                type="number"
                value={rate}
                step={500000}
                onChange={(e) => handleRateChange(Number(e.target.value))}
                className={`w-full bg-surface border rounded-lg px-2.5 py-1.5 text-xs font-semibold font-mono tabular-nums focus:outline-none ${
                  isOverCeiling
                    ? 'border-rose-500 text-rose-700 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-line-strong text-ink focus:ring-2 focus:ring-primary/20 focus:border-primary'
                }`}
              />
            </div>
            <div>
              <span className="text-xs text-success font-medium block mb-1">Đợt 1 (tạm ứng)</span>
              <input
                type="text"
                value={formatVnd(advanceAmount)}
                readOnly
                className="w-full bg-success-soft border border-success-line rounded-lg px-2.5 py-1.5 text-xs text-success font-semibold font-mono tabular-nums"
              />
            </div>
            <div>
              <span className="text-xs text-info font-medium block mb-1">Đợt 2 (quyết toán)</span>
              <input
                type="text"
                value={formatVnd(finalAmount)}
                readOnly
                className="w-full bg-info-soft border border-info-line rounded-lg px-2.5 py-1.5 text-xs text-info font-semibold font-mono tabular-nums"
              />
            </div>
          </div>

          {typeof ratecardCeiling === 'number' && !isOverCeiling && (
            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-emerald-50 border border-emerald-200 text-2xs text-emerald-800">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Nằm trong trần thù lao {salaryGrade} theo Hồ sơ thương hiệu {brandName}
              </span>
              <span className="font-mono font-semibold">
                Còn dư {formatVnd(ratecardCeiling - rate)}
              </span>
            </div>
          )}

          {isOverCeiling && ratecardCeiling && (
            <div className="p-2.5 rounded-lg bg-white border border-rose-300 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  Vượt trần {salaryGrade} của nhãn {brandName}: +{formatVnd(overAmount)}
                </span>
                <button
                  type="button"
                  onClick={() => handleRateChange(ratecardCeiling)}
                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-2xs font-semibold transition"
                >
                  Áp mức trần chuẩn ({formatVnd(ratecardCeiling)})
                </button>
              </div>
              <div>
                <label className="block text-2xs font-semibold text-slate-700 mb-1">
                  Lý do trình Trưởng phòng B2C (Đặng Thị Yến Nhi) duyệt ngoại lệ vượt trần *
                </label>
                <input
                  type="text"
                  value={overCeilingReason}
                  onChange={(e) => {
                    setOverCeilingReason(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder="VD: KOC cam kết độc quyền ngành hàng 30 ngày + tặng thêm 1 phiên gắn giỏ..."
                  className="w-full bg-white border border-rose-300 rounded px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Field 5: Post Deadline */}
        <div>
          <label htmlFor="qb-deadline" className="block text-xs font-semibold text-ink-2 mb-1.5">
            Hạn chót nghiệm thu video lên sóng
          </label>
          <input
            id="qb-deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
            required
          />
        </div>

        {validationError && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{validationError}</span>
          </div>
        )}
      </form>
    </Modal>
  );
};
