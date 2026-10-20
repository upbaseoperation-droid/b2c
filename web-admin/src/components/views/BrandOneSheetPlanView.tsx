'use client';

import React, { useState, useMemo } from 'react';
import {
  Download,
  Save,
  Edit3,
  Eye,
  Plus,
  Trash2,
  ExternalLink,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import {
  BrandOneSheetPlanData,
  BrandOneSheetPillarRow,
  BrandOneSheetTikTokContentRow,
  BrandOneSheetShopeeContentRow,
  BrandMonthlyPlanItem,
  CampaignItem,
  InputPlanBreakdownState,
  StorePortfolioItem,
} from '../../lib/types';
import { buildBrandOneSheetPlanData } from '../../lib/oneSheetPlanBuilder';
import { exportBrandMonthlyOneSheetToExcel } from '../../lib/excelExport';
import { formatVndShort } from '../../lib/format';

interface BrandOneSheetPlanViewProps {
  brandName: string;
  month: string;
  brandPlan?: BrandMonthlyPlanItem | null;
  storePlans?: InputPlanBreakdownState[];
  storePortfolios?: StorePortfolioItem[];
  campaigns?: CampaignItem[];
  onSaveOneSheetData?: (data: BrandOneSheetPlanData) => void;
  onOpenCampaignModal?: () => void;
  onNotify?: (msg: string) => void;
}

export const BrandOneSheetPlanView: React.FC<BrandOneSheetPlanViewProps> = ({
  brandName,
  month,
  brandPlan,
  storePlans = [],
  storePortfolios = [],
  campaigns = [],
  onSaveOneSheetData,
  onOpenCampaignModal,
  onNotify,
}) => {
  const synthesizedData = useMemo(
    () =>
      buildBrandOneSheetPlanData({
        brandName,
        month,
        brandPlan,
        storePlans,
        storePortfolios,
        campaigns,
      }),
    [brandName, month, brandPlan, storePlans, storePortfolios, campaigns]
  );

  const [formData, setFormData] = useState<BrandOneSheetPlanData>(synthesizedData);
  const [prevSynthesizedData, setPrevSynthesizedData] = useState<BrandOneSheetPlanData>(synthesizedData);
  if (synthesizedData !== prevSynthesizedData) {
    setPrevSynthesizedData(synthesizedData);
    setFormData(synthesizedData);
  }
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [sectionFilter, setSectionFilter] = useState<
    'ALL' | 'SEC_01' | 'SEC_02' | 'SEC_03' | 'SEC_04' | 'SEC_05'
  >('ALL');

  const sp = formData.shopeeKpi;
  const tt = formData.tiktokKpi;

  const spPromoCost =
    sp.costBookingVideoAff +
    sp.costVideoSelfChannel +
    sp.costAds +
    sp.costBookingLiveAff +
    sp.costLiveSelfChannel +
    sp.costDisplayPackage +
    sp.costOtherNet;
  const ttPromoCost =
    tt.costBookingVideoAff +
    tt.costVideoSelfChannel +
    tt.costAds +
    tt.costBookingLiveAff +
    tt.costLiveSelfChannel +
    tt.costDisplayPackage +
    tt.costOtherNet;
  const totGmv = sp.gmvSeller + tt.gmvSeller;
  const totNmv = sp.nmvSeller + tt.nmvSeller;
  const totPromoCost = spPromoCost + ttPromoCost;
  const spOtherComm = sp.costAffiliateCommission + sp.costAffiliateAdsCommission;
  const ttOtherComm = tt.costAffiliateCommission + tt.costAffiliateAdsCommission;

  // Tổng hợp bảng tuần TikTok (Section 04)
  const ttWeeklyTotals = useMemo(() => {
    return formData.tiktokWeeklyRows.reduce(
      (acc, r) => {
        const weekVideos =
          r.tapCount +
          r.kl1Count +
          r.kl2Count +
          r.kl3Count +
          r.kl4Count +
          r.kl5Count +
          r.kl6Count +
          r.kl7Count;
        const weekBudget =
          r.tapBudget +
          r.kl1Budget +
          r.kl2Budget +
          r.kl3Budget +
          r.kl4Budget +
          r.kl5Budget +
          r.kl6Budget +
          r.kl7Budget;
        acc.totalVideos += weekVideos;
        acc.tap += r.tapCount;
        acc.kl1 += r.kl1Count;
        acc.kl2 += r.kl2Count;
        acc.kl3 += r.kl3Count;
        acc.kl4 += r.kl4Count;
        acc.kl5 += r.kl5Count;
        acc.kl6 += r.kl6Count;
        acc.kl7 += r.kl7Count;
        acc.totalBudget += weekBudget;
        acc.kl1B += r.kl1Budget;
        acc.kl2B += r.kl2Budget;
        acc.kl3B += r.kl3Budget;
        acc.kl4B += r.kl4Budget;
        acc.kl5B += r.kl5Budget;
        acc.kl6B += r.kl6Budget;
        acc.kl7B += r.kl7Budget;
        acc.targetBookingGmv += r.targetBookingGmv;
        return acc;
      },
      {
        totalVideos: 0,
        tap: 0,
        kl1: 0,
        kl2: 0,
        kl3: 0,
        kl4: 0,
        kl5: 0,
        kl6: 0,
        kl7: 0,
        totalBudget: 0,
        kl1B: 0,
        kl2B: 0,
        kl3B: 0,
        kl4B: 0,
        kl5B: 0,
        kl6B: 0,
        kl7B: 0,
        targetBookingGmv: 0,
      }
    );
  }, [formData.tiktokWeeklyRows]);

  const handleSave = () => {
    onSaveOneSheetData?.(formData);
    setIsEditMode(false);
    onNotify?.(`Đã lưu biểu mẫu 1-Sheet trình Brand cho ${formData.brandName} (${formData.month})!`);
  };

  const handleResetFromSystem = () => {
    const fresh = buildBrandOneSheetPlanData({
      brandName,
      month,
      brandPlan: brandPlan ? { ...brandPlan, oneSheetPlanData: undefined } : null,
      storePlans: storePlans.map((p) => ({ ...p, oneSheetPlanData: undefined })),
      storePortfolios,
      campaigns,
    });
    setFormData(fresh);
    onNotify?.('Đã đồng bộ lại dữ liệu mới nhất từ Campaign, Content và Booking!');
  };

  const handleAddTikTokContentRow = () => {
    const newRow: BrandOneSheetTikTokContentRow = {
      id: `tt-cnt-${Date.now()}`,
      weekAndAirDate: `W1 | 01–07/${month.split('/')[1] || '11'}`,
      skuOrCombo: `${formData.brandName} Hero SKU`,
      touchpointSource: 'Video affiliate',
      klGroup: 'Mix KL / TAP',
      kocCriteria: 'Nữ beauty/lifestyle 22–35; trải nghiệm thực tế',
      pillar: 'Product education: hiểu SKU/RTB',
      angleAndBrief: 'Đọc nhãn và hướng dẫn sử dụng đúng quy chuẩn Brand.',
      contentType: 'Video',
      qty: 5,
      budgetVnd: 0,
      pic: formData.preparedBy,
    };
    setFormData((prev) => ({
      ...prev,
      tiktokContentRows: [...prev.tiktokContentRows, newRow],
    }));
  };

  const handleAddShopeeContentRow = () => {
    const monthNum = month.split('/')[1] || '11';
    const yearNum = month.split('/')[0] || '2026';
    const newRow: BrandOneSheetShopeeContentRow = {
      id: `sp-cnt-${Date.now()}`,
      week: 'W1',
      skuOrCombo: `${formData.brandName} Hero SKU`,
      touchpointSource: 'Video self',
      airOrHandoverDate: `05/${monthNum}/${yearNum}`,
      behaviorObjective: 'Consideration',
      pillarId: formData.contentPillars[0]?.pillarId || 'P01',
      angleAndBrief: 'Giải thích công dụng và hướng dẫn chọn phân loại phù hợp.',
      format: 'Demo',
      productionMethod: 'VJ',
      qty: 3,
      budgetVnd: 2000000,
      ownerDeadlineKvNote: `Content Shopee; draft trước air 2 ngày; KV${monthNum}`,
    };
    setFormData((prev) => ({
      ...prev,
      shopeeContentRows: [...prev.shopeeContentRows, newRow],
    }));
  };

  const handleAddPillarRow = () => {
    const nextIdx = formData.contentPillars.length + 1;
    const newPillar: BrandOneSheetPillarRow = {
      pillarId: `P0${nextIdx}`,
      pillarName: 'Tuyến nội dung mới',
      behaviorObjective: 'Consideration',
      insightAndBarrier: 'Khách hàng cần thêm thông tin thực tế',
      messageAndRtb: 'Thông điệp theo brief Brand đã duyệt',
      priorityAngle: 'So sánh & hướng dẫn chi tiết',
      suitableFormat: 'Demo / tutorial',
      videoWeightRatio: 0.1,
      monthlyVideoCount: 4,
    };
    setFormData((prev) => ({
      ...prev,
      contentPillars: [...prev.contentPillars, newPillar],
    }));
  };

  const showSec01 = sectionFilter === 'ALL' || sectionFilter === 'SEC_01';
  const showSec02 = sectionFilter === 'ALL' || sectionFilter === 'SEC_02';
  const showSec03 = sectionFilter === 'ALL' || sectionFilter === 'SEC_03';
  const showSec04 = sectionFilter === 'ALL' || sectionFilter === 'SEC_04';
  const showSec05 = sectionFilter === 'ALL' || sectionFilter === 'SEC_05';

  return (
    <div className="space-y-5">
      {/* ===================================================================== */}
      {/* HEADER BAR: THÔNG TIN TỔNG QUAN & CÁC NÚT THAO TÁC TRÌNH BRAND        */}
      {/* ===================================================================== */}
      <div className="bg-surface text-ink rounded-xl p-4 border border-line space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-ink">
              {formData.brandName.toUpperCase()} · Plan Tháng {formData.month} (1-Sheet Trình Brand)
            </h2>
            <span className="text-ink-3">·</span>
            {formData.hasCampaign ? (
              <span className="px-2 py-0.5 rounded bg-accent-soft text-accent border border-line text-2xs font-semibold">
                Campaign: [{formData.campaignCode || 'CMP'}] {formData.campaignTitle}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-sunken text-ink-2 text-2xs font-medium">
                Always-on (Duy trì)
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {onOpenCampaignModal && (
              <button
                type="button"
                onClick={onOpenCampaignModal}
                className="px-2.5 py-1.5 rounded-lg bg-canvas hover:bg-sunken border border-line text-ink-2 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-accent" />
                <span>Campaign</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleResetFromSystem}
              className="px-2.5 py-1.5 rounded-lg bg-canvas hover:bg-sunken border border-line text-ink-2 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
              title="Lấy lại dữ liệu gốc từ Campaign và Kế hoạch Gian hàng"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Đồng bộ</span>
            </button>
            <button
              type="button"
              onClick={() => setIsEditMode((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer border ${
                isEditMode
                  ? 'bg-warning-soft text-warning border-warning/40'
                  : 'bg-canvas hover:bg-sunken text-ink-2 border-line'
              }`}
            >
              {isEditMode ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
              <span>{isEditMode ? 'Chế độ Xem' : 'Chỉnh sửa'}</span>
            </button>
            {isEditMode && (
              <button
                type="button"
                onClick={handleSave}
                className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => void exportBrandMonthlyOneSheetToExcel(formData)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Meta Info & Section Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-line text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'ALL', label: 'Tất cả (01 → 05)' },
              { id: 'SEC_01', label: '01. Định hướng' },
              { id: 'SEC_02', label: '02. KPI 2 Sàn' },
              { id: 'SEC_03', label: '03. Key Visual' },
              { id: 'SEC_04', label: '04. TikTok Shop' },
              { id: 'SEC_05', label: '05. Shopee' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSectionFilter(tab.id as typeof sectionFilter)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  sectionFilter === tab.id
                    ? 'bg-primary text-white'
                    : 'bg-canvas text-ink-2 hover:bg-sunken border border-line'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap text-2xs text-ink-2">
            <span className="inline-flex items-center gap-1">
              <span className="text-ink-3">Người lập:</span>
              {isEditMode ? (
                <input
                  type="text"
                  value={formData.preparedBy}
                  onChange={(e) => setFormData((p) => ({ ...p, preparedBy: e.target.value }))}
                  className="w-32 px-2 py-0.5 rounded bg-canvas border border-line text-ink text-xs"
                />
              ) : (
                <strong className="text-ink font-semibold">{formData.preparedBy}</strong>
              )}
            </span>
            <span className="text-ink-3">·</span>
            <span className="inline-flex items-center gap-1">
              <span className="text-ink-3">Trạng thái:</span>
              {isEditMode ? (
                <input
                  type="text"
                  value={formData.statusAndCutoffNote}
                  onChange={(e) => setFormData((p) => ({ ...p, statusAndCutoffNote: e.target.value }))}
                  className="w-40 px-2 py-0.5 rounded bg-canvas border border-line text-ink text-xs"
                />
              ) : (
                <strong className="text-ink font-medium">{formData.statusAndCutoffNote}</strong>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 01: ĐỊNH HƯỚNG THÁNG (VỊ TRÍ BRAND STRATEGY + CAMPAIGN)       */}
      {/* ===================================================================== */}
      {showSec01 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="px-4 py-3 bg-canvas border-b border-line flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-accent">01.</span>
            <h3 className="text-xs font-semibold text-ink uppercase">ĐỊNH HƯỚNG THÁNG</h3>
          </div>

          <div className="divide-y divide-slate-200 text-xs">
            {(
              [
                ['roleInYearPlan', 'Vai trò trong plan năm'],
                ['objectivesAndBarriers', 'Mục tiêu & rào cản cần xử lý'],
                ['heroSkusUspRtb', 'Hero SKU / USP / RTB'],
                ['seasonalOpportunity', 'Seasonal opportunity'],
                ['bigIdeaMonthlyTheme', 'Big idea / monthly theme'],
                ['previousMonthReview', 'Review / bài học tháng trước'],
                ['targetAudienceInsight', 'Tệp khách hàng & insight'],
                ['comboPromoOffer', 'Combo / deal / quà tặng'],
                ['campaignSaleMilestones', 'Campaign / mốc sale'],
                ['keyMessageAndCta', 'Key message'],
              ] as const
            ).map(([fieldKey, label]) => (
              <div
                key={fieldKey}
                className="grid grid-cols-1 md:grid-cols-12 items-stretch hover:bg-slate-50/60"
              >
                <div className="md:col-span-3 px-4 py-3 bg-slate-50 font-semibold text-slate-800 border-b md:border-b-0 md:border-r border-slate-200 flex items-center">
                  {label}
                </div>
                <div className="md:col-span-9 px-4 py-2.5 text-slate-900 flex items-center">
                  {isEditMode ? (
                    <textarea
                      rows={2}
                      value={formData.orientation[fieldKey]}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          orientation: { ...prev.orientation, [fieldKey]: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  ) : (
                    <p className="leading-relaxed whitespace-pre-line">{formData.orientation[fieldKey]}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 02: KẾ HOẠCH KPI THÁNG (SHOPEE | TIKTOK SHOP | TOTAL)         */}
      {/* ===================================================================== */}
      {showSec02 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="px-4 py-3 bg-canvas border-b border-line flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-accent">02.</span>
            <h3 className="text-xs font-semibold text-ink uppercase">KẾ HOẠCH KPI THÁNG</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 font-semibold">
                  <th className="py-2.5 px-4 text-left border-r border-slate-200 w-48">Nhóm chỉ số</th>
                  <th className="py-2.5 px-4 text-left border-r border-slate-200">Mục tiêu chính</th>
                  <th className="py-2.5 px-4 text-right border-r border-slate-200 bg-amber-50/70 text-amber-900 w-44">
                    Target Shopee
                  </th>
                  <th className="py-2.5 px-4 text-right border-r border-slate-200 bg-blue-50/70 text-blue-900 w-44">
                    Target TikTok Shop
                  </th>
                  <th className="py-2.5 px-4 text-right bg-emerald-50/70 text-emerald-900 w-44">
                    Total Toàn Brand
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {/* Nhóm 1: Chỉ số chính */}
                <tr className="bg-slate-50/80 font-semibold">
                  <td className="py-2 px-4 font-sans text-slate-900 border-r border-slate-200" rowSpan={9}>
                    Chỉ số chính
                  </td>
                  <td className="py-2 px-4 font-sans text-slate-900 border-r border-slate-200">GMV nhà bán</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{sp.gmvSeller.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{tt.gmvSeller.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right text-emerald-800">{totGmv.toLocaleString('vi-VN')}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans text-slate-700 border-r border-slate-200">NMV nhà bán</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{sp.nmvSeller.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{tt.nmvSeller.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right font-semibold">{totNmv.toLocaleString('vi-VN')}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans text-slate-700 border-r border-slate-200">Đơn hàng</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{sp.orders.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{tt.orders.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right font-semibold">{(sp.orders + tt.orders).toLocaleString('vi-VN')}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans text-slate-700 border-r border-slate-200">Lượt truy cập</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{sp.traffic.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{tt.traffic.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right font-semibold">{(sp.traffic + tt.traffic).toLocaleString('vi-VN')}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans text-slate-700 border-r border-slate-200">Tỷ lệ chuyển đổi (CR)</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{(sp.conversionRate * 100).toFixed(1)}%</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{(tt.conversionRate * 100).toFixed(1)}%</td>
                  <td className="py-2 px-4 text-right font-semibold">
                    {(((sp.orders + tt.orders) / Math.max(1, sp.traffic + tt.traffic)) * 100).toFixed(1)}%
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans text-slate-700 border-r border-slate-200">Giá trung bình/đơn hàng (AOV)</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{sp.aov.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{tt.aov.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right font-semibold">
                    {Math.round(totGmv / Math.max(1, sp.orders + tt.orders)).toLocaleString('vi-VN')}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans text-slate-700 border-r border-slate-200">Tỷ lệ hủy</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{(sp.cancellationRate * 100).toFixed(1)}%</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{(tt.cancellationRate * 100).toFixed(1)}%</td>
                  <td className="py-2 px-4 text-right font-semibold">
                    {((1 - totNmv / Math.max(1, totGmv)) * 100).toFixed(1)}%
                  </td>
                </tr>
                <tr className="bg-blue-50/40 font-semibold">
                  <td className="py-2 px-4 font-sans text-slate-900 border-r border-slate-200">Tổng chi phí thúc đẩy (-VAT)</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{spPromoCost.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{ttPromoCost.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right text-blue-800">{totPromoCost.toLocaleString('vi-VN')}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans text-slate-700 border-r border-slate-200">% Chi phí thúc đẩy / NMV</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">
                    {((spPromoCost / Math.max(1, sp.nmvSeller)) * 100).toFixed(2)}%
                  </td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">
                    {((ttPromoCost / Math.max(1, tt.nmvSeller)) * 100).toFixed(2)}%
                  </td>
                  <td className="py-2 px-4 text-right font-semibold">
                    {((totPromoCost / Math.max(1, totNmv)) * 100).toFixed(2)}%
                  </td>
                </tr>

                {/* Nhóm 2: Doanh thu các hoạt động */}
                <tr className="bg-slate-50/80 font-semibold">
                  <td className="py-2 px-4 font-sans text-slate-900 border-r border-slate-200" rowSpan={4}>
                    Doanh thu các hoạt động
                  </td>
                  <td className="py-2 px-4 font-sans text-slate-900 border-r border-slate-200">GMV từ các hoạt động</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{sp.gmvSeller.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{tt.gmvSeller.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right">{totGmv.toLocaleString('vi-VN')}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans text-slate-700 border-r border-slate-200">GMV video</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{sp.gmvVideo.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{tt.gmvVideo.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right font-semibold">{(sp.gmvVideo + tt.gmvVideo).toLocaleString('vi-VN')}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans text-slate-700 border-r border-slate-200">GMV Livestream</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{sp.gmvLivestream.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{tt.gmvLivestream.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right font-semibold">{(sp.gmvLivestream + tt.gmvLivestream).toLocaleString('vi-VN')}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans text-slate-700 border-r border-slate-200">GMV Thẻ sản phẩm</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{sp.gmvProductCard.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{tt.gmvProductCard.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right font-semibold">{(sp.gmvProductCard + tt.gmvProductCard).toLocaleString('vi-VN')}</td>
                </tr>

                {/* Nhóm 3: Chi phí Marketing thúc đẩy */}
                <tr className="bg-slate-50/80 font-semibold">
                  <td className="py-2 px-4 font-sans text-slate-900 border-r border-slate-200" rowSpan={8}>
                    Chi phí Marketing thúc đẩy
                  </td>
                  <td className="py-2 px-4 font-sans text-slate-900 border-r border-slate-200">Tổng chi phí Marketing (-VAT)</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{spPromoCost.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{ttPromoCost.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right text-blue-800">{totPromoCost.toLocaleString('vi-VN')}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans text-slate-700 border-r border-slate-200">Chi phí booking video affiliate</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{sp.costBookingVideoAff.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{tt.costBookingVideoAff.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right font-semibold">{(sp.costBookingVideoAff + tt.costBookingVideoAff).toLocaleString('vi-VN')}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans text-slate-700 border-r border-slate-200">Chi phí video self channel</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{sp.costVideoSelfChannel.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{tt.costVideoSelfChannel.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right font-semibold">{(sp.costVideoSelfChannel + tt.costVideoSelfChannel).toLocaleString('vi-VN')}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans text-slate-700 border-r border-slate-200">Chi phí ads</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{sp.costAds.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{tt.costAds.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right font-semibold">{(sp.costAds + tt.costAds).toLocaleString('vi-VN')}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans text-slate-700 border-r border-slate-200">Chi phí booking livestream affiliate</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{sp.costBookingLiveAff.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{tt.costBookingLiveAff.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right font-semibold">{(sp.costBookingLiveAff + tt.costBookingLiveAff).toLocaleString('vi-VN')}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans text-slate-700 border-r border-slate-200">Chi phí livestream self channel</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{sp.costLiveSelfChannel.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{tt.costLiveSelfChannel.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right font-semibold">{(sp.costLiveSelfChannel + tt.costLiveSelfChannel).toLocaleString('vi-VN')}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans text-slate-700 border-r border-slate-200">Chi phí gói dịch vụ hiển thị</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{sp.costDisplayPackage.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{tt.costDisplayPackage.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right font-semibold">{(sp.costDisplayPackage + tt.costDisplayPackage).toLocaleString('vi-VN')}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans text-slate-700 border-r border-slate-200">Chi phí khác (net)</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{sp.costOtherNet.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{tt.costOtherNet.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right font-semibold">{(sp.costOtherNet + tt.costOtherNet).toLocaleString('vi-VN')}</td>
                </tr>

                {/* Nhóm 4: Chi phí khác ghi nhận chung phí sàn */}
                <tr className="bg-slate-50/80 font-semibold">
                  <td className="py-2 px-4 font-sans text-slate-900 border-r border-slate-200" rowSpan={3}>
                    Chi phí khác (Ghi nhận chung với phí sàn)
                  </td>
                  <td className="py-2 px-4 font-sans text-slate-900 border-r border-slate-200">Tổng chi phí khác</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{spOtherComm.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{ttOtherComm.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right">{(spOtherComm + ttOtherComm).toLocaleString('vi-VN')}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans text-slate-700 border-r border-slate-200">Chi phí tiếp thị liên kết</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{sp.costAffiliateCommission.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{tt.costAffiliateCommission.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right font-semibold">{(sp.costAffiliateCommission + tt.costAffiliateCommission).toLocaleString('vi-VN')}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-sans text-slate-700 border-r border-slate-200">Chi phí tiếp thị liên kết (có chạy ads)</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{sp.costAffiliateAdsCommission.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right border-r border-slate-200">{tt.costAffiliateAdsCommission.toLocaleString('vi-VN')}</td>
                  <td className="py-2 px-4 text-right font-semibold">{(sp.costAffiliateAdsCommission + tt.costAffiliateAdsCommission).toLocaleString('vi-VN')}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-2xs text-slate-600 italic">
            {formData.kpiBalanceNote}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 03: KEY VISUAL CHUNG CỦA THÁNG                                */}
      {/* ===================================================================== */}
      {showSec03 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="px-4 py-3 bg-canvas border-b border-line flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-accent">03.</span>
            <h3 className="text-xs font-semibold text-ink uppercase">KEY VISUAL CHUNG CỦA THÁNG</h3>
          </div>

          <div className="divide-y divide-slate-200 text-xs">
            {(
              [
                ['theme', 'Chủ đề'],
                ['fonts', 'Font'],
                ['moodboard', 'Moodboard'],
                ['proposalUrl', 'Link proposal'],
                ['promoTextOnKv', 'CTKM trên KV'],
                ['hangDate', 'Ngày treo'],
                ['orderDate', 'Ngày order'],
                ['refDate', 'Ngày cần lên Ref'],
              ] as const
            ).map(([fieldKey, label]) => (
              <div
                key={fieldKey}
                className="grid grid-cols-1 md:grid-cols-12 items-stretch hover:bg-slate-50/60"
              >
                <div className="md:col-span-3 px-4 py-3 bg-slate-50 font-semibold text-slate-800 border-b md:border-b-0 md:border-r border-slate-200 flex items-center">
                  {label}
                </div>
                <div className="md:col-span-9 px-4 py-2.5 text-slate-900 flex items-center">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={formData.keyVisual[fieldKey] || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          keyVisual: { ...prev.keyVisual, [fieldKey]: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  ) : fieldKey === 'proposalUrl' && formData.keyVisual.proposalUrl ? (
                    <a
                      href={formData.keyVisual.proposalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1.5 font-medium break-all"
                    >
                      <span>{formData.keyVisual.proposalUrl}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  ) : (
                    <p className="leading-relaxed whitespace-pre-line">{formData.keyVisual[fieldKey]}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 04: TIKTOK SHOP • CONTENT, KOC & BOOKING                      */}
      {/* ===================================================================== */}
      {showSec04 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs space-y-5 pb-5">
          <div className="px-4 py-3 bg-canvas border-b border-line flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-accent">04.</span>
            <h3 className="text-xs font-semibold text-ink uppercase">
              TIKTOK SHOP • CONTENT, KOC &amp; BOOKING
            </h3>
          </div>

          {/* 4A. Tổng quan KPI TikTok Shop */}
          <div className="px-5 space-y-3">
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              4.1 Tổng quan Chỉ số TikTok Shop (Video Self, Video Affiliate &amp; Livestream)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="text-2xs font-semibold text-slate-500 uppercase">Video Self Channel</span>
                <div className="flex justify-between">
                  <span className="text-slate-600">Doanh thu mục tiêu:</span>
                  <strong className="font-mono text-slate-900">
                    {formatVndShort(formData.tiktokOverviewExtra.selfRevenueTarget)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Số nội dung (ảnh trượt):</span>
                  <strong className="font-mono text-slate-900">
                    {formData.tiktokOverviewExtra.selfContentCount} bài
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Chi phí sản xuất:</span>
                  <strong className="font-mono text-emerald-700">
                    {formatVndShort(formData.tiktokOverviewExtra.selfCostNet)}
                  </strong>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200 space-y-1.5">
                <span className="text-2xs font-semibold text-blue-700 uppercase">
                  Video Affiliate (Booking + TAP)
                </span>
                <div className="flex justify-between">
                  <span className="text-slate-600">Doanh thu video AFF:</span>
                  <strong className="font-mono text-blue-900">
                    {formatVndShort(formData.tiktokOverviewExtra.affRevenueTarget)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Tổng video AFF:</span>
                  <strong className="font-mono text-blue-900">
                    {ttWeeklyTotals.totalVideos} video (KOC:{' '}
                    {ttWeeklyTotals.kl1 +
                      ttWeeklyTotals.kl2 +
                      ttWeeklyTotals.kl3 +
                      ttWeeklyTotals.kl4 +
                      ttWeeklyTotals.kl5}{' '}
                    | KOL: {ttWeeklyTotals.kl6 + ttWeeklyTotals.kl7} | TAP: {ttWeeklyTotals.tap})
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Nhãn mục tiêu trong 60 video:</span>
                  <span className="font-mono text-2xs text-slate-700">
                    Awareness: {formData.tiktokOverviewExtra.awarenessVideoTagCount} | Branding:{' '}
                    {formData.tiktokOverviewExtra.brandingVideoTagCount}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-1.5">
                <span className="text-2xs font-semibold text-emerald-800 uppercase">
                  Livestream Self Channel
                </span>
                <div className="flex justify-between">
                  <span className="text-slate-600">Doanh thu Live Self:</span>
                  <strong className="font-mono text-emerald-900">
                    {formatVndShort(tt.gmvLivestream)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Số phiên Live (2h):</span>
                  <strong className="font-mono text-emerald-900">
                    {formData.tiktokOverviewExtra.liveSelfSessions2h} phiên (
                    {formData.tiktokOverviewExtra.liveSelfOrders.toLocaleString('vi-VN')} đơn)
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Chi phí Live Self:</span>
                  <strong className="font-mono text-emerald-800">
                    {formatVndShort(tt.costLiveSelfChannel)}
                  </strong>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 space-y-1.5">
                <span className="text-2xs font-semibold text-amber-800 uppercase">
                  Hiệu suất Booking TikTok
                </span>
                <div className="flex justify-between">
                  <span className="text-slate-600">Ngân sách Booking (-VAT):</span>
                  <strong className="font-mono text-amber-900">
                    {formatVndShort(ttWeeklyTotals.totalBudget)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">GMV Booking mục tiêu:</span>
                  <strong className="font-mono text-amber-900">
                    {formatVndShort(ttWeeklyTotals.targetBookingGmv)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Hệ số GMV / Chi phí:</span>
                  <strong className="font-mono text-emerald-700">
                    {(ttWeeklyTotals.targetBookingGmv / Math.max(1, ttWeeklyTotals.totalBudget)).toFixed(1)}x
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* 4B. Bảng Số lượng & Ngân sách theo tuần (W1-W5) */}
          <div className="px-5 space-y-3">
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              4.2 Phân bổ Số lượng &amp; Ngân sách KOC/KOL theo Tuần (W1–W5)
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full min-w-[680px] text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 text-2xs">
                    <th className="py-2 px-3 text-left border-r border-slate-200">Tuần</th>
                    <th className="py-2 px-2.5 text-center border-r border-slate-200 bg-blue-50 text-blue-900">
                      Tổng AFF
                    </th>
                    <th className="py-2 px-2 text-center border-r border-slate-200">TAP</th>
                    <th className="py-2 px-2 text-center border-r border-slate-200">KL1</th>
                    <th className="py-2 px-2 text-center border-r border-slate-200">KL2</th>
                    <th className="py-2 px-2 text-center border-r border-slate-200">KL3</th>
                    <th className="py-2 px-2 text-center border-r border-slate-200">KL4</th>
                    <th className="py-2 px-2 text-center border-r border-slate-200">KL5</th>
                    <th className="py-2 px-2 text-center border-r border-slate-200">KL6</th>
                    <th className="py-2 px-2 text-center border-r border-slate-200">KL7</th>
                    <th className="py-2 px-3 text-right border-r border-slate-200 bg-emerald-50 text-emerald-900">
                      Ngân sách Booking
                    </th>
                    <th className="py-2 px-3 text-right border-r border-slate-200 bg-amber-50 text-amber-900">
                      GMV Booking Target
                    </th>
                    <th className="py-2 px-3 text-left font-sans">Owner / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {formData.tiktokWeeklyRows.map((row) => {
                    const totV =
                      row.tapCount +
                      row.kl1Count +
                      row.kl2Count +
                      row.kl3Count +
                      row.kl4Count +
                      row.kl5Count +
                      row.kl6Count +
                      row.kl7Count;
                    const totB =
                      row.tapBudget +
                      row.kl1Budget +
                      row.kl2Budget +
                      row.kl3Budget +
                      row.kl4Budget +
                      row.kl5Budget +
                      row.kl6Budget +
                      row.kl7Budget;
                    return (
                      <tr key={row.week} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-200">
                          {row.week} <span className="text-2xs font-normal text-slate-500">({row.dateRange})</span>
                        </td>
                        <td className="py-2 px-2.5 text-center font-semibold text-blue-700 bg-blue-50/30 border-r border-slate-200">
                          {totV}
                        </td>
                        <td className="py-2 px-2 text-center border-r border-slate-200">{row.tapCount}</td>
                        <td className="py-2 px-2 text-center border-r border-slate-200">{row.kl1Count}</td>
                        <td className="py-2 px-2 text-center border-r border-slate-200">{row.kl2Count}</td>
                        <td className="py-2 px-2 text-center border-r border-slate-200">{row.kl3Count}</td>
                        <td className="py-2 px-2 text-center border-r border-slate-200">{row.kl4Count}</td>
                        <td className="py-2 px-2 text-center border-r border-slate-200">{row.kl5Count}</td>
                        <td className="py-2 px-2 text-center border-r border-slate-200">{row.kl6Count}</td>
                        <td className="py-2 px-2 text-center border-r border-slate-200">{row.kl7Count}</td>
                        <td className="py-2 px-3 text-right font-semibold text-emerald-800 border-r border-slate-200">
                          {totB.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-amber-900 border-r border-slate-200">
                          {row.targetBookingGmv.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-700">{row.ownerActionNote}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-semibold border-t-2 border-slate-300">
                    <td className="py-2.5 px-3 border-r border-slate-200">Tổng tháng</td>
                    <td className="py-2.5 px-2.5 text-center text-blue-800 border-r border-slate-200">
                      {ttWeeklyTotals.totalVideos}
                    </td>
                    <td className="py-2.5 px-2 text-center border-r border-slate-200">{ttWeeklyTotals.tap}</td>
                    <td className="py-2.5 px-2 text-center border-r border-slate-200">{ttWeeklyTotals.kl1}</td>
                    <td className="py-2.5 px-2 text-center border-r border-slate-200">{ttWeeklyTotals.kl2}</td>
                    <td className="py-2.5 px-2 text-center border-r border-slate-200">{ttWeeklyTotals.kl3}</td>
                    <td className="py-2.5 px-2 text-center border-r border-slate-200">{ttWeeklyTotals.kl4}</td>
                    <td className="py-2.5 px-2 text-center border-r border-slate-200">{ttWeeklyTotals.kl5}</td>
                    <td className="py-2.5 px-2 text-center border-r border-slate-200">{ttWeeklyTotals.kl6}</td>
                    <td className="py-2.5 px-2 text-center border-r border-slate-200">{ttWeeklyTotals.kl7}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-800 border-r border-slate-200">
                      {ttWeeklyTotals.totalBudget.toLocaleString('vi-VN')}
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-900 border-r border-slate-200">
                      {ttWeeklyTotals.targetBookingGmv.toLocaleString('vi-VN')}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-2xs text-slate-600">
                      CP Booking / GMV:{' '}
                      {((ttWeeklyTotals.totalBudget / Math.max(1, ttWeeklyTotals.targetBookingGmv)) * 100).toFixed(1)}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 4C. Chi tiết Content TikTok Shop */}
          <div className="px-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                4.3 Chi tiết Content TikTok Shop (Video Affiliate &amp; Video Self / Ảnh trượt)
              </h4>
              {isEditMode && (
                <button
                  type="button"
                  onClick={handleAddTikTokContentRow}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm dòng Content TikTok</span>
                </button>
              )}
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full min-w-[680px] text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 text-2xs font-semibold">
                    <th className="py-2.5 px-2.5 text-left border-r border-slate-200 w-28">Tuần / Ngày air</th>
                    <th className="py-2.5 px-2.5 text-left border-r border-slate-200 w-36">SKU / Combo</th>
                    <th className="py-2.5 px-2.5 text-left border-r border-slate-200 w-28">Nguồn</th>
                    <th className="py-2.5 px-2.5 text-left border-r border-slate-200 w-28">Nhóm KL</th>
                    <th className="py-2.5 px-2.5 text-left border-r border-slate-200 w-48">Tệp KOC / Tiêu chí chọn</th>
                    <th className="py-2.5 px-2.5 text-left border-r border-slate-200 w-36">Pillar</th>
                    <th className="py-2.5 px-2.5 text-left border-r border-slate-200">Angle / Nhiệm vụ nội dung / Brief</th>
                    <th className="py-2.5 px-2 text-center border-r border-slate-200 w-20">Type</th>
                    <th className="py-2.5 px-2 text-center border-r border-slate-200 w-16">SL</th>
                    <th className="py-2.5 px-2.5 text-right border-r border-slate-200 w-28">Ngân sách</th>
                    <th className="py-2.5 px-2.5 text-left w-28">PIC</th>
                    {isEditMode && <th className="py-2.5 px-2 w-10" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {formData.tiktokContentRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50 align-top">
                      <td className="p-2 border-r border-slate-200 font-mono font-semibold text-slate-900">
                        {isEditMode ? (
                          <input
                            type="text"
                            value={row.weekAndAirDate}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData((p) => ({
                                ...p,
                                tiktokContentRows: p.tiktokContentRows.map((r, i) =>
                                  i === idx ? { ...r, weekAndAirDate: val } : r
                                ),
                              }));
                            }}
                            className="w-full px-1.5 py-1 border border-slate-300 rounded text-xs"
                          />
                        ) : (
                          row.weekAndAirDate
                        )}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-medium text-slate-800">{row.skuOrCombo}</td>
                      <td className="p-2 border-r border-slate-200">
                        <span className="text-xs text-ink-2 font-medium">
                          {row.touchpointSource}
                        </span>
                      </td>
                      <td className="p-2 border-r border-slate-200 text-slate-700">{row.klGroup}</td>
                      <td className="p-2 border-r border-slate-200 text-slate-600">{row.kocCriteria}</td>
                      <td className="p-2 border-r border-slate-200 font-semibold text-slate-800">{row.pillar}</td>
                      <td className="p-2 border-r border-slate-200 text-slate-800">
                        {isEditMode ? (
                          <textarea
                            rows={2}
                            value={row.angleAndBrief}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData((p) => ({
                                ...p,
                                tiktokContentRows: p.tiktokContentRows.map((r, i) =>
                                  i === idx ? { ...r, angleAndBrief: val } : r
                                ),
                              }));
                            }}
                            className="w-full px-1.5 py-1 border border-slate-300 rounded text-xs"
                          />
                        ) : (
                          row.angleAndBrief
                        )}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center font-medium">{row.contentType}</td>
                      <td className="p-2 border-r border-slate-200 text-center font-mono font-semibold">{row.qty}</td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono">
                        {row.budgetVnd > 0 ? row.budgetVnd.toLocaleString('vi-VN') : '0'}
                      </td>
                      <td className="p-2 font-medium text-slate-800">{row.pic}</td>
                      {isEditMode && (
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((p) => ({
                                ...p,
                                tiktokContentRows: p.tiktokContentRows.filter((_, i) => i !== idx),
                              }))
                            }
                            className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 05: SHOPEE • CHIẾN LƯỢC PILLAR, CONTENT & TARGET TUẦN         */}
      {/* ===================================================================== */}
      {showSec05 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs space-y-5 pb-5">
          <div className="px-4 py-3 bg-canvas border-b border-line flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-accent">05.</span>
            <h3 className="text-xs font-semibold text-ink uppercase">
              SHOPEE • CHIẾN LƯỢC PILLAR, CONTENT &amp; TARGET TUẦN
            </h3>
          </div>

          {/* 5A. Bảng Chiến lược Pillar P01 - P05 */}
          <div className="px-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                5.1 Bảng Chiến lược Tuyến Nội dung (Content Pillars P01 → P05)
              </h4>
              {isEditMode && (
                <button
                  type="button"
                  onClick={handleAddPillarRow}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Pillar</span>
                </button>
              )}
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full min-w-[680px] text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 text-2xs font-semibold">
                    <th className="py-2.5 px-2.5 text-center border-r border-slate-200 w-20">Pillar ID</th>
                    <th className="py-2.5 px-3 text-left border-r border-slate-200 w-40">Tên pillar</th>
                    <th className="py-2.5 px-3 text-left border-r border-slate-200 w-44">Mục tiêu / hành vi</th>
                    <th className="py-2.5 px-3 text-left border-r border-slate-200 w-44">Insight / rào cản</th>
                    <th className="py-2.5 px-3 text-left border-r border-slate-200 w-48">Thông điệp / RTB</th>
                    <th className="py-2.5 px-3 text-left border-r border-slate-200">Angle ưu tiên</th>
                    <th className="py-2.5 px-3 text-left border-r border-slate-200 w-36">Format phù hợp</th>
                    <th className="py-2.5 px-2.5 text-center border-r border-slate-200 w-24">Tỷ trọng</th>
                    <th className="py-2.5 px-2.5 text-center w-24">Số video tháng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {formData.contentPillars.map((p, idx) => (
                    <tr key={p.pillarId} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center border-r border-slate-200 font-mono font-semibold text-blue-700 bg-blue-50/40">
                        {p.pillarId}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 font-semibold text-slate-900">
                        {isEditMode ? (
                          <input
                            type="text"
                            value={p.pillarName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                contentPillars: prev.contentPillars.map((item, i) =>
                                  i === idx ? { ...item, pillarName: val } : item
                                ),
                              }));
                            }}
                            className="w-full px-1.5 py-1 border border-slate-300 rounded text-xs"
                          />
                        ) : (
                          p.pillarName
                        )}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-slate-700">{p.behaviorObjective}</td>
                      <td className="p-2.5 border-r border-slate-200 text-slate-600">{p.insightAndBarrier}</td>
                      <td className="p-2.5 border-r border-slate-200 text-slate-800 font-medium">{p.messageAndRtb}</td>
                      <td className="p-2.5 border-r border-slate-200 text-slate-800">{p.priorityAngle}</td>
                      <td className="p-2.5 border-r border-slate-200">
                        <span className="text-xs text-ink-2">
                          {p.suitableFormat}
                        </span>
                      </td>
                      <td className="p-2.5 text-center border-r border-slate-200 font-mono font-semibold">
                        {Math.round(p.videoWeightRatio * 100)}%
                      </td>
                      <td className="p-2.5 text-center font-mono font-semibold text-emerald-700">
                        {p.monthlyVideoCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5B. Target Tuần Content Shopee */}
          <div className="px-5 space-y-3">
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              5.2 Bảng Target Tuần Content Shopee (W1 → W5)
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full min-w-[680px] text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 text-2xs font-semibold">
                    <th className="py-2 px-3 text-left border-r border-slate-200">Tuần</th>
                    <th className="py-2 px-3 text-center border-r border-slate-200">Khoảng ngày air</th>
                    <th className="py-2 px-3 text-center border-r border-slate-200">Số video plan</th>
                    <th className="py-2 px-3 text-right border-r border-slate-200">Ngân sách content</th>
                    <th className="py-2 px-3 text-right border-r border-slate-200">View video target</th>
                    <th className="py-2 px-3 text-right border-r border-slate-200">GMV video target</th>
                    <th className="py-2 px-3 text-right border-r border-slate-200">View / video</th>
                    <th className="py-2 px-3 text-right border-r border-slate-200">GMV / chi phí</th>
                    <th className="py-2 px-3 text-left font-sans">Owner / action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {formData.shopeeWeeklyTargets.map((w) => (
                    <tr key={w.week} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-200">{w.week}</td>
                      <td className="py-2 px-3 text-center border-r border-slate-200">{w.airDateRange}</td>
                      <td className="py-2 px-3 text-center font-semibold text-blue-700 border-r border-slate-200">
                        {w.plannedVideos}
                      </td>
                      <td className="py-2 px-3 text-right border-r border-slate-200">
                        {w.contentBudget.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2 px-3 text-right border-r border-slate-200">
                        {w.targetViews.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-emerald-700 border-r border-slate-200">
                        {w.targetVideoGmv.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2 px-3 text-right border-r border-slate-200">
                        {Math.round(w.targetViews / Math.max(1, w.plannedVideos)).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2 px-3 text-right border-r border-slate-200">
                        {(w.targetVideoGmv / Math.max(1, w.contentBudget)).toFixed(1)}
                      </td>
                      <td className="py-2 px-3 font-sans text-slate-700">{w.ownerAction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5C. Lịch sản xuất & air Content Shopee gắn mã Pillar P01-P05 */}
          <div className="px-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                5.3 Lịch Sản xuất &amp; Air Content Shopee (Gắn mã Pillar P01–P05 &amp; Phương thức VJ / Remix)
              </h4>
              {isEditMode && (
                <button
                  type="button"
                  onClick={handleAddShopeeContentRow}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm dòng Lịch Air Shopee</span>
                </button>
              )}
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full min-w-[680px] text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 text-2xs font-semibold">
                    <th className="py-2.5 px-2 text-center border-r border-slate-200 w-14">Tuần</th>
                    <th className="py-2.5 px-2.5 text-left border-r border-slate-200 w-36">SKU / Combo</th>
                    <th className="py-2.5 px-2.5 text-left border-r border-slate-200 w-24">Nguồn</th>
                    <th className="py-2.5 px-2.5 text-center border-r border-slate-200 w-24">Ngày air</th>
                    <th className="py-2.5 px-2.5 text-left border-r border-slate-200 w-28">Mục tiêu</th>
                    <th className="py-2.5 px-2 text-center border-r border-slate-200 w-20">Pillar ID</th>
                    <th className="py-2.5 px-3 text-left border-r border-slate-200">Angle / Nội dung / Brief</th>
                    <th className="py-2.5 px-2.5 text-left border-r border-slate-200 w-28">Format</th>
                    <th className="py-2.5 px-2.5 text-center border-r border-slate-200 w-24">SX (VJ/Remix)</th>
                    <th className="py-2.5 px-2 text-center border-r border-slate-200 w-14">SL</th>
                    <th className="py-2.5 px-2.5 text-right border-r border-slate-200 w-28">Ngân sách</th>
                    <th className="py-2.5 px-2.5 text-left w-48">Owner / Deadline / KV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {formData.shopeeContentRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="p-2 text-center border-r border-slate-200 font-mono font-semibold">{row.week}</td>
                      <td className="p-2 border-r border-slate-200 font-medium text-slate-800">{row.skuOrCombo}</td>
                      <td className="p-2 border-r border-slate-200 text-slate-600">{row.touchpointSource}</td>
                      <td className="p-2 text-center border-r border-slate-200 font-mono text-slate-800">
                        {row.airOrHandoverDate}
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <span className="text-xs text-ink-2">
                          {row.behaviorObjective}
                        </span>
                      </td>
                      <td className="p-2 text-center border-r border-slate-200 font-mono font-semibold text-blue-700">
                        {isEditMode ? (
                          <select
                            value={row.pillarId}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                shopeeContentRows: prev.shopeeContentRows.map((r, i) =>
                                  i === idx ? { ...r, pillarId: val } : r
                                ),
                              }));
                            }}
                            className="px-1 py-0.5 border border-slate-300 rounded text-xs"
                          >
                            {formData.contentPillars.map((p) => (
                              <option key={p.pillarId} value={p.pillarId}>
                                {p.pillarId}
                              </option>
                            ))}
                          </select>
                        ) : (
                          row.pillarId
                        )}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-slate-800">{row.angleAndBrief}</td>
                      <td className="p-2 border-r border-slate-200 text-slate-700 font-medium">{row.format}</td>
                      <td className="p-2 text-center border-r border-slate-200">
                        <span className="font-mono text-xs font-semibold text-ink-2">
                          {row.productionMethod}
                        </span>
                      </td>
                      <td className="p-2 text-center border-r border-slate-200 font-mono font-semibold">{row.qty}</td>
                      <td className="p-2 text-right border-r border-slate-200 font-mono">
                        {row.budgetVnd.toLocaleString('vi-VN')}
                      </td>
                      <td className="p-2 text-slate-600 text-2xs">{row.ownerDeadlineKvNote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
