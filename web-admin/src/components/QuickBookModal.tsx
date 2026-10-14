'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Presence } from './ui';
import { AlertTriangle, CheckCircle2, ShieldAlert, X, Zap } from 'lucide-react';
import { KocItem, BookingDealItem, SalaryGrade } from '../lib/types';
import { INITIAL_KOCS } from '../lib/mockData';
import { REAL_B2C_42_BRANDS } from '../lib/realB2cBrandsData';
import { formatVnd, formatNumber } from '../lib/format';
import { findBrandProfile, getBrandRatecardCeiling, useBrandProfiles } from '../lib/brands/useBrandProfiles';
import {
  KOC_APPROVAL_MODE_LABEL,
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

function createDealIdentifiers(stageName: string) {
  const cleanName = stageName.toUpperCase().replace(/\s+/g, '');
  const now = Date.now();
  const suffix4 = String(1000 + (now % 9000));
  const suffix8 = String(10000000 + (now % 90000000));
  return {
    id: `deal-${now}`,
    dealCode: `BO26_${cleanName}_${suffix4}`,
    jobId: `ID26${suffix8}`,
  };
}

function maskLast4(value?: string | null): string {
  if (!value) return '—';
  const clean = String(value).trim();
  if (clean.length <= 4) return clean;
  return `•••• ${clean.slice(-4)}`;
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

  // Đồng bộ khi mở modal với KOC hoặc Brand chọn sẵn
  useEffect(() => {
    if (!isOpen) return;
    if (preselectedKoc) {
      setSelectedKocId(preselectedKoc.id);
      setRate(preselectedKoc.rateCardVideo);
      if (preselectedKoc.salaryGrade) setSalaryGrade(preselectedKoc.salaryGrade);
    }
    if (preselectedBrand && preselectedBrand !== 'ALL') {
      setBrandName(preselectedBrand);
    }
    setOverCeilingReason('');
    setValidationError(null);
  }, [isOpen, preselectedKoc, preselectedBrand]);

  // Danh sách toàn bộ thương hiệu B2C từ Hồ sơ thương hiệu & Master
  const brandOptions = useMemo(() => {
    const names = new Set<string>();
    for (const p of profiles) names.add(p.brandName);
    for (const b of REAL_B2C_42_BRANDS) names.add(b.name);
    if (brandName) names.add(brandName);
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [profiles, brandName]);

  // Hồ sơ thương hiệu đang chọn
  const activeProfile = useMemo(
    () => findBrandProfile(profiles, brandName),
    [profiles, brandName],
  );

  // Tự động gợi ý SKU chủ lực khi đổi nhãn hàng
  const brandProducts = useMemo(() => activeProfile?.products || [], [activeProfile]);
  const workflowRules = activeProfile?.workflowRules;

  const selectedProductItem = useMemo(
    () => brandProducts.find(p => p.name.trim().toLowerCase() === productName.trim().toLowerCase()) || brandProducts[0],
    [brandProducts, productName],
  );
  const isSelectedSkuOutOfStock = selectedProductItem?.sampleStockStatus === 'OUT_OF_STOCK';

  // Kiểm tra cổng duyệt KOC từ Quy tắc vận hành thương hiệu (workflowRules)
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

  // Kiểm tra trần thù lao Ratecard KL1-KL7 từ Hồ sơ thương hiệu
  const ratecardCeiling = useMemo(
    () => getBrandRatecardCeiling(activeProfile, salaryGrade),
    [activeProfile, salaryGrade],
  );
  const isOverCeiling = typeof ratecardCeiling === 'number' && rate > ratecardCeiling;
  const overAmount = isOverCeiling && ratecardCeiling ? rate - ratecardCeiling : 0;

  // Keyboard accessibility: ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return <Presence show={false} />;

  const currentKoc = INITIAL_KOCS.find(k => k.id === selectedKocId) || preselectedKoc || INITIAL_KOCS[0];
  const advanceAmount = advanceType === 'FIXED_2M' ? Math.min(2000000, rate) : Math.round(rate * 0.2);
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

    const { id, dealCode, jobId } = createDealIdentifiers(currentKoc.stageName);
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

    const newDeal: BookingDealItem = {
      id,
      dealCode,
      jobId,
      campaignCode: campaign,
      campaignTitle: campaign === 'CAMP-1010' ? 'Chiến dịch 10.10 — Chăm sóc da' : 'Chiến dịch Thu Đông — Dược mỹ phẩm',
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

      pipelineText: isOverCeiling
        ? 'Chờ Trưởng phòng B2C duyệt vượt định mức'
        : autoPassBrandGate
          ? workflowRules?.requireScriptApproval
            ? 'Đã chốt KOC (tự chủ theo hồ sơ nhãn) — Chờ kịch bản'
            : 'Đã chốt KOC — Chuyển xuất kho gửi mẫu'
          : `Chờ nhãn hàng (${workflowRules?.brandApproverName || brandName}) duyệt KOC`,
      status: 'SCRIPT_PENDING',
      statusLabel: isOverCeiling
        ? `Vượt trần ${salaryGrade} (+${formatVnd(overAmount)}) — Chờ Đặng Thị Yến Nhi duyệt`
        : autoPassBrandGate
          ? `Tự chủ chốt ${salaryGrade} (theo quy tắc ${brandName}) — Chuyển làm kịch bản`
          : `Chờ ${workflowRules?.brandApproverName || 'nhãn hàng'} duyệt danh sách KOC`,
      sampleStatus: 'CHƯA_GỬI',
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
    };

    onDealCreated(newDeal);
    onClose();
  };

  return (
    <Presence show>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 animate-in fade-in duration-(--motion-base)"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-book-title"
      >
        <div data-motion-panel className="bg-surface border border-line rounded-xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-sunken">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-info-soft border border-info-line text-primary flex items-center justify-center font-semibold">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 id="quick-book-title" className="text-sm font-semibold text-ink">
                  Tạo booking deal mới
                </h3>
                <p className="text-xs text-muted">
                  Lập đề xuất booking KOC theo định mức thương hiệu
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-hover transition"
              aria-label="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
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
                    {workflowRules.requiresAdsCode ? `Cấp mã QC ${workflowRules.adsCodeDurationDays} ngày` : 'Không bắt buộc mã QC'}
                    {workflowRules.exclusivityDays > 0 ? ` · Độc quyền ${workflowRules.exclusivityDays} ngày` : ''}
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
                      setRate(k.rateCardVideo);
                      if (k.salaryGrade) setSalaryGrade(k.salaryGrade);
                    }
                    setValidationError(null);
                  }}
                  className="w-full bg-surface border border-line-strong rounded-lg px-3 py-2 text-xs text-ink font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition"
                >
                  {INITIAL_KOCS.map(koc => (
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
                    setSalaryGrade(e.target.value as SalaryGrade);
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

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <span className="text-xs text-ink-2 font-medium block mb-1">Tổng deal (VNĐ)</span>
                  <input
                    type="number"
                    value={rate}
                    step={500000}
                    onChange={(e) => {
                      setRate(Number(e.target.value));
                      setValidationError(null);
                    }}
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

              {/* Trạng thái đối chiếu Ratecard từ Hồ sơ thương hiệu */}
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
                      onClick={() => {
                        setRate(ratecardCeiling);
                        setValidationError(null);
                      }}
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

            {/* Action Button */}
            <div className="pt-1">
              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover text-primary-fg font-semibold py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-2 text-xs"
              >
                <Zap className="w-4 h-4" />
                <span>
                  {isOverCeiling
                    ? 'Tạo deal & gửi Trưởng phòng B2C duyệt vượt trần'
                    : isAutoApprovedByBrandRule
                      ? `Chốt thẳng ${salaryGrade} (theo quy tắc ${brandName}) & chuyển làm kịch bản`
                      : `Tạo deal & trình ${workflowRules?.brandApproverName || 'nhãn hàng'} duyệt KOC`}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Presence>
  );
};
