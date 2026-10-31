'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from './ui';
import { Send, Calendar, Layers, Palette, Sparkles, CheckCircle2 } from 'lucide-react';
import {
  CampaignItem,
  CampaignMonthlyPhase,
  CampaignKeyVisualSpec,
  getCoveredMonthsFromRange,
} from '../lib/types';
import { REAL_B2C_42_BRANDS } from '../lib/realB2cBrandsData';
import { formatVndShort } from '../lib/format';

interface CampaignCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCampaignCreated: (campaign: CampaignItem) => void;
  initialCampaign?: CampaignItem | null;
  defaultBrand?: string;
}

export const CampaignCreateModal: React.FC<CampaignCreateModalProps> = ({
  isOpen,
  onClose,
  onCampaignCreated,
  initialCampaign = null,
  defaultBrand,
}) => {
  const isEditMode = !!initialCampaign;
  const [activeTab, setActiveTab] = useState<'OVERVIEW_PHASES' | 'STRATEGY_PROMO' | 'KEY_VISUAL'>('OVERVIEW_PHASES');

  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [brand, setBrand] = useState(defaultBrand || 'Senka');
  const [status, setStatus] = useState<'ACTIVE' | 'UPCOMING' | 'COMPLETED'>('ACTIVE');
  const [targetAudience, setTargetAudience] = useState('');
  const [bigIdea, setBigIdea] = useState('');
  const [keyMessage, setKeyMessage] = useState('');
  const [heroSkusInput, setHeroSkusInput] = useState('');
  const [targetCir, setTargetCir] = useState(16.0);
  const [contentPic, setContentPic] = useState('Quỳnh Như');
  const [brandStrategyPic, setBrandStrategyPic] = useState('Nguyễn Thị Thu Hà');
  const [kvPic, setKvPic] = useState('Nguyễn Thị Ngọc Tâm');
  const [budget, setBudget] = useState(150000000);
  const [targetGmv, setTargetGmv] = useState(1000000000);
  const [targetKocCount, setTargetKocCount] = useState(25);
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-31');

  // Strategic fields (Section 01 Template 1 Sheet)
  const [roleInYearPlan, setRoleInYearPlan] = useState('');
  const [objectivesAndBarriers, setObjectivesAndBarriers] = useState('');
  const [seasonalOpportunity, setSeasonalOpportunity] = useState('');
  const [comboPromoOffer, setComboPromoOffer] = useState('');
  const [saleMilestones, setSaleMilestones] = useState('W1: Warm-up | W2: Mega Sale 10.10 | W3: 20.10 | W4: Payday 25.10');

  // Key Visual Spec fields (Section 03 Template 1 Sheet)
  const [kvTheme, setKvTheme] = useState('');
  const [kvFonts, setKvFonts] = useState('Montserrat Bold / Inter Regular');
  const [kvMoodboard, setKvMoodboard] = useState('');
  const [kvProposalUrl, setKvProposalUrl] = useState('');
  const [kvPromoText, setKvPromoText] = useState('');
  const [kvRefDate, setKvRefDate] = useState('2026-09-20');
  const [kvOrderDate, setKvOrderDate] = useState('2026-09-23');
  const [kvHangDate, setKvHangDate] = useState('2026-09-30');

  // Monthly phases
  const [monthlyPhases, setMonthlyPhases] = useState<CampaignMonthlyPhase[]>([]);

  const coveredMonths = useMemo(
    () => getCoveredMonthsFromRange(startDate, endDate),
    [startDate, endDate]
  );

  const buildSyncedPhases = (
    months: string[],
    prevPhases: CampaignMonthlyPhase[],
    totalBudget: number,
    totalGmv: number,
    totalKoc: number
  ): CampaignMonthlyPhase[] => {
    if (months.length === 0) return prevPhases;
    const count = months.length;
    return months.map((m, idx) => {
      const existing = prevPhases.find(p => p.month === m);
      if (existing) return existing;
      const defaultPhaseLabels =
        count === 1
          ? [`Chiến dịch trọn gói Tháng ${m.split('/')[1]}`]
          : count === 2
            ? ['Giai đoạn 1: Teasing & Khởi động', 'Giai đoạn 2: Booming Mega Sale & Chốt đơn']
            : [
                'Giai đoạn 1: Khởi động & Seeding',
                'Giai đoạn 2: Bùng nổ Mega Sale (Booming)',
                'Giai đoạn 3: Duy trì & Tối ưu mua lặp lại (Sustain)',
              ];
      const share = 1 / count;
      return {
        month: m,
        phaseName: defaultPhaseLabels[idx] || `Giai đoạn ${idx + 1} (${m})`,
        allocatedBudget: Math.round((totalBudget * share) / 1000000) * 1000000,
        spentBudget: 0,
        targetGmv: Math.round((totalGmv * share) / 1000000) * 1000000,
        actualGmv: 0,
        targetKocCount: Math.max(1, Math.round(totalKoc * share)),
        saleMilestones: `Mốc sale trọng tâm tháng ${m}`,
        kvAdaptNotes: idx === 0 ? 'Treo bộ Key Visual gốc chiến dịch' : `Adapt Key Visual & badge sale tháng ${m}`,
      };
    });
  };

  // Populate when opening modal or changing initialCampaign
  const initSyncKey = `${isOpen}|${initialCampaign?.id || 'NEW'}|${defaultBrand || ''}`;
  const [prevInitSyncKey, setPrevInitSyncKey] = useState('');
  if (initSyncKey !== prevInitSyncKey) {
    setPrevInitSyncKey(initSyncKey);
    if (isOpen) {
      setActiveTab('OVERVIEW_PHASES');
      if (initialCampaign) {
        setTitle(initialCampaign.title);
        setCode(initialCampaign.code);
        setBrand(initialCampaign.brand);
        setStatus(initialCampaign.status);
        setTargetAudience(initialCampaign.targetAudience || '');
        setBigIdea(initialCampaign.bigIdea || '');
        setKeyMessage(initialCampaign.keyMessage || '');
        setHeroSkusInput((initialCampaign.heroSkus || []).join(', '));
        setTargetCir(initialCampaign.targetCir ?? 16.0);
        setContentPic(initialCampaign.contentPic || 'Quỳnh Như');
        setBrandStrategyPic(initialCampaign.brandStrategyPic || 'Nguyễn Thị Thu Hà');
        setKvPic(initialCampaign.kvPic || initialCampaign.keyVisualSpec?.kvPic || 'Nguyễn Thị Ngọc Tâm');
        setBudget(initialCampaign.budget);
        setTargetGmv(initialCampaign.targetGmv);
        setTargetKocCount(initialCampaign.targetKocCount);
        setStartDate(initialCampaign.startDate);
        setEndDate(initialCampaign.endDate);
        setRoleInYearPlan(initialCampaign.roleInYearPlan || '');
        setObjectivesAndBarriers(initialCampaign.objectivesAndBarriers || '');
        setSeasonalOpportunity(initialCampaign.seasonalOpportunity || '');
        setComboPromoOffer(initialCampaign.comboPromoOffer || '');
        setSaleMilestones(initialCampaign.saleMilestones || '');
        setKvTheme(initialCampaign.keyVisualSpec?.theme || '');
        setKvFonts(initialCampaign.keyVisualSpec?.fonts || 'Montserrat Bold / Inter Regular');
        setKvMoodboard(initialCampaign.keyVisualSpec?.moodboard || '');
        setKvProposalUrl(initialCampaign.keyVisualSpec?.proposalUrl || '');
        setKvPromoText(initialCampaign.keyVisualSpec?.promoTextOnKv || '');
        setKvRefDate(initialCampaign.keyVisualSpec?.refDate || '2026-09-20');
        setKvOrderDate(initialCampaign.keyVisualSpec?.orderDate || '2026-09-23');
        setKvHangDate(initialCampaign.keyVisualSpec?.hangDate || '2026-09-30');
        const initMonths = getCoveredMonthsFromRange(initialCampaign.startDate, initialCampaign.endDate);
        setMonthlyPhases(
          buildSyncedPhases(
            initMonths,
            initialCampaign.monthlyPhases || [],
            initialCampaign.budget,
            initialCampaign.targetGmv,
            initialCampaign.targetKocCount
          )
        );
      } else {
        setTitle('');
        setCode('');
        setBrand(defaultBrand || 'Senka');
        setStatus('ACTIVE');
        setTargetAudience('');
        setBigIdea('');
        setKeyMessage('');
        setHeroSkusInput('');
        setTargetCir(16.0);
        setContentPic('Quỳnh Như');
        setBrandStrategyPic('Nguyễn Thị Thu Hà');
        setKvPic('Nguyễn Thị Ngọc Tâm');
        setBudget(150000000);
        setTargetGmv(1000000000);
        setTargetKocCount(25);
        setStartDate('2026-10-01');
        setEndDate('2026-10-31');
        setRoleInYearPlan('');
        setObjectivesAndBarriers('');
        setSeasonalOpportunity('');
        setComboPromoOffer('');
        setSaleMilestones('W1: Warm-up | W2: Mega Sale 10.10 | W3: 20.10 | W4: Payday 25.10');
        setKvTheme('');
        setKvFonts('Montserrat Bold / Inter Regular');
        setKvMoodboard('');
        setKvProposalUrl('');
        setKvPromoText('');
        setKvRefDate('2026-09-20');
        setKvOrderDate('2026-09-23');
        setKvHangDate('2026-09-30');
        const initMonths = getCoveredMonthsFromRange('2026-10-01', '2026-10-31');
        setMonthlyPhases(buildSyncedPhases(initMonths, [], 150000000, 1000000000, 25));
      }
    }
  }

  // Automatically sync monthlyPhases whenever coveredMonths changes
  const phaseSyncKey = `${coveredMonths.join(',')}|${budget}|${targetGmv}|${targetKocCount}`;
  const [prevPhaseSyncKey, setPrevPhaseSyncKey] = useState(phaseSyncKey);
  if (phaseSyncKey !== prevPhaseSyncKey) {
    setPrevPhaseSyncKey(phaseSyncKey);
    if (coveredMonths.length > 0) {
      setMonthlyPhases(prev => buildSyncedPhases(coveredMonths, prev, budget, targetGmv, targetKocCount));
    }
  }

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const brandOptions = useMemo(() => {
    const baseNames = [
      'Senka',
      'Kutieskin',
      "Nature's Way",
      'Babe',
      'Royal Ausnz',
      'Bye Bye Blemish',
      'pH Care',
      'ClubClio',
      'EUPC',
      'Cure Natural',
      'Peripera',
      'Bio-Essence',
    ];
    const fromReal = REAL_B2C_42_BRANDS.map(b => b.name);
    return Array.from(new Set([...baseNames, ...fromReal]));
  }, []);

  if (!isOpen) return null;

  const applyDurationPreset = (preset: '1M_OCT' | '2M_SEP_OCT' | '2M_OCT_NOV' | '3M_Q4') => {
    if (preset === '1M_OCT') {
      setStartDate('2026-10-01');
      setEndDate('2026-10-31');
    } else if (preset === '2M_SEP_OCT') {
      setStartDate('2026-09-15');
      setEndDate('2026-10-31');
    } else if (preset === '2M_OCT_NOV') {
      setStartDate('2026-10-01');
      setEndDate('2026-11-30');
    } else if (preset === '3M_Q4') {
      setStartDate('2026-09-15');
      setEndDate('2026-11-30');
    }
  };

  const updatePhaseField = <K extends keyof CampaignMonthlyPhase>(
    month: string,
    field: K,
    value: CampaignMonthlyPhase[K]
  ) => {
    setMonthlyPhases(prev =>
      prev.map(p => (p.month === month ? { ...p, [field]: value } : p))
    );
  };

  const redistributeBudgetEqually = () => {
    const count = monthlyPhases.length || 1;
    setMonthlyPhases(prev =>
      prev.map(p => ({
        ...p,
        allocatedBudget: Math.round(budget / count),
        targetGmv: Math.round(targetGmv / count),
        targetKocCount: Math.max(1, Math.round(targetKocCount / count)),
      }))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedSkus = heroSkusInput
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const keyVisualSpec: CampaignKeyVisualSpec = {
      theme: kvTheme || `${bigIdea || title} — Key Visual Chủ Đạo`,
      fonts: kvFonts || undefined,
      moodboard: kvMoodboard || undefined,
      proposalUrl: kvProposalUrl || undefined,
      promoTextOnKv: kvPromoText || comboPromoOffer || undefined,
      refDate: kvRefDate || undefined,
      orderDate: kvOrderDate || undefined,
      hangDate: kvHangDate || undefined,
      kvPic: kvPic || undefined,
    };

    const savedCampaign: CampaignItem = {
      id: initialCampaign?.id || `camp-${Date.now()}`,
      code: code || `CAMP-${brand.slice(0, 4).toUpperCase()}-${coveredMonths.length}M`,
      title: title || `Chiến dịch ${brand} (${coveredMonths.join(' - ')})`,
      brand,
      targetAudience: targetAudience || 'Khách hàng mục tiêu TikTok Shop & Shopee Mall',
      bigIdea: bigIdea || 'Chiến dịch thúc đẩy doanh số quý 4',
      keyMessage: keyMessage || undefined,
      heroSkus: parsedSkus.length > 0 ? parsedSkus : undefined,
      targetCir,
      contentPic,
      brandStrategyPic,
      kvPic,
      handoffAt: initialCampaign?.handoffAt || new Date().toISOString(),
      handoffSlaHours: 24,
      isSlaBreached: initialCampaign?.isSlaBreached || false,
      budget,
      spentBudget: initialCampaign?.spentBudget || 0,
      targetGmv,
      currentGmv: initialCampaign?.currentGmv || 0,
      targetKocCount,
      bookedKocCount: initialCampaign?.bookedKocCount || 0,
      status,
      briefStatus: initialCampaign?.briefStatus || 'HANDED_OFF_TO_CONTENT',
      startDate,
      endDate,
      coveredMonths,
      durationMonthsCount: coveredMonths.length,
      platforms: initialCampaign?.platforms || ['TikTok Shop', 'Shopee'],
      targetStores: initialCampaign?.targetStores || [`${brand} TikTok`, `${brand} Shopee`],
      roleInYearPlan: roleInYearPlan || undefined,
      objectivesAndBarriers: objectivesAndBarriers || undefined,
      seasonalOpportunity: seasonalOpportunity || undefined,
      comboPromoOffer: comboPromoOffer || undefined,
      saleMilestones: saleMilestones || undefined,
      keyVisualSpec,
      monthlyPhases,
      guidelineUrl: initialCampaign?.guidelineUrl,
    };

    onCampaignCreated(savedCampaign);
    onClose();
  };

  const sumPhaseBudget = monthlyPhases.reduce((s, p) => s + (p.allocatedBudget || 0), 0);
  const sumPhaseGmv = monthlyPhases.reduce((s, p) => s + (p.targetGmv || 0), 0);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={isEditMode ? `Cập nhật Chiến dịch: ${initialCampaign?.code}` : 'Khởi tạo Chiến dịch (Campaign) & Phân kỳ Tháng'}
      size="xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <div className="text-2xs text-ink-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-positive shrink-0" />
            <span>
              Liên kết kế hoạch tháng Brand <strong>{brand}</strong> ({coveredMonths.join(', ')})
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-line text-ink-2 hover:bg-sunken font-semibold text-xs cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              form="campaign-create-form"
              className="bg-accent hover:bg-accent-hover text-white font-semibold py-2 px-5 rounded-lg shadow-sm transition flex items-center gap-2 text-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isEditMode ? 'Lưu cập nhật Chiến dịch' : 'Tạo Chiến dịch & Đồng bộ Plan Tháng'}</span>
            </button>
          </div>
        </div>
      }
    >
      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-line bg-surface overflow-x-auto max-w-full mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('OVERVIEW_PHASES')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition cursor-pointer shrink-0 ${
            activeTab === 'OVERVIEW_PHASES'
              ? 'border-accent text-accent bg-accent-soft/50 rounded-t-lg'
              : 'border-transparent text-ink-2 hover:text-ink'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>1. Khung Chiến dịch &amp; Phân kỳ ({coveredMonths.length} tháng)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('STRATEGY_PROMO')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition cursor-pointer shrink-0 ${
            activeTab === 'STRATEGY_PROMO'
              ? 'border-accent text-accent bg-accent-soft/50 rounded-t-lg'
              : 'border-transparent text-ink-2 hover:text-ink'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>2. Định hướng Chiến lược &amp; CTKM (Section 01)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('KEY_VISUAL')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition cursor-pointer shrink-0 ${
            activeTab === 'KEY_VISUAL'
              ? 'border-accent text-accent bg-accent-soft/50 rounded-t-lg'
              : 'border-transparent text-ink-2 hover:text-ink'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>3. Key Visual &amp; Lịch treo KV (Section 03)</span>
        </button>
      </div>

      <form id="campaign-create-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
            {activeTab === 'OVERVIEW_PHASES' && (
              <div className="space-y-4">
                {/* Campaign Title, Code, Status */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                  <div className="lg:col-span-6">
                    <label className="block text-xs font-semibold text-ink-2 mb-1">
                      Tên chiến dịch *
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Chiến dịch Bọt Mịn Dịu Nhẹ pH Care Q4 (T10 - T11)"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:border-accent focus:bg-surface"
                      required
                    />
                  </div>
                  <div className="lg:col-span-3">
                    <label className="block text-xs font-semibold text-ink-2 mb-1">
                      Mã chiến dịch *
                    </label>
                    <input
                      type="text"
                      placeholder="CAMP-PHCARE-Q4"
                      value={code}
                      onChange={e => setCode(e.target.value.toUpperCase())}
                      className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-xs font-mono text-ink focus:outline-none focus:border-accent focus:bg-surface"
                      required
                    />
                  </div>
                  <div className="lg:col-span-3">
                    <label className="block text-xs font-semibold text-ink-2 mb-1">
                      Trạng thái
                    </label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as 'ACTIVE' | 'UPCOMING' | 'COMPLETED')}
                      className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:border-accent"
                    >
                      <option value="ACTIVE">Đang chạy (ACTIVE)</option>
                      <option value="UPCOMING">Sắp diễn ra (UPCOMING)</option>
                      <option value="COMPLETED">Đã kết thúc (COMPLETED)</option>
                    </select>
                  </div>
                </div>

                {/* Brand & 3 Brand-level PICs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-2 mb-1">
                      Thương hiệu (Brand) *
                    </label>
                    <select
                      value={brand}
                      onChange={e => setBrand(e.target.value)}
                      className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-xs font-semibold text-ink focus:outline-none focus:border-accent"
                    >
                      {brandOptions.map(b => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-2 mb-1">
                      Plan / Strategy PIC [theo brand]
                    </label>
                    <input
                      type="text"
                      value={brandStrategyPic}
                      onChange={e => setBrandStrategyPic(e.target.value)}
                      className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-xs text-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-2 mb-1">
                      Content / Brand main PIC
                    </label>
                    <input
                      type="text"
                      value={contentPic}
                      onChange={e => setContentPic(e.target.value)}
                      className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-xs text-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-2 mb-1">
                      Key Visual / SIS PIC
                    </label>
                    <input
                      type="text"
                      value={kvPic}
                      onChange={e => setKvPic(e.target.value)}
                      className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-xs text-ink"
                    />
                  </div>
                </div>

                {/* Total Campaign Financials */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-canvas rounded-xl border border-line">
                  <div>
                    <label className="block text-2xs font-semibold text-ink-2 mb-1">
                      Tổng Ngân sách Chiến dịch (VNĐ)
                    </label>
                    <input
                      type="number"
                      step={5000000}
                      value={budget}
                      onChange={e => setBudget(Number(e.target.value))}
                      className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-semibold text-positive mb-1">
                      Tổng Mục tiêu GMV (VNĐ)
                    </label>
                    <input
                      type="number"
                      step={50000000}
                      value={targetGmv}
                      onChange={e => setTargetGmv(Number(e.target.value))}
                      className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-positive font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-semibold text-accent mb-1">
                      Định mức CIR Mục tiêu (%)
                    </label>
                    <input
                      type="number"
                      step={0.5}
                      value={targetCir}
                      onChange={e => setTargetCir(Number(e.target.value))}
                      className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-accent font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-semibold text-ink-2 mb-1">
                      Tổng Sản lượng KOC / Video
                    </label>
                    <input
                      type="number"
                      value={targetKocCount}
                      onChange={e => setTargetKocCount(Number(e.target.value))}
                      className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink font-semibold"
                    />
                  </div>
                </div>

                {/* Duration & Cross-Month Timeline */}
                <div className="p-4 rounded-xl border border-line bg-canvas space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-accent" />
                      <span className="text-xs font-semibold text-ink">
                        Khung thời gian &amp; Chu kỳ kéo dài của Chiến dịch (1 tháng hoặc liên tháng 2–3 tháng)
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-2xs text-ink-3">Chọn nhanh:</span>
                      <button
                        type="button"
                        onClick={() => applyDurationPreset('1M_OCT')}
                        className="px-2 py-1 rounded text-2xs font-medium bg-surface border border-line text-ink-2 hover:border-accent cursor-pointer"
                      >
                        1 Tháng (T10)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDurationPreset('2M_SEP_OCT')}
                        className="px-2 py-1 rounded text-2xs font-medium bg-surface border border-line text-ink-2 hover:border-accent cursor-pointer"
                      >
                        2 Tháng (T9–T10)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDurationPreset('2M_OCT_NOV')}
                        className="px-2 py-1 rounded text-2xs font-medium bg-surface border border-line text-ink-2 hover:border-accent cursor-pointer"
                      >
                        2 Tháng (T10–T11)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDurationPreset('3M_Q4')}
                        className="px-2 py-1 rounded text-2xs font-medium bg-surface border border-line text-ink-2 hover:border-accent cursor-pointer"
                      >
                        3 Tháng (T9–T11)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                    <div>
                      <label className="block text-2xs font-semibold text-ink-2 mb-1">
                        Ngày bắt đầu Chiến dịch
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-2xs font-semibold text-ink-2 mb-1">
                        Ngày kết thúc Chiến dịch
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-2xs font-semibold text-ink-2 mb-1">
                        Các chu kỳ tháng áp dụng
                      </label>
                      <div className="flex flex-wrap items-center gap-2 min-h-[32px] px-3 py-1 bg-surface rounded-lg border border-line text-xs text-ink font-medium">
                        {coveredMonths.map(m => `Tháng ${m}`).join(' · ')}
                      </div>
                    </div>
                  </div>

                  {/* Per-Month Phases Editor */}
                  <div className="pt-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold text-ink">
                        Phân kỳ Ngân sách, Mục tiêu GMV &amp; Vai trò giai đoạn theo từng tháng ({monthlyPhases.length} tháng):
                      </span>
                      <button
                        type="button"
                        onClick={redistributeBudgetEqually}
                        className="text-2xs font-semibold text-accent hover:underline cursor-pointer"
                      >
                        Chia đều ngân sách &amp; KPI cho {monthlyPhases.length} tháng
                      </button>
                    </div>

                    <div className="overflow-x-auto bg-surface rounded-lg border border-line">
                      <table className="w-full min-w-[640px] text-left border-collapse">
                        <thead>
                          <tr className="bg-canvas text-2xs font-semibold text-ink-2 border-b border-line">
                            <th className="py-2 px-3 w-24">Tháng</th>
                            <th className="py-2 px-3">Vai trò giai đoạn (Phase)</th>
                            <th className="py-2 px-3 w-32">Ngân sách tháng</th>
                            <th className="py-2 px-3 w-36">Mục tiêu GMV</th>
                            <th className="py-2 px-3 w-20">Số KOC</th>
                            <th className="py-2 px-3">Mốc Sale &amp; Ghi chú KV tháng</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {monthlyPhases.map(phase => (
                            <tr key={phase.month} className="hover:bg-canvas">
                              <td className="py-2 px-3 font-mono font-semibold text-accent">
                                {phase.month}
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={phase.phaseName}
                                  onChange={e => updatePhaseField(phase.month, 'phaseName', e.target.value)}
                                  className="w-full bg-canvas border border-line rounded px-2 py-1 text-xs text-ink"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  step={5000000}
                                  value={phase.allocatedBudget}
                                  onChange={e => updatePhaseField(phase.month, 'allocatedBudget', Number(e.target.value))}
                                  className="w-full bg-canvas border border-line rounded px-2 py-1 text-xs font-semibold text-ink"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  step={20000000}
                                  value={phase.targetGmv}
                                  onChange={e => updatePhaseField(phase.month, 'targetGmv', Number(e.target.value))}
                                  className="w-full bg-canvas border border-line rounded px-2 py-1 text-xs font-semibold text-positive"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  value={phase.targetKocCount}
                                  onChange={e => updatePhaseField(phase.month, 'targetKocCount', Number(e.target.value))}
                                  className="w-full bg-canvas border border-line rounded px-2 py-1 text-xs font-semibold text-ink"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={phase.saleMilestones || ''}
                                  onChange={e => updatePhaseField(phase.month, 'saleMilestones', e.target.value)}
                                  placeholder="VD: W2 10.10 | W4 Payday"
                                  className="w-full bg-canvas border border-line rounded px-2 py-1 text-xs text-ink-2"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-canvas font-semibold text-2xs text-ink-2 border-t border-line">
                            <td colSpan={2} className="py-2 px-3 text-right">
                              Tổng cộng phân kỳ {monthlyPhases.length} tháng:
                            </td>
                            <td className="py-2 px-3 text-ink">
                              {formatVndShort(sumPhaseBudget)}
                            </td>
                            <td className="py-2 px-3 text-positive">
                              {formatVndShort(sumPhaseGmv)}
                            </td>
                            <td className="py-2 px-3 text-ink">
                              {monthlyPhases.reduce((s, p) => s + (p.targetKocCount || 0), 0)} KOC
                            </td>
                            <td className="py-2 px-3 text-ink-3">
                              Tự động liên kết xuống Plan tháng tương ứng
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'STRATEGY_PROMO' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-2 mb-1">
                      Big Idea / Chủ đề chiến dịch (Monthly Theme) *
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Độ pH Chuẩn 5.0 & Bọt Mịn Sẵn Sàng — Dịu Êm Suốt 24H"
                      value={bigIdea}
                      onChange={e => setBigIdea(e.target.value)}
                      className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-xs text-ink"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-2 mb-1">
                      Thông điệp trọng tâm (Key Message)
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Làm sạch dịu nhẹ với bọt mịn Nhật Bản, khử mùi 24h không khô rát"
                      value={keyMessage}
                      onChange={e => setKeyMessage(e.target.value)}
                      className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-xs text-ink"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-2 mb-1">
                      Vai trò trong Plan Năm (Role in Year Plan)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="VD: Chiến dịch trọng điểm Q4 chuyển dịch người dùng sang dòng Hero SKU Dạng Bọt..."
                      value={roleInYearPlan}
                      onChange={e => setRoleInYearPlan(e.target.value)}
                      className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-xs text-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-2 mb-1">
                      Mục tiêu &amp; Rào cản cần xử lý (Objectives &amp; Barriers)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="VD: Mục tiêu: Dòng Bọt chiếm 45% GMV. Rào cản: Khách nghĩ dạng bọt nhanh hết hơn dạng gel..."
                      value={objectivesAndBarriers}
                      onChange={e => setObjectivesAndBarriers(e.target.value)}
                      className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-xs text-ink"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-2 mb-1">
                      Cơ hội mùa vụ (Seasonal Opportunity)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="VD: Nhịp sale đôi 10.10 và quà tặng Phụ nữ Việt Nam 20/10, thời tiết giao mùa..."
                      value={seasonalOpportunity}
                      onChange={e => setSeasonalOpportunity(e.target.value)}
                      className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-xs text-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-2 mb-1">
                      Tệp khách hàng &amp; Insight (Target Audience &amp; Insight) *
                    </label>
                    <textarea
                      rows={2}
                      placeholder="VD: Nữ 18-32 tuổi, ưu tiên sản phẩm tạo bọt sẵn tiện lợi và hương hoa tự nhiên..."
                      value={targetAudience}
                      onChange={e => setTargetAudience(e.target.value)}
                      className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-xs text-ink"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-2 mb-1">
                      Combo / Deal / Quà tặng trọng tâm (CTKM)
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Combo 2 chai giảm 25% + Tặng chai mini 50ml & Túi mỹ phẩm"
                      value={comboPromoOffer}
                      onChange={e => setComboPromoOffer(e.target.value)}
                      className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-xs text-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-2 mb-1">
                      Hero SKU (phân cách bằng dấu phẩy)
                    </label>
                    <input
                      type="text"
                      placeholder="VD: SKU-PHCARE-FOAM-150ML, SKU-PHCARE-COOL-150ML"
                      value={heroSkusInput}
                      onChange={e => setHeroSkusInput(e.target.value)}
                      className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-xs text-ink"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-2 mb-1">
                    Các mốc Sale trong chiến dịch (W1..W5)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: W1: Warm-up | W2: Mega Sale 10.10 | W3: Quà tặng 20.10 | W4: Payday 25.10"
                    value={saleMilestones}
                    onChange={e => setSaleMilestones(e.target.value)}
                    className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-xs text-ink"
                  />
                </div>
              </div>
            )}

            {activeTab === 'KEY_VISUAL' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-2 mb-1">
                      Chủ đề Key Visual (KV Theme)
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Soft Cloud Foam 5.0 — Đám Mây Bọt Mịn Nâng Niu Phái Đẹp"
                      value={kvTheme}
                      onChange={e => setKvTheme(e.target.value)}
                      className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-xs text-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-2 mb-1">
                      Font chữ quy chuẩn (Fonts)
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Plus Jakarta Sans Bold / Inter Regular"
                      value={kvFonts}
                      onChange={e => setKvFonts(e.target.value)}
                      className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-xs text-ink"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-2 mb-1">
                    Mô tả Moodboard &amp; Tone màu chủ đạo
                  </label>
                  <textarea
                    rows={2}
                    placeholder="VD: Tone hồng pastel & xanh mint mát lạnh, hiệu ứng đám mây bọt mịn 3D cùng hoa cúc La Mã..."
                    value={kvMoodboard}
                    onChange={e => setKvMoodboard(e.target.value)}
                    className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-xs text-ink"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-2 mb-1">
                      Thông điệp CTKM in trên Key Visual
                    </label>
                    <input
                      type="text"
                      placeholder="VD: COMBO BỌT MỊN NHẬT BẢN GIẢM 25% + QUÀ TẶNG 20/10"
                      value={kvPromoText}
                      onChange={e => setKvPromoText(e.target.value)}
                      className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-xs text-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-2 mb-1">
                      Link Proposal / File thiết kế Key Visual
                    </label>
                    <input
                      type="text"
                      placeholder="https://upbase.vn/kv-proposals/..."
                      value={kvProposalUrl}
                      onChange={e => setKvProposalUrl(e.target.value)}
                      className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-xs text-ink"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-canvas rounded-xl border border-line">
                  <div>
                    <label className="block text-2xs font-semibold text-ink-2 mb-1">
                      1. Ngày cần lên Ref (Reference Date)
                    </label>
                    <input
                      type="date"
                      value={kvRefDate}
                      onChange={e => setKvRefDate(e.target.value)}
                      className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-semibold text-ink-2 mb-1">
                      2. Ngày Order Thiết kế (Order Date)
                    </label>
                    <input
                      type="date"
                      value={kvOrderDate}
                      onChange={e => setKvOrderDate(e.target.value)}
                      className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-semibold text-positive mb-1">
                      3. Ngày treo KV lên Gian hàng (Hang Date)
                    </label>
                    <input
                      type="date"
                      value={kvHangDate}
                      onChange={e => setKvHangDate(e.target.value)}
                      className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs font-semibold text-positive"
                    />
                  </div>
                </div>
              </div>
            )}
      </form>
    </Modal>
  );
};
