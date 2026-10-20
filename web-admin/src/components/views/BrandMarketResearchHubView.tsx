'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Globe,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  Sliders,
  Swords,
  Target,
  UserPlus,
  Users,
} from 'lucide-react';
import { InlinePurposeApiSetup } from '../InlinePurposeApiSetup';
import { OperationalReportDrawer } from '../OperationalReportDrawer';
import type { BrandDetail, KocItem } from '../../lib/types';
import {
  PRICE_SEGMENT_LABEL,
  buildBrandResearchMarkdownReport,
  buildCompetitorMatrixCsv,
  generateBrandMarketResearchDossier,
  type BookedProductSummaryItem,
  type BrandMarketResearchDossier,
  type BrandSkuPortfolioItem,
  type CompetitorMatrixItem,
  type InternalStoreAuditItem,
  type KocTierAllocationItem,
  type LiveWebInspectionResult,
  type PlatformComplianceRuleItem,
  type ReviewMiningCluster,
  type VerifiedBookedDealEvidenceItem,
  type WinningContentAngleBlueprint,
} from '../../lib/brandMarketResearchEngine';
import {
  mapScrapedResultToKocItem,
  type TikTokCompetitorKocResult,
  type TikTokCompetitorProfileSummary,
} from '../../lib/tiktokKocScraper';
import {
  saveBrandProfileSectionShared,
  useBrandProfiles,
} from '../../lib/brands/useBrandProfiles';
import { brandKey } from '../../lib/brands/types';
import {
  API_CONFIG_UPDATED_EVENT,
  PROVIDER_MODELS_CATALOG,
  getEffectiveConfigForPurpose,
  loadApiWorkspaceConfig,
  type ApiProviderId,
} from '../../lib/apiKeyConfig';
import {
  executeOperationalReport,
  type OperationalReportResult,
} from '../../lib/operationalReportService';
import { formatNumber, formatVnd, formatVndShort } from '../../lib/format';
import { formatFollowers } from '../koc/kocUtils';
import {
  ActionMenu,
  Avatar,
  BrandAvatar,
  Button,
  ChannelBar,
  ChannelTag,
  DataTable,
  Field,
  FilterBar,
  Input,
  PageActions,
  Panel,
  Stat,
  StatRow,
  Status,
  Tabs,
  Textarea,
  channelOf,
} from '../ui';
import type { Column } from '../ui';

interface BrandMarketResearchHubViewProps {
  brands: BrandDetail[];
  kocs: KocItem[];
  selectedBrand?: string;
  onSaveScrapedKocs?: (payload: { created: KocItem[]; updated: KocItem[] }) => void;
  onNavigateToBrandProfile?: (brandName: string) => void;
  onNavigateToContentAngles?: () => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

type ResearchTabKey =
  | 'BRAND_STRATEGY'
  | 'COMPETITOR_INTELLIGENCE'
  | 'INSIGHTS_AND_EXECUTION';

type ResearchPlaybookMode =
  | 'COMPREHENSIVE'
  | 'COMPETITOR_DEEP_DIVE'
  | 'CONTENT_HOOKS_5'
  | 'KOC_BUDGET_ALLOCATION'
  | 'CUSTOMER_PAIN_FAQ';

interface ResearchPlaybookOption {
  id: ResearchPlaybookMode;
  label: string;
  shortPrompt: string;
  systemDirective: string;
}

const RESEARCH_PLAYBOOKS: ResearchPlaybookOption[] = [
  {
    id: 'COMPREHENSIVE',
    label: '1. Định vị 4P & Chiến lược đẩy SKU',
    shortPrompt:
      'Phân tích định vị 4P, lợi thế cạnh tranh cốt lõi, vai trò từng SKU trong phễu và đề xuất hành động thực thi tháng này.',
    systemDirective:
      'Bạn là Giám đốc Chiến lược Thương hiệu & Tăng trưởng B2C tại Upbase. Hãy phân tích sâu định vị 4P của thương hiệu, chỉ rõ SKU phễu kéo khách và SKU chủ lực tạo GMV, phân tích điểm nghẽn chuyển đổi và đưa ra kế hoạch hành động cụ thể cho đội Booking và Content.',
  },
  {
    id: 'COMPETITOR_DEEP_DIVE',
    label: '2. Mổ xẻ Đối thủ & Đòn phản công',
    shortPrompt:
      'So sánh trực diện giá bán trên từng ml/gram, hoa hồng KOC, điểm yếu bị khách hàng phàn nàn của các đối thủ và viết kịch bản phản công.',
    systemDirective:
      'Bạn là Chuyên gia Phân tích Đối thủ Cạnh tranh B2C trên TikTok Shop và Shopee Mall. Hãy đặt thương hiệu lên bàn cân đối đầu trực tiếp với từng đối thủ: so sánh đơn giá/đơn vị, tỷ lệ hoa hồng Affiliate, chỉ ra điểm yếu khách hàng phàn nàn nhiều nhất ở đối thủ và thiết kế đòn phản công trực diện trong kịch bản video KOC.',
  },
  {
    id: 'CONTENT_HOOKS_5',
    label: '3. 5 Khung kịch bản & Hook 3 giây',
    shortPrompt:
      'Thiết kế 5 góc kịch bản KOC chuyển đổi cao (Hook 3s đầu, Cảnh quay chứng minh, Thông điệp RTB, Kêu gọi mua hàng CTA) kèm danh sách từ cấm.',
    systemDirective:
      'Bạn là Trưởng nhóm Sáng tạo Nội dung & Kiểm duyệt Kịch bản B2C. Dựa trên nỗi đau khách hàng, bảo chứng RTB của nhãn hàng và điểm yếu của đối thủ, hãy viết 5 khung kịch bản video TikTok thực chiến gồm: Hook 3 giây đầu giữ chân người xem, Cảnh quay bắt buộc (Visual Proof), Lời thoại bảo chứng (RTB) và Câu kêu gọi mua hàng (CTA), đồng thời nhắc rõ các từ ngữ cấm dùng trên sàn.',
  },
  {
    id: 'KOC_BUDGET_ALLOCATION',
    label: '4. Phân bổ Ngân sách & Cơ cấu KOC',
    shortPrompt:
      'Tính toán tỷ trọng phân bổ ngân sách Order Net theo phân tầng KL1–KL4 kết hợp suất FOC 0đ để tối ưu CIR và ROAS.',
    systemDirective:
      'Bạn là Trưởng phòng Hoạch định Booking & Ngân sách B2C. Dựa trên hạn mức ngân sách Net, danh mục SKU và định mức đơn giá File 3.2, hãy lập phương án phân bổ ngân sách và số lượng video theo từng phân tầng KOC (KL1, KL2, KL3, KL4 và FOC 0đ), gắn rõ tệp kênh KOC phù hợp và chỉ tiêu ROAS/CTR mục tiêu.',
  },
  {
    id: 'CUSTOMER_PAIN_FAQ',
    label: '5. Giải mã Nỗi đau & Bộ Q&A Chốt đơn',
    shortPrompt:
      'Bóc tách rào cản tâm lý khiến khách ngần ngại mua, tổng hợp câu hỏi thường gặp từ bình luận và viết lời thoại giải đáp chuẩn.',
    systemDirective:
      'Bạn là Chuyên gia Nghiên cứu Hành vi Người mua & Tối ưu Chuyển đổi B2C. Hãy bóc tách 3 lớp tâm lý mua hàng (Nỗi đau thúc đẩy tìm kiếm, Rào cản ngần ngại thử, Bằng chứng tin cậy RTB) và chuyển hóa các cụm bình luận thắc mắc của khách hàng thành bộ câu trả lời chuẩn cho video KOC và Livestream.',
  },
];

const EXTRA_RESEARCH_SUGGESTIONS: Array<[string, string]> = [
  ['Nous', 'Thời trang & Phụ kiện Sơ sinh Mẹ & Bé'],
  ['BU Baby', 'Thời trang & Phụ kiện Sơ sinh Mẹ & Bé'],
  ['Lullaby', 'Thời trang & Phụ kiện Sơ sinh Mẹ & Bé'],
  ['Cocoon', 'Mỹ phẩm thuần chay Việt Nam'],
  ['Cỏ Mềm', 'Mỹ phẩm thiên nhiên'],
  ['La Roche-Posay', 'Dược mỹ phẩm Pháp'],
  ['SKIN1004', 'Chăm sóc da Hàn Quốc'],
  ['CeraVe', 'Dược mỹ phẩm Mỹ'],
  ['Cetaphil', 'Chăm sóc da nhạy cảm'],
  ['Bioderma', 'Dược mỹ phẩm Pháp'],
  ['SVR', 'Dược mỹ phẩm Pháp'],
  ['Obagi', 'Dược mỹ phẩm đặc trị'],
  ['Torriden', 'Chăm sóc da Hàn Quốc'],
  ['Keyshu', 'Chăm sóc da & Làm trắng'],
  ['Anessa', 'Chống nắng Nhật Bản'],
  ["L'Oréal", 'Chăm sóc da & Tóc'],
  ['Rom&nd', 'Trang điểm Hàn Quốc'],
  ['Judydoll', 'Trang điểm'],
  ['Colorkey', 'Trang điểm'],
  ['Maybelline', 'Trang điểm'],
  ['Mustela', 'Chăm sóc da Mẹ & Bé Pháp'],
  ['Bepanthen', 'Chăm sóc da Bé Đức'],
  ['Momo Rabbit', 'Tã bỉm Hàn Quốc'],
  ['Moony', 'Tã bỉm Nhật Bản'],
  ['D-nee', 'Giặt xả & Tắm gội Mẹ Bé'],
  ['Femfresh', 'Dung dịch vệ sinh Anh Quốc'],
  ['Lactacyd', 'Dung dịch vệ sinh Pháp'],
  ['Rhys Man', 'Chăm sóc cá nhân Nam giới'],
  ['Nerman', 'Chăm sóc cá nhân Nam giới'],
  ['Romano', 'Chăm sóc cá nhân Nam giới'],
];

const QUICK_RESEARCH_BRANDS = [
  'Kutieskin',
  'Cỏ Mềm',
  'Club Clio',
  "L'Occitane",
  'Rejuran',
  'La Roche-Posay',
  'Cocoon',
  'SKIN1004',
  'Nous',
];

function serializeDossierForModelContext(
  dossier: BrandMarketResearchDossier,
  options: {
    playbookMode: ResearchPlaybookMode;
    focusCompetitorName?: string;
    customQuestion?: string;
    minedClusters?: ReviewMiningCluster[];
  }
): string {
  const clusters = options.minedClusters ?? dossier.reviewClusters ?? [];
  const lines: string[] = [
    `[DỮ LIỆU PHÂN HỆ: Nghiên cứu Thị trường, Phân tích 4P & Đối thủ — ${dossier.brandName}]`,
    `[CHUYÊN ĐỀ NGHIÊN CỨU: ${options.playbookMode}]`,
    ...(options.focusCompetitorName
      ? [`[ĐỐI THỦ TRỌNG TÂM: ${options.focusCompetitorName}]`]
      : []),
    ...(options.customQuestion?.trim()
      ? [`[YÊU CẦU NGHIÊN CỨU CỤ THỂ]: ${options.customQuestion.trim()}`]
      : []),
    `- Thương hiệu: ${dossier.brandName} | Ngành hàng: ${dossier.category} | Xuất xứ: ${dossier.originCountry}`,
    `- Tóm tắt điều hành: ${dossier.executiveSummary}`,
    `- Khách hàng mục tiêu: ${dossier.positioning.targetAudience}`,
    `- Giọng điệu thương hiệu (Tone of Voice): ${dossier.positioning.toneOfVoice}`,
    `- Khoảng giá 4P: ${dossier.fourP.priceRangeText} | AOV: ${formatVnd(dossier.marketLandscape.avgOrderValueVnd)} | Mua lặp lại: ${dossier.marketLandscape.repeatPurchaseRatePct}% (${dossier.marketLandscape.replenishmentCycleDays} ngày)`,
    `- Tỷ trọng kênh bán: TikTok Shop ${dossier.fourP.channelMixRatio.tiktokShopPct}% · Shopee Mall ${dossier.fourP.channelMixRatio.shopeeMallPct}% · Kênh khác ${dossier.fourP.channelMixRatio.otherChannelsPct}%`,
    `- Nỗi đau khách hàng (Pain Points): ${(dossier.positioning.painPoints || []).join(' | ')}`,
    `- Rào cản ngần ngại (Barriers to Trial): ${(dossier.positioning.barriersToTrial || []).join(' | ')}`,
    `- Bảo chứng tin cậy (RTB): ${(dossier.positioning.rtbs || []).join(' | ')}`,
    `- Danh mục SKU chủ lực (${dossier.skuPortfolio.length} SKU):`,
    ...dossier.skuPortfolio.slice(0, 5).map(
      (s) =>
        `  + [${s.roleLabel}] ${s.productName} (${s.packSize}): Giá bán ${formatVnd(s.dealPriceVnd)} (Niêm yết ${formatVnd(s.listPriceVnd)}, -${s.discountPct}%) · HH KOC ${s.affiliateCommissionPct}% · GMV ${s.estimatedGmvSharePct}% · USP: ${s.coreIngredientsOrSpecs}`
    ),
    `- Ma trận đối thủ cạnh tranh trực diện (${dossier.competitors.length} đối thủ):`,
    ...dossier.competitors.map(
      (c) =>
        `  + Đối thủ ${c.competitorName} (${c.tiktokHandle} · ${c.originCountry}): SKU đối đầu "${c.heroSkuName}" giá ${formatVnd(c.dealPriceVnd)} (Niêm yết ${formatVnd(c.listPriceVnd)}) · HH ${c.affiliateCommissionPct}% · Mạnh: ${c.keyUsps[0] || ''} · Điểm yếu khách chê: ${c.customerComplaints[0] || ''} · Phản công: ${c.upbaseCounterPlay}`
    ),
    `- Khung góc kịch bản KOC chuyển đổi cao:`,
    ...dossier.contentAngleBlueprints.map(
      (a) =>
        `  + ${a.pillarName} (${a.bestKocTier}): Hook 3s "${a.hook3s}" | Cảnh quay: ${a.visualProof} | RTB: ${a.keyMessageRtb}`
    ),
    `- Cụm bình luận & câu hỏi khách hàng (${clusters.length} cụm):`,
    ...clusters.slice(0, 4).map(
      (c) =>
        `  + [${c.categoryLabel} - ${c.sharePct}%] ${c.topicTitle}: "${c.sampleQuotes[0] || ''}" -> Gợi ý trả lời: ${c.suggestedFaqAnswer}`
    ),
    `- Số liệu thực thi nội bộ B2C: Ngân sách Net ${formatVnd(dossier.internalExecutionAudit.totalBudgetNetVnd)} | Thực chi ${formatVnd(dossier.internalExecutionAudit.totalActualSpentNetVnd)} (${dossier.internalExecutionAudit.budgetUtilizationPct}%) | Đơn book: ${dossier.internalExecutionAudit.totalBookedOrders} | Đã Air: ${dossier.internalExecutionAudit.totalAiredVideos}`,
  ];
  return lines.join('\n');
}

export const BrandMarketResearchHubView: React.FC<BrandMarketResearchHubViewProps> = ({
  brands,
  kocs,
  selectedBrand,
  onSaveScrapedKocs,
  onNavigateToBrandProfile,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<ResearchTabKey>('BRAND_STRATEGY');

  const initialBrandName =
    selectedBrand && selectedBrand !== 'ALL' ? selectedBrand : 'Kutieskin';
  const [brandQuery, setBrandQuery] = useState<string>(initialBrandName);
  const [hasEditedBrandQuery, setHasEditedBrandQuery] = useState<boolean>(false);
  const [customCategory, setCustomCategory] = useState<string>('');
  const [customCompetitorText, setCustomCompetitorText] = useState<string>('');
  const [showAdvancedResearch, setShowAdvancedResearch] = useState<boolean>(false);
  const [tab2CompetitorInput, setTab2CompetitorInput] = useState<string>('');
  const [dealSearchQuery, setDealSearchQuery] = useState<string>('');
  const [analyzingDossier, setAnalyzingDossier] = useState<boolean>(false);
  const [savingToProfile, setSavingToProfile] = useState<boolean>(false);
  const [showApiSetupPanel, setShowApiSetupPanel] = useState<boolean>(false);
  const [isReportDrawerOpen, setIsReportDrawerOpen] = useState<boolean>(false);

  const { profiles: savedBrandProfiles } = useBrandProfiles();

  const findProfileForBrand = useCallback(
    (name: string) => {
      const targetKey = brandKey(name);
      return (
        savedBrandProfiles.find(
          (p) =>
            p.key === targetKey ||
            p.key.includes(targetKey) ||
            targetKey.includes(p.key)
        ) || null
      );
    },
    [savedBrandProfiles]
  );

  const [dossier, setDossier] = useState<BrandMarketResearchDossier>(() =>
    generateBrandMarketResearchDossier({
      brandNameOrQuery: initialBrandName,
    })
  );

  // --- State Bàn Nghiên cứu Chuyên sâu bằng Mô hình (Inline LLM Research Workbench) ---
  const [apiConfigVersion, setApiConfigVersion] = useState<number>(0);
  const effectiveApiRoute = useMemo(() => {
    void apiConfigVersion;
    const cfg = loadApiWorkspaceConfig();
    return getEffectiveConfigForPurpose('BRAND_MARKET_RESEARCH', cfg);
  }, [apiConfigVersion]);

  const [selectedProvider, setSelectedProvider] = useState<ApiProviderId>(
    () => effectiveApiRoute.primaryProvider
  );
  const [selectedModel, setSelectedModel] = useState<string>(
    () => effectiveApiRoute.primaryModel
  );
  const [activePlaybook, setActivePlaybook] =
    useState<ResearchPlaybookMode>('COMPREHENSIVE');
  const [focusCompetitorForModel, setFocusCompetitorForModel] = useState<string>('');
  const [customResearchPrompt, setCustomResearchPrompt] = useState<string>('');
  const [runningModelResearch, setRunningModelResearch] = useState<boolean>(false);
  const [modelResearchResult, setModelResearchResult] =
    useState<OperationalReportResult | null>(null);
  const [copiedModelOutput, setCopiedModelOutput] = useState<boolean>(false);

  useEffect(() => {
    const onCfgUpdated = () => {
      setApiConfigVersion((v) => v + 1);
      const latest = getEffectiveConfigForPurpose(
        'BRAND_MARKET_RESEARCH',
        loadApiWorkspaceConfig()
      );
      setSelectedProvider(latest.primaryProvider);
      setSelectedModel(latest.primaryModel);
    };
    window.addEventListener(API_CONFIG_UPDATED_EVENT, onCfgUpdated);
    return () => window.removeEventListener(API_CONFIG_UPDATED_EVENT, onCfgUpdated);
  }, []);

  const availableModels = useMemo(
    () => PROVIDER_MODELS_CATALOG[selectedProvider] || [],
    [selectedProvider]
  );

  const handleProviderChange = (prov: ApiProviderId) => {
    setSelectedProvider(prov);
    const list = PROVIDER_MODELS_CATALOG[prov] || [];
    if (list.length > 0) {
      setSelectedModel(list[0].id);
    }
  };

  // --- State Quét KOC của Đối thủ ngay trong Tab 2 ---
  const [scanningCompetitorHandle, setScanningCompetitorHandle] = useState<string | null>(
    null
  );
  const [scannedCompProfile, setScannedCompProfile] =
    useState<TikTokCompetitorProfileSummary | null>(null);
  const [scannedCompKocs, setScannedCompKocs] = useState<TikTokCompetitorKocResult[]>([]);

  // --- State Đào Bình luận & Đánh giá Khách hàng (Tab 3) ---
  const [reviewVideoUrl, setReviewVideoUrl] = useState<string>(
    () =>
      dossier.internalExecutionAudit.verifiedAiredDeals.find((d) => Boolean(d.linkAir))
        ?.linkAir || ''
  );
  const [rawReviewText, setRawReviewText] = useState<string>('');
  const [miningReviews, setMiningReviews] = useState<boolean>(false);
  const [minedClusters, setMinedClusters] = useState<ReviewMiningCluster[]>(
    () => dossier.reviewClusters
  );
  const [minedStats, setMinedStats] = useState<{
    totalLines: number;
    scrapedFromTikTok: number;
  }>({ totalLines: 0, scrapedFromTikTok: 0 });
  const [savingFaqs, setSavingFaqs] = useState<boolean>(false);

  // --- State Quét Website / Trang đích trực tiếp (Tab 3) ---
  const [inspectUrlInput, setInspectUrlInput] = useState<string>('');
  const [inspectingUrl, setInspectingUrl] = useState<boolean>(false);
  const [webInspection, setWebInspection] = useState<LiveWebInspectionResult | null>(
    null
  );

  // Thực thi nghiên cứu bằng Mô hình ngôn ngữ (Google Gemini / OpenAI / Claude / Nội bộ)
  const handleRunModelResearch = useCallback(
    async (options?: {
      targetDossier?: BrandMarketResearchDossier;
      playbook?: ResearchPlaybookMode;
      focusCompetitor?: string;
      questionOverride?: string;
    }) => {
      const d = options?.targetDossier ?? dossier;
      const mode = options?.playbook ?? activePlaybook;
      const focusComp = options?.focusCompetitor ?? focusCompetitorForModel;
      const question = options?.questionOverride ?? customResearchPrompt;

      if (options?.playbook) setActivePlaybook(options.playbook);
      if (options?.focusCompetitor !== undefined) {
        setFocusCompetitorForModel(options.focusCompetitor);
      }

      const playbookDef =
        RESEARCH_PLAYBOOKS.find((p) => p.id === mode) || RESEARCH_PLAYBOOKS[0];

      const contextText = serializeDossierForModelContext(d, {
        playbookMode: mode,
        focusCompetitorName: focusComp || undefined,
        customQuestion: question || playbookDef.shortPrompt,
        minedClusters,
      });

      const systemDirective = [
        effectiveApiRoute.purpose.systemInstruction,
        playbookDef.systemDirective,
        focusComp
          ? `Tập trung phân tích so sánh đối đầu trực tiếp giữa ${d.brandName} và đối thủ ${focusComp}.`
          : '',
        question.trim() ? `Yêu cầu trọng tâm của người dùng: ${question.trim()}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      setRunningModelResearch(true);
      try {
        const res = await executeOperationalReport({
          purposeId: 'BRAND_MARKET_RESEARCH',
          moduleTitle: `Nghiên cứu ${d.brandName}${focusComp ? ` vs. ${focusComp}` : ''} — ${playbookDef.label}`,
          inputContextText: contextText,
          customSystemInstruction: systemDirective,
          overrideProvider: selectedProvider,
          overrideModel: selectedModel,
          sourceTag: 'MARKET_RESEARCH',
        });
        setModelResearchResult(res);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Không thể thực thi mô hình nghiên cứu.';
        onNotify?.(msg, 'error');
      } finally {
        setRunningModelResearch(false);
      }
    },
    [
      activePlaybook,
      customResearchPrompt,
      dossier,
      effectiveApiRoute.purpose.systemInstruction,
      focusCompetitorForModel,
      minedClusters,
      onNotify,
      selectedModel,
      selectedProvider,
    ]
  );

  // Tự động chạy bản nghiên cứu chiến lược khởi tạo lần đầu
  const [hasInitializedModelReport, setHasInitializedModelReport] =
    useState<boolean>(false);
  useEffect(() => {
    if (!hasInitializedModelReport) {
      setHasInitializedModelReport(true);
      void handleRunModelResearch({
        targetDossier: dossier,
        playbook: 'COMPREHENSIVE',
      });
    }
  }, [dossier, handleRunModelResearch, hasInitializedModelReport]);

  const [prevSelectedBrand, setPrevSelectedBrand] = useState<string | undefined>(
    selectedBrand
  );
  if (selectedBrand !== prevSelectedBrand) {
    setPrevSelectedBrand(selectedBrand);
    if (selectedBrand && selectedBrand !== 'ALL' && selectedBrand !== brandQuery) {
      setBrandQuery(selectedBrand);
      setHasEditedBrandQuery(true);
      const nextDossier = generateBrandMarketResearchDossier({
        brandNameOrQuery: selectedBrand,
        savedBrandProfile: findProfileForBrand(selectedBrand),
      });
      setDossier(nextDossier);
      setMinedClusters(nextDossier.reviewClusters || []);
      setFocusCompetitorForModel('');
      const firstAirLink =
        nextDossier.internalExecutionAudit.verifiedAiredDeals.find((d) =>
          Boolean(d.linkAir)
        )?.linkAir || '';
      setReviewVideoUrl(firstAirLink);
      void handleRunModelResearch({
        targetDossier: nextDossier,
        playbook: activePlaybook,
        focusCompetitor: '',
      });
    }
  }

  const existingByHandle = useMemo(() => {
    const map = new Map<string, KocItem>();
    for (const k of kocs) {
      const clean = (k.channelId || '').trim().toLowerCase().replace(/^@+/, '');
      if (clean) map.set(clean, k);
    }
    return map;
  }, [kocs]);

  // Chạy phân tích tổng thể Brand & Đối thủ + Tự động tổng hợp bằng Mô hình
  const handleRunBrandAnalysis = useCallback(
    async (targetBrandName?: string, overrideCompetitors?: string[]) => {
      const parsedCompetitors =
        overrideCompetitors ??
        customCompetitorText
          .split(/[,;\n]+/)
          .map((s) => s.trim())
          .filter(Boolean);

      let target = (targetBrandName ?? brandQuery).trim();
      let compList = parsedCompetitors;

      if (
        !targetBrandName &&
        parsedCompetitors.length > 0 &&
        (!hasEditedBrandQuery || !target)
      ) {
        target = parsedCompetitors[0];
        compList = parsedCompetitors.slice(1);
        setBrandQuery(target);
        setCustomCompetitorText(compList.join(', '));
      } else if (targetBrandName) {
        setBrandQuery(target);
        setHasEditedBrandQuery(true);
      }

      if (!target) {
        onNotify?.(
          'Vui lòng chọn hoặc nhập tên thương hiệu / đối thủ cần nghiên cứu.',
          'warning'
        );
        return;
      }
      setAnalyzingDossier(true);
      try {
        const res = await fetch('/api/integrations/market-research/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'BRAND_DOSSIER',
            brandName: target,
            category: customCategory.trim() || undefined,
            competitors: compList,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success || !json.dossier) {
          throw new Error(json.message || 'Không thể phân tích hồ sơ thương hiệu.');
        }
        const nextDossier: BrandMarketResearchDossier = json.dossier;
        setDossier(nextDossier);
        setMinedClusters(nextDossier.reviewClusters || []);
        setFocusCompetitorForModel('');
        if (json.scannedCompetitorProfile) {
          setScannedCompProfile(json.scannedCompetitorProfile);
        }
        if (
          Array.isArray(json.scannedCompetitorKocs) &&
          json.scannedCompetitorKocs.length > 0
        ) {
          setScannedCompKocs(json.scannedCompetitorKocs);
        }
        if (nextDossier.liveWebInspection) {
          setWebInspection(nextDossier.liveWebInspection);
        }
        const firstAirLink =
          nextDossier.internalExecutionAudit?.verifiedAiredDeals?.find((d) =>
            Boolean(d.linkAir)
          )?.linkAir || '';
        setReviewVideoUrl(firstAirLink);

        // Chạy luôn mô hình phân tích chiến lược cho thương hiệu mới
        await handleRunModelResearch({
          targetDossier: nextDossier,
          playbook: activePlaybook,
          focusCompetitor: '',
        });

        onNotify?.(
          `Đã cập nhật hồ sơ nghiên cứu & phân tích chiến lược cho ${nextDossier.brandName}`,
          'success'
        );
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Lỗi khi phân tích thương hiệu.';
        onNotify?.(msg, 'error');
      } finally {
        setAnalyzingDossier(false);
      }
    },
    [
      activePlaybook,
      brandQuery,
      customCategory,
      customCompetitorText,
      handleRunModelResearch,
      hasEditedBrandQuery,
      onNotify,
    ]
  );

  // Đồng bộ Định vị & Đối thủ vào Hồ sơ Thương hiệu (BrandProfile)
  const handleSyncPositioningToBrandProfile = async () => {
    setSavingToProfile(true);
    try {
      const matchedProfile = findProfileForBrand(dossier.brandName);
      const currentRevision = matchedProfile?.revision ?? 0;

      await saveBrandProfileSectionShared({
        brandName: dossier.brandName,
        revision: currentRevision,
        section: 'POSITIONING',
        data: dossier.positioning,
        summary: `Cập nhật định vị, nỗi đau khách hàng & danh sách đối thủ từ Nghiên cứu thị trường`,
      });

      onNotify?.(
        `Đã lưu định vị và danh sách đối thủ vào hồ sơ thương hiệu ${dossier.brandName}`,
        'success'
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Không lưu được vào hồ sơ thương hiệu.';
      onNotify?.(msg, 'error');
    } finally {
      setSavingToProfile(false);
    }
  };

  // Lưu bộ Câu hỏi khó (FAQ) từ Đào bình luận vào Hồ sơ Thương hiệu
  const handleSyncFaqsToBrandProfile = async () => {
    setSavingFaqs(true);
    try {
      const matchedProfile = findProfileForBrand(dossier.brandName);
      const currentRevision = matchedProfile?.revision ?? 0;
      const existingFaqs = matchedProfile?.faqs || [];

      const generatedFaqs = minedClusters.map((c, idx) => ({
        id: `faq-research-${Date.now()}-${idx + 1}`,
        question: c.suggestedFaqQuestion,
        answer: c.suggestedFaqAnswer,
        mention: ['Chính hãng', 'Kiểm nghiệm an toàn', 'Đổi trả minh bạch'],
        avoid: ['Cam kết khỏi dứt điểm', 'Chữa bệnh'],
      }));

      const mergedFaqs = [...generatedFaqs, ...existingFaqs].slice(0, 20);

      await saveBrandProfileSectionShared({
        brandName: dossier.brandName,
        revision: currentRevision,
        section: 'FAQS',
        data: mergedFaqs,
        summary: `Bổ sung ${generatedFaqs.length} câu hỏi thường gặp từ phân tích bình luận khách hàng`,
      });

      onNotify?.(
        `Đã lưu ${generatedFaqs.length} câu hỏi thường gặp vào hồ sơ thương hiệu ${dossier.brandName}`,
        'success'
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Không lưu được mục câu hỏi thường gặp.';
      onNotify?.(msg, 'error');
    } finally {
      setSavingFaqs(false);
    }
  };

  // Quét KOC thực tế đang làm cho một đối thủ cụ thể
  const handleScanCompetitorKocs = useCallback(
    async (competitorHandle: string, competitorName: string) => {
      const cleanHandle = competitorHandle.trim() || competitorName.trim();
      setScanningCompetitorHandle(cleanHandle);
      try {
        const params = new URLSearchParams({
          competitor: cleanHandle,
          period: '30d',
          limit: '10',
        });
        const res = await fetch(`/api/integrations/tiktok-koc/scrape?${params.toString()}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Không quét được danh sách KOC của đối thủ.');
        }
        const resultsList: TikTokCompetitorKocResult[] = Array.isArray(json.results)
          ? json.results
          : [];
        setScannedCompProfile(json.competitorProfile || null);
        setScannedCompKocs(resultsList);

        if (resultsList.length > 0) {
          const totalViews = resultsList.reduce(
            (s, r) => s + (r.competitorCollaboration?.latestCollabViews || 0),
            0
          );
          setDossier((prev) => ({
            ...prev,
            competitors: prev.competitors.map((c) =>
              c.tiktokHandle === competitorHandle || c.competitorName === competitorName
                ? {
                    ...c,
                    estimatedMonthlyVideoCount: resultsList.length,
                    storeRatingAndSoldText: `Đã quét: ${resultsList.length} KOC (${formatNumber(totalViews)} xem)`,
                  }
                : c
            ),
          }));
        }

        onNotify?.(
          `Đã phát hiện ${resultsList.length} KOC đang đăng bài cho đối thủ ${competitorName}`,
          'success'
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi khi quét KOC đối thủ.';
        onNotify?.(msg, 'error');
      } finally {
        setScanningCompetitorHandle(null);
      }
    },
    [onNotify]
  );

  const handleSaveOneCompetitorKoc = useCallback(
    (item: TikTokCompetitorKocResult) => {
      const clean = item.handle.toLowerCase().replace(/^@+/, '');
      const existing = existingByHandle.get(clean);
      const mapped = mapScrapedResultToKocItem(item, existing);
      if (existing) {
        onSaveScrapedKocs?.({ created: [], updated: [mapped] });
      } else {
        onSaveScrapedKocs?.({ created: [mapped], updated: [] });
      }
    },
    [existingByHandle, onSaveScrapedKocs]
  );

  // Chạy Đào bình luận khách hàng
  const handleRunReviewMining = async () => {
    if (!reviewVideoUrl.trim() && !rawReviewText.trim()) {
      onNotify?.(
        'Vui lòng nhập link video TikTok hoặc dán danh sách bình luận khách hàng để bóc tách.',
        'warning'
      );
      return;
    }
    setMiningReviews(true);
    try {
      const res = await fetch('/api/integrations/market-research/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'MINE_REVIEWS',
          brandName: dossier.brandName,
          videoUrl: reviewVideoUrl.trim(),
          rawText: rawReviewText,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Không phân tích được dữ liệu bình luận.');
      }
      const nextClusters = Array.isArray(json.clusters) ? json.clusters : [];
      setMinedClusters(nextClusters);
      setMinedStats({
        totalLines: json.totalAnalyzedLines || 0,
        scrapedFromTikTok: json.scrapedCommentsCount || 0,
      });
      onNotify?.(
        `Đã phân tích ${json.totalAnalyzedLines || 0} bình luận (${json.scrapedCommentsCount || 0} bình luận từ TikTok)`,
        'success'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi phân tích bình luận.';
      onNotify?.(msg, 'error');
    } finally {
      setMiningReviews(false);
    }
  };

  // Quét trực tiếp Website / Trang đích đối thủ
  const handleInspectWebsiteUrl = async (targetUrl?: string) => {
    const urlToFetch = (targetUrl ?? inspectUrlInput).trim();
    if (!urlToFetch) {
      onNotify?.('Vui lòng nhập đường dẫn URL website cần quét.', 'warning');
      return;
    }
    setInspectingUrl(true);
    try {
      const res = await fetch('/api/integrations/market-research/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'INSPECT_URL',
          url: urlToFetch,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.inspection) {
        throw new Error(json.message || 'Không quét được trang đích.');
      }
      setWebInspection(json.inspection);
      onNotify?.(`Đã bóc tách dữ liệu trang đích ${json.inspection.domain}`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi quét trang đích.';
      onNotify?.(msg, 'error');
    } finally {
      setInspectingUrl(false);
    }
  };

  const handleDownloadCompetitorCsv = () => {
    const csv = buildCompetitorMatrixCsv(dossier);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ma-tran-doi-thu-${dossier.brandKey}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onNotify?.('Đã xuất file CSV ma trận đối thủ cạnh tranh', 'success');
  };

  const handleDownloadMarkdownDossier = () => {
    const baseMd = buildBrandResearchMarkdownReport(dossier);
    const fullMd = modelResearchResult?.outputText
      ? `${baseMd}\n\n---\n\n## BÁO CÁO PHÂN TÍCH CHUYÊN SÂU (${modelResearchResult.providerUsedLabel} · ${modelResearchResult.modelUsed})\n\n${modelResearchResult.outputText}`
      : baseMd;
    const blob = new Blob([fullMd], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ho-so-nghien-cuu-brand-${dossier.brandKey}-${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
    onNotify?.('Đã tải xuống báo cáo nghiên cứu thương hiệu (.MD)', 'success');
  };

  const handleCopyModelOutput = () => {
    if (!modelResearchResult?.outputText) return;
    navigator.clipboard.writeText(modelResearchResult.outputText);
    setCopiedModelOutput(true);
    setTimeout(() => setCopiedModelOutput(false), 1800);
  };

  // --- Cột bảng Ma trận Danh mục Sản phẩm (SKU Portfolio) ---
  const skuColumns = useMemo<Column<BrandSkuPortfolioItem>[]>(
    () => [
      {
        key: 'product',
        header: 'Dòng sản phẩm (SKU)',
        width: 240,
        render: (row) => (
          <div className="min-w-0">
            <div className="font-semibold text-ink leading-snug">{row.productName}</div>
            <div className="text-2xs text-ink-3 mt-0.5">
              <span className="font-code">{row.skuCode}</span> · {row.packSize} ·{' '}
              {row.avgRatingText}
            </div>
          </div>
        ),
      },
      {
        key: 'role',
        header: 'Vai trò trong phễu',
        width: 155,
        render: (row) => (
          <Status
            tone={
              row.role === 'HERO_CORE'
                ? 'info'
                : row.role === 'TRAFFIC_DRIVER'
                  ? 'positive'
                  : row.role === 'VIP_BUNDLE'
                    ? 'warning'
                    : 'neutral'
            }
          >
            {row.roleLabel}
          </Status>
        ),
      },
      {
        key: 'specs_need',
        header: 'Thành phần cốt lõi & Tệp khách hàng',
        width: 290,
        render: (row) => (
          <div className="space-y-0.5">
            <div className="text-xs text-ink line-clamp-2">
              {row.coreIngredientsOrSpecs}
            </div>
            <div className="text-2xs text-ink-3 line-clamp-1">
              Tệp khách: {row.targetNeed}
            </div>
          </div>
        ),
      },
      {
        key: 'pricing',
        header: 'Giá bán & Chiết khấu',
        align: 'right',
        width: 165,
        render: (row) => (
          <div className="text-right tabular-nums">
            <div className="font-semibold text-ink">
              {formatVnd(row.dealPriceVnd)}{' '}
              <span className="text-2xs font-medium text-positive">
                (-{row.discountPct}%)
              </span>
            </div>
            <div className="text-2xs text-ink-3">
              Niêm yết: <span className="line-through">{formatVnd(row.listPriceVnd)}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'commission_share',
        header: 'Hoa hồng KOC & Tỷ trọng',
        align: 'right',
        width: 170,
        render: (row) => (
          <div className="text-right tabular-nums">
            <div className="font-semibold text-positive">
              HH KOC: {row.affiliateCommissionPct}% · GMV {row.estimatedGmvSharePct}%
            </div>
            <div className="text-2xs text-ink-3">{row.monthlySalesEstimate}</div>
          </div>
        ),
      },
    ],
    []
  );

  // --- Cột bảng Phân bổ KOC theo Phân tầng KL1 - KL4 ---
  const kocTierColumns = useMemo<Column<KocTierAllocationItem>[]>(
    () => [
      {
        key: 'tier',
        header: 'Phân tầng & Quy mô',
        width: 190,
        render: (row) => (
          <div>
            <div className="font-semibold text-ink">
              <span className="font-code text-accent mr-1.5">{row.tierCode}</span>
              {row.tierLabel}
            </div>
            <div className="text-2xs text-ink-3 mt-0.5">
              Follower: {row.followerRange}
            </div>
          </div>
        ),
      },
      {
        key: 'role',
        header: 'Vai trò chuyển đổi & Định dạng',
        width: 280,
        render: (row) => (
          <div>
            <div className="text-xs text-ink">{row.funnelRole}</div>
            <div className="text-2xs text-ink-3 mt-0.5">
              Định dạng: {row.primaryFormats.join(' · ')}
            </div>
          </div>
        ),
      },
      {
        key: 'weights',
        header: 'Tỷ trọng NS / Số đơn',
        align: 'right',
        width: 150,
        render: (row) => (
          <div className="text-right tabular-nums">
            <div className="font-semibold text-ink">
              Ngân sách: {row.budgetWeightPct}%
            </div>
            <div className="text-2xs text-ink-3">
              Số lượng video: {row.videoVolumeWeightPct}%
            </div>
          </div>
        ),
      },
      {
        key: 'cost',
        header: 'Đơn giá tham chiếu (File 3.2)',
        width: 210,
        render: (row) => (
          <div className="text-xs font-medium text-ink">
            {row.avgBookingCostRangeVnd}
          </div>
        ),
      },
      {
        key: 'kpi',
        header: 'Định mức KPI mục tiêu',
        align: 'right',
        width: 175,
        render: (row) => (
          <div className="text-right tabular-nums">
            <div className="font-medium text-ink">
              ROAS {row.targetRoas} · CTR {row.targetCtrPct}
            </div>
            <div className="text-2xs text-ink-3">
              Hook 2s: {row.targetHookRate2sPct} · CVR {row.targetCvrPct}
            </div>
          </div>
        ),
      },
    ],
    []
  );

  // --- Cột bảng Khung Góc Kịch bản KOC ---
  const contentAngleColumns = useMemo<Column<WinningContentAngleBlueprint>[]>(
    () => [
      {
        key: 'pillar',
        header: 'Trụ cột kịch bản & Tệp người xem',
        width: 210,
        render: (row) => (
          <div>
            <div className="font-semibold text-ink">{row.pillarName}</div>
            <div className="text-2xs text-ink-3 mt-0.5">
              {row.targetPersona} · {row.bestKocTier}
            </div>
          </div>
        ),
      },
      {
        key: 'hook',
        header: 'Hook 3 giây mở đầu',
        width: 250,
        render: (row) => (
          <div className="text-xs font-medium text-accent leading-relaxed">
            &ldquo;{row.hook3s}&rdquo;
          </div>
        ),
      },
      {
        key: 'proof_rtb',
        header: 'Cảnh quay bắt buộc & Thông điệp RTB',
        width: 310,
        render: (row) => (
          <div className="space-y-0.5">
            <div className="text-xs text-ink">Cảnh quay: {row.visualProof}</div>
            <div className="text-2xs text-ink-3">RTB: {row.keyMessageRtb}</div>
          </div>
        ),
      },
      {
        key: 'cta',
        header: 'Kêu gọi hành động (CTA)',
        width: 190,
        render: (row) => (
          <div className="text-xs font-medium text-positive">{row.recommendedCta}</div>
        ),
      },
    ],
    []
  );

  // --- Cột bảng Quy chuẩn Kiểm duyệt Sàn ---
  const complianceColumns = useMemo<Column<PlatformComplianceRuleItem>[]>(
    () => [
      {
        key: 'risk',
        header: 'Nhóm rủi ro vi phạm',
        width: 190,
        render: (row) => (
          <div className="flex items-start gap-1.5 font-semibold text-critical">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{row.riskCategory}</span>
          </div>
        ),
      },
      {
        key: 'forbidden',
        header: 'Từ ngữ cấm dùng trên Video / Livestream',
        width: 240,
        render: (row) => (
          <div>
            <div className="font-code text-xs text-critical">
              {row.forbiddenPhrases.map((p) => `"${p}"`).join(', ')}
            </div>
            <div className="text-2xs text-ink-3 mt-0.5">
              Chế tài: {row.platformPenaltyRisk}
            </div>
          </div>
        ),
      },
      {
        key: 'safe',
        header: 'Cách diễn đạt an toàn thay thế',
        render: (row) => (
          <span className="text-xs text-positive font-medium">
            {row.safeAlternativePhrasing}
          </span>
        ),
      },
    ],
    []
  );

  // --- Cột bảng Ma trận Đối thủ Trực diện ---
  const competitorColumns = useMemo<Column<CompetitorMatrixItem>[]>(
    () => [
      {
        key: 'competitor',
        header: 'Đối thủ & Phân khúc',
        width: 205,
        render: (row) => (
          <div className="flex items-start gap-2.5 min-w-0">
            <BrandAvatar name={row.competitorName} size={28} />
            <div className="min-w-0">
              <div className="font-semibold text-ink">{row.competitorName}</div>
              <div className="text-2xs text-ink-3 font-code mt-0.5">
                {row.tiktokHandle} · {row.originCountry}
              </div>
              <div className="text-2xs text-ink-2 mt-0.5">
                {PRICE_SEGMENT_LABEL[row.priceSegment]}
              </div>
              {row.storeRatingAndSoldText && (
                <div className="text-2xs text-accent font-medium mt-0.5">
                  {row.storeRatingAndSoldText}
                </div>
              )}
            </div>
          </div>
        ),
      },
      {
        key: 'heroSku',
        header: 'SKU đối đầu & Chênh lệch giá',
        width: 225,
        render: (row) => {
          const disc =
            row.listPriceVnd > 0
              ? Math.round(
                  ((row.listPriceVnd - row.dealPriceVnd) / row.listPriceVnd) * 100
                )
              : 0;
          return (
            <div>
              <div className="font-medium text-ink line-clamp-2">{row.heroSkuName}</div>
              <div className="text-2xs tabular-nums mt-0.5">
                <strong className="text-accent">{formatVnd(row.dealPriceVnd)}</strong>{' '}
                <span className="text-ink-3 line-through">
                  {formatVnd(row.listPriceVnd)}
                </span>
                {disc > 0 && (
                  <span className="text-positive font-medium ml-1">(-{disc}%)</span>
                )}
              </div>
              {row.pricePerUnitComparison && (
                <div className="text-2xs text-warning mt-0.5">
                  {row.pricePerUnitComparison}
                </div>
              )}
            </div>
          );
        },
      },
      {
        key: 'koc_scale',
        header: 'Hoa hồng & Sàn',
        width: 145,
        render: (row) => (
          <div className="space-y-1">
            <div className="font-semibold text-positive text-xs tabular-nums">
              HH KOC: {row.affiliateCommissionPct}%
            </div>
            <ChannelBar
              showLegend={false}
              values={[
                { channel: 'tiktok', value: row.tiktokChannelSharePct },
                { channel: 'shopee', value: row.shopeeChannelSharePct },
              ]}
            />
            <div className="flex justify-between text-2xs text-ink-3 tabular-nums">
              <span>TT {row.tiktokChannelSharePct}%</span>
              <span>SP {row.shopeeChannelSharePct}%</span>
            </div>
          </div>
        ),
      },
      {
        key: 'strengthsWeaknesses',
        header: 'Điểm mạnh & Điểm yếu bị khách phàn nàn',
        width: 265,
        render: (row) => (
          <div className="space-y-1">
            <div className="text-xs text-ink line-clamp-2">
              <strong className="text-positive font-medium">+ Mạnh: </strong>
              {row.keyUsps[0]}
            </div>
            <div className="text-2xs text-ink-2 line-clamp-2">
              <strong className="text-critical font-medium">− Bị chê: </strong>
              {row.customerComplaints[0]}
            </div>
          </div>
        ),
      },
      {
        key: 'counterPlay',
        header: `Đòn phản công cho ${dossier.brandName}`,
        width: 240,
        render: (row) => (
          <div className="text-xs text-ink-2 leading-relaxed line-clamp-3">
            {row.upbaseCounterPlay}
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Thao tác nghiên cứu',
        align: 'right',
        width: 245,
        render: (row) => {
          const isScanning = scanningCompetitorHandle === row.tiktokHandle;
          return (
            <div className="flex items-center justify-end gap-1.5 flex-wrap">
              <Button
                size="sm"
                variant="primary"
                disabled={runningModelResearch}
                icon={Swords}
                onClick={() => {
                  void handleRunModelResearch({
                    playbook: 'COMPETITOR_DEEP_DIVE',
                    focusCompetitor: row.competitorName,
                    questionOverride: `So sánh đối đầu trực tiếp giữa ${dossier.brandName} và đối thủ ${row.competitorName} (${row.heroSkuName}). Chỉ ra cách khai thác điểm yếu "${row.customerComplaints[0]}" của đối thủ để viết kịch bản video KOC.`,
                  });
                }}
              >
                So sánh sâu
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={isScanning}
                icon={Users}
                onClick={() =>
                  handleScanCompetitorKocs(row.tiktokHandle, row.competitorName)
                }
              >
                {isScanning ? 'Đang quét...' : 'Quét KOC'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={analyzingDossier}
                icon={ArrowRight}
                onClick={() => void handleRunBrandAnalysis(row.competitorName, [])}
              >
                Mở hồ sơ
              </Button>
            </div>
          );
        },
      },
    ],
    [
      analyzingDossier,
      dossier.brandName,
      handleRunBrandAnalysis,
      handleRunModelResearch,
      handleScanCompetitorKocs,
      runningModelResearch,
      scanningCompetitorHandle,
    ]
  );

  // --- Cột bảng KOC Quét Thực tế của Đối thủ (Tab 2) ---
  const scannedKocColumns = useMemo<Column<TikTokCompetitorKocResult>[]>(
    () => [
      {
        key: 'koc',
        header: 'Kênh KOC & Quy mô',
        width: 220,
        render: (item) => (
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar
              name={item.channelProfile.nickname}
              src={item.channelProfile.avatarUrl}
              size={32}
            />
            <div className="min-w-0">
              <div className="font-semibold text-ink truncate">
                {item.channelProfile.nickname}
              </div>
              <div className="text-2xs text-ink-3 font-code">
                @{item.handle} ·{' '}
                {item.affiliateMetrics.suggestedClassification.tierLabel}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'metrics',
        header: 'Follower & Tương tác',
        align: 'right',
        width: 150,
        render: (item) => (
          <div className="text-right tabular-nums">
            <div className="font-semibold text-ink">
              {formatFollowers(item.channelProfile.followers)} flw
            </div>
            <div className="text-2xs text-ink-3">
              ER {item.engagementMetrics.engagementRate}% ·{' '}
              {item.competitorCollaboration.competitorVideoCount} video
            </div>
          </div>
        ),
      },
      {
        key: 'product',
        header: 'Sản phẩm đối thủ quảng bá',
        render: (item) => (
          <div className="text-xs text-ink-2 line-clamp-2">
            {item.competitorCollaboration.competitorProductPromoted}
          </div>
        ),
      },
      {
        key: 'views',
        header: 'Lượt xem video mẫu',
        align: 'right',
        width: 150,
        render: (item) => (
          <div className="text-right tabular-nums">
            <div className="font-semibold text-positive">
              {formatNumber(item.competitorCollaboration.latestCollabViews)} xem
            </div>
            {item.competitorCollaboration.latestCollabVideoUrl && (
              <a
                href={item.competitorCollaboration.latestCollabVideoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-2xs text-accent hover:underline inline-flex items-center gap-0.5"
              >
                Mở video <ArrowUpRight className="w-3 h-3" />
              </a>
            )}
          </div>
        ),
      },
      {
        key: 'action',
        header: 'Danh bạ',
        align: 'right',
        width: 120,
        render: (item) => {
          const clean = item.handle.toLowerCase().replace(/^@+/, '');
          const alreadySaved = existingByHandle.has(clean);
          return (
            <Button
              size="sm"
              variant={alreadySaved ? 'secondary' : 'primary'}
              icon={alreadySaved ? Check : UserPlus}
              onClick={() => handleSaveOneCompetitorKoc(item)}
            >
              {alreadySaved ? 'Cập nhật' : 'Lưu KOC'}
            </Button>
          );
        },
      },
    ],
    [existingByHandle, handleSaveOneCompetitorKoc]
  );

  // --- Cột bảng Gian hàng Nội bộ B2C (Tab 3) ---
  const storeAuditColumns = useMemo<Column<InternalStoreAuditItem>[]>(
    () => [
      {
        key: 'store',
        header: 'Gian hàng & Nhân sự',
        width: 220,
        render: (st) => (
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-ink">{st.storeName}</span>
              <ChannelTag channel={channelOf(st.platform)} />
            </div>
            <div className="text-2xs text-ink-3 mt-0.5">
              <span className="font-code">{st.storeId}</span> · PIC: {st.pic}
            </div>
          </div>
        ),
      },
      {
        key: 'budget',
        header: 'Hạn mức Net / Thực chi Net',
        align: 'right',
        width: 175,
        render: (st) => (
          <div className="text-right tabular-nums">
            <div className="font-semibold text-ink">
              Thực chi: {formatVnd(st.actualSpentNetVnd)}
            </div>
            <div className="text-2xs text-ink-3">
              Hạn mức: {formatVnd(st.budgetNetVnd)} ({st.utilizationPct}%)
            </div>
          </div>
        ),
      },
      {
        key: 'videos',
        header: 'Sản lượng Video (Plan → Book → Air)',
        align: 'right',
        width: 185,
        render: (st) => (
          <div className="text-right tabular-nums">
            <div className="font-medium text-ink">
              {st.totalPlannedVideos} KH →{' '}
              <strong className="text-accent">{st.totalBookedOrders}</strong> book →{' '}
              <strong className="text-positive">{st.totalAiredVideos}</strong> air
            </div>
            <div className="text-2xs text-ink-3">
              Paid {st.planPaidVideos} · Self {st.planSelfVideos} · FOC {st.planFocVideos}
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Giải ngân & Lịch Air',
        width: 175,
        render: (st) => (
          <Status
            tone={
              st.utilizationPct > 100
                ? 'critical'
                : st.scheduleAdherencePct >= 60
                  ? 'positive'
                  : 'warning'
            }
          >
            Giải ngân {st.utilizationPct}% · Đúng lịch {st.scheduleAdherencePct}%
          </Status>
        ),
      },
      {
        key: 'diagnosis',
        header: 'Chẩn đoán tiến độ',
        render: (st) => <span className="text-xs text-ink-2">{st.syncDiagnosis}</span>,
      },
    ],
    []
  );

  // --- Cột bảng Cơ cấu SKU được Book thực tế (Tab 3) ---
  const bookedProductColumns = useMemo<Column<BookedProductSummaryItem>[]>(
    () => [
      {
        key: 'productName',
        header: 'Dòng sản phẩm được book (File 3.2)',
        width: 220,
        render: (prod) => (
          <div>
            <div className="font-semibold text-ink">{prod.productName}</div>
            <div className="text-2xs text-ink-3 mt-0.5">
              Phân tầng chủ đạo: {prod.dominantTier} · {prod.dominantFormat}
            </div>
          </div>
        ),
      },
      {
        key: 'orders',
        header: 'Số đơn book',
        align: 'right',
        width: 110,
        render: (prod) => (
          <span className="font-semibold text-ink tabular-nums">
            {prod.bookedOrderCount} đơn
          </span>
        ),
      },
      {
        key: 'spent',
        header: 'Tổng chi thực tế',
        align: 'right',
        width: 150,
        render: (prod) => (
          <span className="font-semibold text-accent tabular-nums">
            {formatVnd(prod.totalSpentVnd)}
          </span>
        ),
      },
      {
        key: 'avgCost',
        header: 'Đơn giá TB / Video',
        align: 'right',
        width: 150,
        render: (prod) => (
          <span className="text-ink tabular-nums">
            {formatVnd(prod.avgCostPerVideoVnd)}
          </span>
        ),
      },
      {
        key: 'samples',
        header: 'Video mẫu đã lên sóng',
        align: 'right',
        render: (prod) => (
          <div className="flex flex-wrap justify-end gap-1.5">
            {prod.sampleVideoLinks.length > 0 ? (
              prod.sampleVideoLinks.map((url, uIdx) => (
                <a
                  key={uIdx}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded border border-line bg-surface px-2 py-0.5 text-2xs font-medium text-accent hover:bg-sunken"
                >
                  Clip #{uIdx + 1} <ExternalLink className="w-3 h-3" />
                </a>
              ))
            ) : (
              <span className="text-2xs text-ink-3">—</span>
            )}
          </div>
        ),
      },
    ],
    []
  );

  // --- Cột bảng Đơn Booking Thực tế đã lên sóng (File 3.2) ---
  const airedDealsColumns = useMemo<Column<VerifiedBookedDealEvidenceItem>[]>(
    () => [
      {
        key: 'dealCode',
        header: 'Mã đơn & Kênh KOC',
        width: 195,
        render: (row) => (
          <div>
            <div className="font-semibold text-ink">
              @{row.channelId}{' '}
              <span className="font-code text-2xs font-normal text-ink-3">
                · {row.klTier}
              </span>
            </div>
            <div className="text-2xs text-ink-3 mt-0.5">
              <span className="font-code text-accent">{row.dealCode}</span> ·{' '}
              {row.storeName} · PIC: {row.pic}
            </div>
          </div>
        ),
      },
      {
        key: 'product_format',
        header: 'Sản phẩm & Định dạng',
        width: 200,
        render: (row) => (
          <div>
            <div className="font-medium text-ink">{row.productName}</div>
            <div className="text-2xs text-ink-3 mt-0.5">
              {row.format} · {row.videoType}
            </div>
          </div>
        ),
      },
      {
        key: 'cost_air',
        header: 'Chi phí Net & Ngày Air',
        align: 'right',
        width: 155,
        render: (row) => (
          <div className="text-right tabular-nums">
            <div className="font-semibold text-ink">{formatVnd(row.costVnd)}</div>
            <div className="text-2xs text-ink-3">
              Air: {row.actualAirDate} (KH: {row.plannedAirDate})
            </div>
          </div>
        ),
      },
      {
        key: 'performance',
        header: 'Lượt xem & Doanh thu Seller',
        align: 'right',
        width: 175,
        render: (row) => (
          <div className="text-right tabular-nums">
            {row.sellerGmvVnd !== undefined ? (
              <>
                <div className="font-semibold text-positive">
                  GMV: {formatVnd(row.sellerGmvVnd)} · ROAS {row.roas || 0}x
                </div>
                <div className="text-2xs text-ink-3">
                  {formatNumber(row.views || 0)} xem · {row.sellerOrders || 0} đơn
                </div>
              </>
            ) : (
              <span className="text-2xs text-ink-3">Đối soát lịch Air W40–W45</span>
            )}
          </div>
        ),
      },
      {
        key: 'proofLink',
        header: 'Video Air',
        align: 'right',
        width: 120,
        render: (row) =>
          row.linkAir ? (
            <a
              href={row.linkAir}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-line-strong bg-surface px-2.5 h-7 text-2xs font-medium text-accent hover:bg-sunken"
            >
              Mở video
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="text-2xs text-ink-3">—</span>
          ),
      },
    ],
    []
  );

  const filteredAiredDeals = useMemo(() => {
    const list = dossier.internalExecutionAudit.verifiedAiredDeals;
    if (!dealSearchQuery.trim()) return list;
    const q = dealSearchQuery.trim().toLowerCase();
    return list.filter(
      (d) =>
        d.dealCode.toLowerCase().includes(q) ||
        d.channelId.toLowerCase().includes(q) ||
        d.productName.toLowerCase().includes(q) ||
        d.storeName.toLowerCase().includes(q) ||
        d.pic.toLowerCase().includes(q)
    );
  }, [dossier.internalExecutionAudit.verifiedAiredDeals, dealSearchQuery]);

  // Tính toán chỉ số so sánh nhanh giữa Brand và Trung bình nhóm đối thủ
  const competitorBenchmarkSummary = useMemo(() => {
    const heroSku =
      dossier.skuPortfolio.find((s) => s.role === 'HERO_CORE') ||
      dossier.skuPortfolio[0];
    const brandHeroPrice =
      heroSku?.dealPriceVnd || dossier.marketLandscape.avgOrderValueVnd;
    const brandHeroCommission = heroSku?.affiliateCommissionPct || 12;

    if (dossier.competitors.length === 0) {
      return {
        brandHeroName: heroSku?.productName || dossier.brandName,
        brandHeroPrice,
        brandHeroCommission,
        avgCompPrice: brandHeroPrice,
        avgCompCommission: 10,
        priceDiffPct: 0,
      };
    }

    const avgCompPrice = Math.round(
      dossier.competitors.reduce((s, c) => s + c.dealPriceVnd, 0) /
        dossier.competitors.length
    );
    const avgCompCommission =
      Math.round(
        (dossier.competitors.reduce((s, c) => s + c.affiliateCommissionPct, 0) /
          dossier.competitors.length) *
          10
      ) / 10;
    const priceDiffPct =
      avgCompPrice > 0
        ? Math.round(((brandHeroPrice - avgCompPrice) / avgCompPrice) * 100)
        : 0;

    return {
      brandHeroName: heroSku?.productName || dossier.brandName,
      brandHeroPrice,
      brandHeroCommission,
      avgCompPrice,
      avgCompCommission,
      priceDiffPct,
    };
  }, [dossier]);

  return (
    <div className="space-y-5">
      <PageActions>
        <Button
          size="sm"
          variant="ghost"
          icon={Sliders}
          onClick={() => setShowApiSetupPanel((v) => !v)}
        >
          {showApiSetupPanel ? 'Ẩn cấu hình API' : 'Cấu hình API'}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          icon={FileText}
          onClick={() => setIsReportDrawerOpen(true)}
        >
          Báo cáo phân tích
        </Button>
        <ActionMenu
          items={[
            ...(onNavigateToBrandProfile
              ? [
                  {
                    label: `Mở hồ sơ ${dossier.brandName}`,
                    icon: BookOpen,
                    onSelect: () => onNavigateToBrandProfile(dossier.brandName),
                  },
                ]
              : []),
            {
              label: 'Xuất báo cáo nghiên cứu (.md)',
              icon: Download,
              onSelect: handleDownloadMarkdownDossier,
            },
            {
              label: 'Xuất bảng đối thủ (.csv)',
              icon: Download,
              onSelect: handleDownloadCompetitorCsv,
            },
          ]}
        />
        <Button
          size="sm"
          variant="primary"
          disabled={savingToProfile}
          icon={Check}
          onClick={handleSyncPositioningToBrandProfile}
        >
          Lưu định vị vào hồ sơ
        </Button>
      </PageActions>

      {showApiSetupPanel && (
        <InlinePurposeApiSetup purposeId="BRAND_MARKET_RESEARCH" />
      )}

      {/* ===================================================================== */}
      {/* 1. THANH ĐIỀU KHIỂN THƯƠNG HIỆU & CHỌN NHANH NHÃN HÀNG                 */}
      {/* ===================================================================== */}
      <div className="bg-surface border border-line rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BrandAvatar name={dossier.brandName} size={38} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-ink truncate">
                  {dossier.brandName}
                </h2>
                <Status tone={dossier.isUpbaseManaged ? 'positive' : 'info'}>
                  {dossier.isUpbaseManaged
                    ? `${dossier.internalExecutionAudit.totalStoresCount} gian hàng B2C`
                    : 'Thương hiệu mở rộng'}
                </Status>
                <span className="text-xs text-ink-3">
                  {dossier.category} · {dossier.originCountry}
                  {dossier.accountPic ? ` · Quản lý: ${dossier.accountPic}` : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-72">
              <Input
                type="text"
                list="b2c-brand-research-list"
                aria-label="Thương hiệu hoặc đối thủ cần nghiên cứu"
                value={brandQuery}
                onChange={(e) => {
                  setBrandQuery(e.target.value);
                  setHasEditedBrandQuery(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    void handleRunBrandAnalysis(brandQuery);
                  }
                }}
                placeholder="Nhập tên thương hiệu hoặc đối thủ…"
                className="pr-8"
              />
              {brandQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setBrandQuery('');
                    setHasEditedBrandQuery(true);
                  }}
                  title="Xóa để nhập tên mới"
                  aria-label="Xóa tên thương hiệu"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink text-sm px-1"
                >
                  ×
                </button>
              )}
              <datalist id="b2c-brand-research-list">
                {QUICK_RESEARCH_BRANDS.map((name) => (
                  <option key={`quick-${name}`} value={name} />
                ))}
                {brands.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.category}
                  </option>
                ))}
                {EXTRA_RESEARCH_SUGGESTIONS.map(([name, category]) => (
                  <option key={`extra-${name}`} value={name}>
                    {category}
                  </option>
                ))}
              </datalist>
            </div>
            <Button
              variant="ghost"
              aria-expanded={showAdvancedResearch}
              onClick={() => setShowAdvancedResearch((v) => !v)}
            >
              Thêm đối thủ so sánh
              {customCategory || customCompetitorText ? ' (đang bật)' : ''}
            </Button>
            <Button
              variant="primary"
              disabled={analyzingDossier}
              icon={Search}
              onClick={() => void handleRunBrandAnalysis()}
            >
              {analyzingDossier ? 'Đang phân tích…' : 'Phân tích'}
            </Button>
          </div>
        </div>

        {/* Hàng chọn nhanh thương hiệu tiêu biểu */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-line">
          <span className="text-2xs font-semibold text-ink-3 mr-1">Chọn nhanh:</span>
          {QUICK_RESEARCH_BRANDS.map((name) => {
            const active =
              brandKey(dossier.brandName) === brandKey(name) ||
              dossier.brandName.toLowerCase() === name.toLowerCase();
            return (
              <button
                key={name}
                type="button"
                onClick={() => void handleRunBrandAnalysis(name)}
                className={`px-2.5 py-1 rounded-md text-2xs font-medium transition cursor-pointer ${
                  active
                    ? 'bg-accent text-surface font-semibold'
                    : 'bg-canvas text-ink-2 hover:bg-sunken border border-line'
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>

        {showAdvancedResearch && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-line">
            <Field label="Ngành hàng cụ thể">
              <Input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder={dossier.category}
              />
            </Field>
            <Field label="Danh sách đối thủ cần đặt lên bàn cân (cách nhau bằng dấu phẩy)">
              <Input
                type="text"
                value={customCompetitorText}
                onChange={(e) => setCustomCompetitorText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    void handleRunBrandAnalysis();
                  }
                }}
                placeholder="VD: Mustela, Bepanthen, Nous, Cocoon..."
              />
            </Field>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 2. HÀNG CHỈ SỐ CỐT LÕI (4 THẺ MẠCH LẠC)                              */}
      {/* ===================================================================== */}
      <StatRow size="sm">
        <Stat
          label="Khoảng giá & AOV"
          value={dossier.fourP.priceRangeText}
          note={`AOV ${formatVndShort(dossier.marketLandscape.avgOrderValueVnd)} · Mua lặp lại ${dossier.marketLandscape.repeatPurchaseRatePct}% (${dossier.marketLandscape.replenishmentCycleDays} ngày)`}
        />
        <Stat
          label="SKU chủ lực & Hoa hồng"
          value={competitorBenchmarkSummary.brandHeroName}
          note={`Giá chốt: ${formatVnd(competitorBenchmarkSummary.brandHeroPrice)} · HH KOC: ${dossier.fourP.affiliateCommissionRange}`}
        />
        <Stat
          label="Tương quan với Đối thủ"
          value={`${dossier.competitors.length} đối thủ trực diện`}
          note={`Giá TB đối thủ: ${formatVnd(competitorBenchmarkSummary.avgCompPrice)} · HH TB: ${competitorBenchmarkSummary.avgCompCommission}%`}
        />
        <Stat
          label="Thực thi Booking B2C"
          value={
            dossier.internalExecutionAudit.totalBudgetNetVnd > 0
              ? `${formatVndShort(dossier.internalExecutionAudit.totalActualSpentNetVnd)} / ${formatVndShort(dossier.internalExecutionAudit.totalBudgetNetVnd)}`
              : `${dossier.internalExecutionAudit.totalBookedOrders} đơn book`
          }
          progress={
            dossier.internalExecutionAudit.totalBudgetNetVnd > 0
              ? {
                  value: dossier.internalExecutionAudit.totalActualSpentNetVnd,
                  max: dossier.internalExecutionAudit.totalBudgetNetVnd,
                }
              : undefined
          }
          note={`${dossier.internalExecutionAudit.totalBookedOrders} đơn book · ${dossier.internalExecutionAudit.totalAiredVideos} video đã Air (Đúng hạn ${dossier.internalExecutionAudit.onTimeAirRatePct}%)`}
        />
      </StatRow>

      {/* ===================================================================== */}
      {/* 3. BÀN NGHIÊN CỨU CHUYÊN SÂU BẰNG MÔ HÌNH NGÔN NGỮ                    */}
      {/* ===================================================================== */}
      <Panel
        title={`Trợ lý nghiên cứu chiến lược & đối thủ: ${dossier.brandName}${
          focusCompetitorForModel ? ` vs. ${focusCompetitorForModel}` : ''
        }`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedProvider}
              onChange={(e) => handleProviderChange(e.target.value as ApiProviderId)}
              aria-label="Chọn nhà cung cấp mô hình"
              className="px-2.5 py-1 bg-surface border border-line rounded-md text-2xs font-semibold text-ink outline-none"
            >
              <option value="GOOGLE">Google Gemini</option>
              <option value="OPENAI">OpenAI ChatGPT</option>
              <option value="CLAUDE">Anthropic Claude</option>
              <option value="INTERNAL">Xử lý nội bộ Upbase</option>
            </select>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              aria-label="Chọn mô hình phân tích"
              className="px-2.5 py-1 bg-surface border border-line rounded-md text-2xs font-code text-ink outline-none"
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="secondary"
              icon={Sliders}
              onClick={() => setIsReportDrawerOpen(true)}
            >
              Tùy chỉnh câu lệnh
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* 5 Chuyên đề nghiên cứu bấm chạy ngay */}
          <div className="flex flex-wrap items-center gap-2">
            {RESEARCH_PLAYBOOKS.map((pb) => {
              const isSelected = activePlaybook === pb.id;
              return (
                <button
                  key={pb.id}
                  type="button"
                  disabled={runningModelResearch}
                  onClick={() => {
                    void handleRunModelResearch({
                      playbook: pb.id,
                      focusCompetitor:
                        pb.id === 'COMPETITOR_DEEP_DIVE'
                          ? focusCompetitorForModel
                          : '',
                    });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
                    isSelected
                      ? 'bg-ink text-surface border-ink font-semibold'
                      : 'bg-canvas text-ink hover:bg-sunken border-line'
                  }`}
                >
                  {pb.label}
                </button>
              );
            })}
          </div>

          {/* Ô đặt câu hỏi nghiên cứu tùy chỉnh + Chọn đối thủ trọng tâm */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
            <div className="lg:col-span-3">
              <select
                value={focusCompetitorForModel}
                onChange={(e) => {
                  const nextComp = e.target.value;
                  setFocusCompetitorForModel(nextComp);
                  if (nextComp) {
                    void handleRunModelResearch({
                      playbook: 'COMPETITOR_DEEP_DIVE',
                      focusCompetitor: nextComp,
                    });
                  }
                }}
                className="w-full h-9 px-3 bg-surface border border-line rounded-lg text-xs text-ink outline-none"
              >
                <option value="">So sánh tất cả ({dossier.competitors.length} đối thủ)</option>
                {dossier.competitors.map((c) => (
                  <option key={c.id} value={c.competitorName}>
                    Đối đầu 1-1: {dossier.brandName} vs. {c.competitorName}
                  </option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-7">
              <Input
                type="text"
                value={customResearchPrompt}
                onChange={(e) => setCustomResearchPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    void handleRunModelResearch();
                  }
                }}
                placeholder={`Nhập đề bài nghiên cứu sâu cho ${dossier.brandName} (VD: So sánh giá/ml với đối thủ, viết 3 hook cho tệp Mẹ bỉm, cách xử lý chê giá đắt...)`}
              />
            </div>
            <div className="lg:col-span-2">
              <Button
                variant="primary"
                disabled={runningModelResearch}
                icon={RefreshCw}
                onClick={() => void handleRunModelResearch()}
                className="w-full justify-center"
              >
                {runningModelResearch ? 'Đang phân tích...' : 'Chạy nghiên cứu'}
              </Button>
            </div>
          </div>

          {/* Khung hiển thị kết quả phân tích của Mô hình */}
          <div className="rounded-xl border border-line bg-canvas overflow-hidden">
            <div className="px-4 py-2.5 bg-surface border-b border-line flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-2xs">
                <Status tone={modelResearchResult?.usedFallback ? 'warning' : 'info'}>
                  {modelResearchResult
                    ? `${modelResearchResult.providerUsedLabel} · ${modelResearchResult.modelUsed}`
                    : `${selectedProvider} · ${selectedModel}`}
                </Status>
                {modelResearchResult && (
                  <span className="text-ink-3 tabular-nums">
                    Phản hồi {modelResearchResult.latencyMs}ms
                    {modelResearchResult.usage
                      ? ` · ${formatNumber(modelResearchResult.usage.totalTokens)} tokens`
                      : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!modelResearchResult?.outputText}
                  icon={copiedModelOutput ? Check : Copy}
                  onClick={handleCopyModelOutput}
                >
                  {copiedModelOutput ? 'Đã chép' : 'Sao chép'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Download}
                  onClick={handleDownloadMarkdownDossier}
                >
                  Tải báo cáo (.md)
                </Button>
              </div>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto">
              {runningModelResearch ? (
                <div className="py-8 flex items-center justify-center gap-2.5 text-xs text-ink-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-accent" />
                  <span>
                    Đang tổng hợp dữ liệu 4P, danh mục SKU và ma trận đối thủ của{' '}
                    <strong>{dossier.brandName}</strong>...
                  </span>
                </div>
              ) : modelResearchResult?.outputText ? (
                <div className="space-y-1.5 text-xs text-ink leading-relaxed font-sans">
                  {modelResearchResult.outputText.split('\n').map((line, idx) => {
                    const trimmed = line.trim();
                    if (!trimmed) {
                      return <div key={idx} className="h-1.5" />;
                    }
                    if (/^[═─]{5,}$/.test(trimmed)) {
                      return <hr key={idx} className="border-line my-2" />;
                    }
                    if (/^(\d+\.|PHÂN TÍCH|BÁO CÁO|5 KHUNG|PHƯƠNG ÁN|GIẢI MÃ)/.test(trimmed)) {
                      return (
                        <div
                          key={idx}
                          className="font-semibold text-ink pt-1.5 text-xs"
                        >
                          {trimmed}
                        </div>
                      );
                    }
                    if (trimmed.startsWith('[Góc') || trimmed.startsWith('[Cụm')) {
                      return (
                        <div
                          key={idx}
                          className="font-semibold text-accent pt-1 text-xs"
                        >
                          {trimmed}
                        </div>
                      );
                    }
                    return (
                      <div key={idx} className="text-ink-2 pl-1">
                        {line}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-ink-3 py-4">
                  Chọn một chuyên đề phía trên hoặc bấm &ldquo;Chạy nghiên cứu&rdquo; để
                  tổng hợp báo cáo chiến lược.
                </div>
              )}
            </div>
          </div>
        </div>
      </Panel>

      {/* ===================================================================== */}
      {/* 4. BA TAB NGHIÊN CỨU MẠCH LẠC (THAY CHO 5 TAB RỐI RẮM CŨ)             */}
      {/* ===================================================================== */}
      <Tabs<ResearchTabKey>
        value={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'BRAND_STRATEGY',
            label: '1. Định vị thương hiệu, 4P & SKU',
            count: dossier.skuPortfolio.length,
          },
          {
            key: 'COMPETITOR_INTELLIGENCE',
            label: '2. Bàn cân đối thủ & Quét KOC',
            count: dossier.competitors.length,
          },
          {
            key: 'INSIGHTS_AND_EXECUTION',
            label: '3. Đào bình luận, Quét web & Thực thi',
            count:
              minedClusters.length +
              dossier.internalExecutionAudit.verifiedAiredDeals.length,
          },
        ]}
      />

      {/* ===================================================================== */}
      {/* TAB 1: ĐỊNH VỊ THƯƠNG HIỆU, 4P, DANH MỤC SKU & KHUNG KỊCH BẢN         */}
      {/* ===================================================================== */}
      {activeTab === 'BRAND_STRATEGY' && (
        <div className="space-y-5">
          {/* Khối 1: Tâm lý mua hàng 3 cột (Nỗi đau · Rào cản · Bảo chứng RTB) */}
          <Panel title={`Định vị cốt lõi & Tâm lý người mua: ${dossier.brandName}`}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-lg bg-canvas border border-line space-y-1">
                  <div className="text-2xs font-semibold text-ink-3">
                    Định vị & Quy mô vận hành
                  </div>
                  <p className="text-xs text-ink leading-relaxed">
                    {dossier.positioning.story}
                  </p>
                </div>
                <div className="p-3.5 rounded-lg bg-canvas border border-line space-y-1">
                  <div className="text-2xs font-semibold text-ink-3">
                    Chân dung khách hàng mục tiêu
                  </div>
                  <p className="text-xs text-ink leading-relaxed">
                    {dossier.positioning.targetAudience}
                  </p>
                </div>
                <div className="p-3.5 rounded-lg bg-canvas border border-line space-y-1">
                  <div className="text-2xs font-semibold text-ink-3">
                    Giọng điệu nội dung (Tone of Voice)
                  </div>
                  <p className="text-xs text-ink leading-relaxed">
                    {dossier.positioning.toneOfVoice}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-line border border-line rounded-lg bg-surface">
                <div className="p-4 space-y-2">
                  <div className="text-xs font-semibold text-critical">
                    1. Nỗi đau khách hàng (Pain Points)
                  </div>
                  <ul className="space-y-1.5">
                    {(dossier.positioning.painPoints || []).map((item, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-ink-2 pl-2.5 border-l-2 border-critical leading-relaxed"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 space-y-2">
                  <div className="text-xs font-semibold text-warning">
                    2. Rào cản ngần ngại thử (Barriers)
                  </div>
                  <ul className="space-y-1.5">
                    {(dossier.positioning.barriersToTrial || []).map((item, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-ink-2 pl-2.5 border-l-2 border-warning leading-relaxed"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 space-y-2">
                  <div className="text-xs font-semibold text-positive">
                    3. Bảo chứng tin cậy (Reasons to Believe)
                  </div>
                  <ul className="space-y-1.5">
                    {(dossier.positioning.rtbs || []).map((item, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-ink-2 pl-2.5 border-l-2 border-positive leading-relaxed"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Panel>

          {/* Khối 2: Bóc tách 4P trong lưới 2x2 mạch lạc */}
          <Panel title="Cấu trúc 4P thực chiến (Product · Price · Place · Promotion)">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-line bg-canvas space-y-2">
                <div className="text-xs font-semibold text-ink">
                  P1 — Sản phẩm & Lợi điểm độc nhất (Product USP)
                </div>
                <p className="text-xs text-ink-2 leading-relaxed">
                  {dossier.fourP.productStrategy}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {dossier.fourP.keyIngredientsOrSpecs.map((spec, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 rounded bg-surface border border-line text-2xs text-ink"
                    >
                      • {spec}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-lg border border-line bg-canvas space-y-2">
                <div className="text-xs font-semibold text-ink">
                  P2 — Chiến lược Giá, Chiết khấu & Hoa hồng Affiliate
                </div>
                <p className="text-xs text-ink-2 leading-relaxed">
                  {dossier.fourP.priceStrategy}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-2xs">
                  <span className="px-2 py-0.5 rounded bg-surface border border-line font-semibold text-ink">
                    Khoảng giá: {dossier.fourP.priceRangeText}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface border border-line font-semibold text-positive">
                    Chiết khấu Deal TB: -{dossier.fourP.avgDealDiscountPct}%
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface border border-line font-semibold text-accent">
                    Hoa hồng KOC: {dossier.fourP.affiliateCommissionRange}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-line bg-canvas space-y-2">
                <div className="text-xs font-semibold text-ink">
                  P3 — Kênh phân phối & Tỷ trọng Doanh số Sàn
                </div>
                <p className="text-xs text-ink-2 leading-relaxed">
                  {dossier.fourP.placeStrategy}
                </p>
                <div className="pt-1">
                  <ChannelBar
                    values={[
                      {
                        channel: 'tiktok',
                        value: dossier.fourP.channelMixRatio.tiktokShopPct,
                      },
                      {
                        channel: 'shopee',
                        value: dossier.fourP.channelMixRatio.shopeeMallPct,
                      },
                      {
                        channel: 'other',
                        value: dossier.fourP.channelMixRatio.otherChannelsPct,
                      },
                    ]}
                  />
                </div>
              </div>

              <div className="p-4 rounded-lg border border-line bg-canvas space-y-2">
                <div className="text-xs font-semibold text-ink">
                  P4 — Cơ chế Gom đơn, Combo & Quà tặng (Promotion)
                </div>
                <ul className="space-y-1.5">
                  {dossier.fourP.winningBundleMechanics.map((item, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-ink-2 pl-2.5 border-l-2 border-accent leading-relaxed"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Panel>

          {/* Khối 3: Danh mục sản phẩm SKU */}
          <Panel
            flush
            title={`Danh mục sản phẩm chủ lực (${dossier.skuPortfolio.length} dòng SKU)`}
          >
            <DataTable<BrandSkuPortfolioItem>
              columns={skuColumns}
              rows={dossier.skuPortfolio}
              rowKey={(r) => r.id}
              empty="Chưa có danh mục SKU."
            />
          </Panel>

          {/* Khối 4: Khung góc kịch bản KOC & Phân bổ khung lương KL1-KL4 */}
          <Panel
            flush
            title={`Khung góc kịch bản KOC chuyển đổi cao (${dossier.contentAngleBlueprints.length} trụ cột nội dung)`}
            actions={
              <Button
                size="sm"
                variant="secondary"
                icon={Target}
                onClick={() =>
                  void handleRunModelResearch({ playbook: 'CONTENT_HOOKS_5' })
                }
              >
                Viết 5 kịch bản chi tiết bằng mô hình
              </Button>
            }
          >
            <DataTable<WinningContentAngleBlueprint>
              columns={contentAngleColumns}
              rows={dossier.contentAngleBlueprints}
              rowKey={(r) => r.id}
              empty="Chưa có khung góc kịch bản."
            />
          </Panel>

          <Panel
            flush
            title="Cơ cấu phân bổ ngân sách KOC theo phân tầng (KL1 – KL4)"
          >
            <DataTable<KocTierAllocationItem>
              columns={kocTierColumns}
              rows={dossier.kocTierStrategy}
              rowKey={(r) => r.tierCode}
              empty="Chưa có dữ liệu phân tầng KOC."
            />
          </Panel>

          {/* Khối 5: SWOT & Từ khóa cấm kiểm duyệt sàn */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <Panel
              title="Ma trận SWOT thương hiệu"
              className="lg:col-span-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 border border-line rounded-lg overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-line">
                <div className="divide-y divide-line">
                  <div className="p-3.5 space-y-1.5">
                    <div className="text-xs font-semibold text-positive">
                      Điểm mạnh (Strengths)
                    </div>
                    <ul className="space-y-1.5">
                      {dossier.swotAndCompliance.strengths.map((s, i) => (
                        <li key={i} className="text-xs">
                          <div className="font-medium text-ink">{s.point}</div>
                          <div className="text-2xs text-ink-3">→ {s.strategicImpact}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3.5 space-y-1.5">
                    <div className="text-xs font-semibold text-accent">
                      Cơ hội (Opportunities)
                    </div>
                    <ul className="space-y-1.5">
                      {dossier.swotAndCompliance.opportunities.map((o, i) => (
                        <li key={i} className="text-xs">
                          <div className="font-medium text-ink">{o.point}</div>
                          <div className="text-2xs text-ink-3">→ {o.strategicImpact}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="divide-y divide-line">
                  <div className="p-3.5 space-y-1.5">
                    <div className="text-xs font-semibold text-warning">
                      Điểm yếu (Weaknesses)
                    </div>
                    <ul className="space-y-1.5">
                      {dossier.swotAndCompliance.weaknesses.map((w, i) => (
                        <li key={i} className="text-xs">
                          <div className="font-medium text-ink">{w.point}</div>
                          <div className="text-2xs text-ink-3">→ {w.strategicImpact}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3.5 space-y-1.5">
                    <div className="text-xs font-semibold text-critical">
                      Thách thức (Threats)
                    </div>
                    <ul className="space-y-1.5">
                      {dossier.swotAndCompliance.threats.map((t, i) => (
                        <li key={i} className="text-xs">
                          <div className="font-medium text-ink">{t.point}</div>
                          <div className="text-2xs text-ink-3">→ {t.strategicImpact}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel
              flush
              title="Quy chuẩn kiểm duyệt sàn & Từ ngữ cấm (TikTok / Shopee)"
              className="lg:col-span-6"
            >
              <DataTable<PlatformComplianceRuleItem>
                columns={complianceColumns}
                rows={dossier.swotAndCompliance.platformComplianceRules}
                rowKey={(r) => r.riskCategory}
                empty="Chưa có quy chuẩn kiểm duyệt."
              />
            </Panel>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: BÀN CÂN ĐỐI THỦ TRỰC DIỆN & QUÉT KOC ĐỐI THỦ                    */}
      {/* ===================================================================== */}
      {activeTab === 'COMPETITOR_INTELLIGENCE' && (
        <div className="space-y-5">
          {/* Thẻ so sánh vị thế thương hiệu vs. Trung bình đối thủ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-line bg-surface space-y-1">
              <div className="text-2xs font-semibold text-ink-3">
                SKU Chủ lực của {dossier.brandName}
              </div>
              <div className="text-sm font-semibold text-ink truncate">
                {competitorBenchmarkSummary.brandHeroName}
              </div>
              <div className="text-xs text-accent font-medium tabular-nums">
                Giá chốt: {formatVnd(competitorBenchmarkSummary.brandHeroPrice)} · Hoa hồng KOC:{' '}
                {competitorBenchmarkSummary.brandHeroCommission}%
              </div>
            </div>

            <div className="p-4 rounded-xl border border-line bg-surface space-y-1">
              <div className="text-2xs font-semibold text-ink-3">
                Mặt bằng {dossier.competitors.length} đối thủ trực diện
              </div>
              <div className="text-sm font-semibold text-ink tabular-nums">
                Giá TB: {formatVnd(competitorBenchmarkSummary.avgCompPrice)}{' '}
                <span className="text-2xs font-normal text-ink-3">
                  ({competitorBenchmarkSummary.priceDiffPct <= 0
                    ? `${dossier.brandName} tối ưu hơn ${Math.abs(competitorBenchmarkSummary.priceDiffPct)}%`
                    : `Cao hơn TB đối thủ +${competitorBenchmarkSummary.priceDiffPct}%`})
                </span>
              </div>
              <div className="text-xs text-positive font-medium tabular-nums">
                Hoa hồng KOC TB đối thủ: {competitorBenchmarkSummary.avgCompCommission}%
              </div>
            </div>

            <div className="p-4 rounded-xl border border-line bg-surface flex flex-col justify-between gap-2">
              <div className="text-2xs font-semibold text-ink-3">
                Tổng hợp chiến lược phản công bằng mô hình
              </div>
              <Button
                size="sm"
                variant="primary"
                disabled={runningModelResearch}
                icon={Swords}
                onClick={() =>
                  void handleRunModelResearch({
                    playbook: 'COMPETITOR_DEEP_DIVE',
                    focusCompetitor: '',
                  })
                }
              >
                Phân tích điểm yếu {dossier.competitors.length} đối thủ & viết kịch bản phản công
              </Button>
            </div>
          </div>

          <Panel
            flush
            title={`Ma trận đối đầu trực diện: ${dossier.brandName} vs. ${dossier.competitors.length} đối thủ cùng phân khúc`}
            actions={
              <Button
                size="sm"
                variant="secondary"
                icon={Download}
                onClick={handleDownloadCompetitorCsv}
              >
                Xuất CSV
              </Button>
            }
          >
            <div className="px-4 py-3 border-b border-line bg-canvas/50 flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
              <div className="flex-1">
                <Input
                  type="text"
                  list="b2c-brand-research-list"
                  value={tab2CompetitorInput}
                  onChange={(e) => setTab2CompetitorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tab2CompetitorInput.trim()) {
                      void handleRunBrandAnalysis(dossier.brandName, [
                        ...dossier.competitors.map((c) => c.competitorName),
                        tab2CompetitorInput.trim(),
                      ]);
                    }
                  }}
                  placeholder="Nhập thêm tên đối thủ hoặc @handle TikTok để đưa vào bảng so sánh hoặc quét KOC (VD: Mustela, Cocoon, @handle...)"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  disabled={analyzingDossier || !tab2CompetitorInput.trim()}
                  icon={Swords}
                  onClick={() => {
                    if (tab2CompetitorInput.trim()) {
                      const added = tab2CompetitorInput.trim();
                      setTab2CompetitorInput('');
                      void handleRunBrandAnalysis(dossier.brandName, [
                        ...dossier.competitors.map((c) => c.competitorName),
                        added,
                      ]);
                    }
                  }}
                >
                  Thêm vào bàn cân
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={
                    Boolean(scanningCompetitorHandle) || !tab2CompetitorInput.trim()
                  }
                  icon={Users}
                  onClick={() => {
                    if (tab2CompetitorInput.trim()) {
                      void handleScanCompetitorKocs(
                        tab2CompetitorInput.trim(),
                        tab2CompetitorInput.trim()
                      );
                    }
                  }}
                >
                  Quét KOC TikTok
                </Button>
              </div>
            </div>

            <DataTable<CompetitorMatrixItem>
              columns={competitorColumns}
              rows={dossier.competitors}
              rowKey={(r) => r.id}
              stickyLast
              empty="Chưa có dữ liệu đối thủ cạnh tranh."
            />
          </Panel>

          {/* Kết quả Quét KOC thực tế của Đối thủ */}
          {(scanningCompetitorHandle || scannedCompKocs.length > 0) && (
            <Panel
              flush
              title={
                scannedCompProfile
                  ? `Danh sách KOC đang hợp tác với đối thủ: ${scannedCompProfile.brandName} (@${scannedCompProfile.handle})`
                  : `Đang quét mạng lưới KOC của đối thủ ${scanningCompetitorHandle}...`
              }
            >
              <DataTable<TikTokCompetitorKocResult>
                columns={scannedKocColumns}
                rows={scannedCompKocs}
                rowKey={(r) => r.handle}
                loading={
                  Boolean(scanningCompetitorHandle) && scannedCompKocs.length === 0
                }
                empty="Đang quét dữ liệu KOC từ TikTok..."
              />
            </Panel>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: ĐÀO BÌNH LUẬN KHÁCH HÀNG, QUÉT WEB & ĐỐI SOÁT THỰC THI B2C      */}
      {/* ===================================================================== */}
      {activeTab === 'INSIGHTS_AND_EXECUTION' && (
        <div className="space-y-5">
          {/* 1. Đào bình luận khách hàng & FAQ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <Panel
              title="Nguồn dữ liệu bình luận & đánh giá khách hàng"
              className="lg:col-span-4"
            >
              <div className="space-y-3.5">
                <Field label="Link video TikTok của Brand hoặc đối thủ">
                  <Input
                    type="text"
                    value={reviewVideoUrl}
                    onChange={(e) => setReviewVideoUrl(e.target.value)}
                    placeholder="https://www.tiktok.com/@.../video/..."
                    className="font-code text-xs"
                  />
                </Field>

                <Field label="Hoặc dán đánh giá Shopee / bình luận khách hàng (mỗi dòng 1 ý)">
                  <Textarea
                    rows={5}
                    value={rawReviewText}
                    onChange={(e) => setRawReviewText(e.target.value)}
                    placeholder="Dán các bình luận, câu hỏi hoặc phản hồi thực tế của khách hàng..."
                    className="text-xs"
                  />
                </Field>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <Button
                    variant="primary"
                    disabled={miningReviews}
                    icon={MessageSquare}
                    onClick={() => void handleRunReviewMining()}
                  >
                    {miningReviews ? 'Đang bóc tách...' : 'Bóc tách bình luận'}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={runningModelResearch}
                    icon={RefreshCw}
                    onClick={() =>
                      void handleRunModelResearch({ playbook: 'CUSTOMER_PAIN_FAQ' })
                    }
                  >
                    Phân tích bằng mô hình
                  </Button>
                </div>

                {minedStats.totalLines > 0 && (
                  <div className="text-2xs text-ink-3 pt-1">
                    Đã phân tích {minedStats.totalLines} dòng (
                    {minedStats.scrapedFromTikTok} bình luận từ TikTok)
                  </div>
                )}
              </div>
            </Panel>

            <Panel
              flush
              title={`Nhóm vấn đề, nỗi đau & câu hỏi thường gặp (${minedClusters.length} cụm chủ đề)`}
              className="lg:col-span-8"
              actions={
                <Button
                  size="sm"
                  variant="primary"
                  disabled={savingFaqs}
                  icon={Check}
                  onClick={handleSyncFaqsToBrandProfile}
                >
                  Lưu {minedClusters.length} FAQ vào hồ sơ {dossier.brandName}
                </Button>
              }
            >
              <div className="divide-y divide-line">
                {minedClusters.map((cluster) => (
                  <div
                    key={cluster.id}
                    className="p-4 space-y-2.5 hover:bg-canvas/40 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Status
                          tone={
                            cluster.category === 'PAIN_POINT'
                              ? 'critical'
                              : cluster.category === 'BARRIER_TO_TRIAL'
                                ? 'warning'
                                : cluster.category === 'COMPETITOR_COMPLAINT'
                                  ? 'info'
                                  : 'positive'
                          }
                        >
                          {cluster.categoryLabel}
                        </Status>
                        <span className="text-sm font-semibold text-ink">
                          {cluster.topicTitle}
                        </span>
                      </div>
                      <span className="text-2xs text-ink-3 tabular-nums">
                        {cluster.mentionCount} lượt nhắc · {cluster.sharePct}% tỷ trọng
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {cluster.sampleQuotes.map((q, i) => (
                        <div
                          key={i}
                          className="text-xs text-ink-2 italic pl-2.5 border-l-2 border-line-strong"
                        >
                          &ldquo;{q}&rdquo;
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                      <div className="p-2.5 rounded-md bg-canvas border border-line">
                        <span className="font-semibold text-accent block mb-0.5">
                          Gợi ý Hook làm video giải đáp
                        </span>
                        <span className="text-ink">
                          {cluster.recommendedScriptHook}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-md bg-canvas border border-line">
                        <span className="font-semibold text-ink block mb-0.5">
                          FAQ: {cluster.suggestedFaqQuestion}
                        </span>
                        <span className="text-ink-2">{cluster.suggestedFaqAnswer}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          {/* 2. Công cụ quét trực tiếp Website / Trang đích */}
          <Panel title="Quét trực tiếp website & trang đích thương hiệu / đối thủ">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="text"
                  value={inspectUrlInput}
                  onChange={(e) => setInspectUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      void handleInspectWebsiteUrl();
                    }
                  }}
                  placeholder="Nhập URL website thương hiệu hoặc đối thủ (VD: https://kutieskin.vn)..."
                  className="flex-1 font-code text-xs"
                />
                <Button
                  variant="primary"
                  disabled={inspectingUrl}
                  icon={Globe}
                  onClick={() => void handleInspectWebsiteUrl()}
                >
                  {inspectingUrl ? 'Đang quét...' : 'Quét trang đích'}
                </Button>
                {webInspection && (
                  <Button
                    variant="secondary"
                    icon={FileCheck}
                    onClick={() => {
                      const updated = generateBrandMarketResearchDossier({
                        brandNameOrQuery: dossier.brandName,
                        customCategory: dossier.category,
                        liveWebInspection: webInspection,
                        savedBrandProfile: findProfileForBrand(dossier.brandName),
                      });
                      setDossier(updated);
                      onNotify?.(
                        `Đã cập nhật dữ liệu trang đích ${webInspection.domain} vào hồ sơ ${dossier.brandName}`,
                        'success'
                      );
                    }}
                  >
                    Cập nhật vào hồ sơ nghiên cứu
                  </Button>
                )}
              </div>

              {webInspection && (
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-line border border-line rounded-lg bg-surface">
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-code text-xs font-semibold text-accent">
                        {webInspection.domain}
                      </span>
                      <Status
                        tone={webInspection.isLiveFetched ? 'positive' : 'warning'}
                      >
                        {webInspection.isLiveFetched
                          ? `HTTP ${webInspection.httpStatus}`
                          : 'Phân tích tên miền'}
                      </Status>
                    </div>
                    <div className="text-sm font-semibold text-ink">
                      {webInspection.pageTitle}
                    </div>
                    <p className="text-xs text-ink-2 leading-relaxed">
                      {webInspection.metaDescription}
                    </p>
                    {webInspection.detectedPricesVnd.length > 0 && (
                      <div className="pt-1">
                        <div className="text-2xs font-medium text-ink-3 mb-1.5">
                          Mốc giá phát hiện trên trang:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {webInspection.detectedPricesVnd.map((p) => (
                            <span
                              key={p}
                              className="px-2 py-0.5 rounded bg-canvas border border-line font-code text-2xs text-accent tabular-nums"
                            >
                              {formatVnd(p)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <div className="text-2xs font-semibold text-ink-3 mb-1.5">
                        Tiêu đề H1 / H2 & Danh mục phát hiện trên trang
                      </div>
                      <ul className="space-y-1 text-xs text-ink">
                        {[...webInspection.h1Headings, ...webInspection.h2Headings]
                          .slice(0, 6)
                          .map((h, i) => (
                            <li key={i} className="truncate">
                              • {h}
                            </li>
                          ))}
                      </ul>
                    </div>

                    {webInspection.extractedUsps.length > 0 && (
                      <div className="pt-2 border-t border-line">
                        <div className="text-2xs font-semibold text-ink-3 mb-1.5">
                          Tuyên bố giá trị & USP trích xuất từ trang
                        </div>
                        <ul className="space-y-1 text-xs text-ink-2">
                          {webInspection.extractedUsps.slice(0, 4).map((u, i) => (
                            <li key={i} className="line-clamp-2">
                              • {u}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Panel>

          {/* 3. Đối soát thực thi nội bộ B2C (File 4.1 & 3.2) */}
          <Panel
            flush={dossier.internalExecutionAudit.stores.length > 0}
            title={`Đối soát thực thi nội bộ B2C (File 4.1 & 3.2): ${dossier.brandName}`}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                {dossier.internalExecutionAudit.brandFiles35?.canvaBriefUrl && (
                  <a
                    href={dossier.internalExecutionAudit.brandFiles35.canvaBriefUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2.5 h-7 text-2xs font-medium text-accent hover:bg-sunken"
                  >
                    Canva Brief <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {dossier.internalExecutionAudit.brandFiles35?.bookingSheetUrl && (
                  <a
                    href={dossier.internalExecutionAudit.brandFiles35.bookingSheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2.5 h-7 text-2xs font-medium text-positive hover:bg-sunken"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Sheet Booking <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            }
          >
            {dossier.internalExecutionAudit.stores.length > 0 ? (
              <DataTable<InternalStoreAuditItem>
                columns={storeAuditColumns}
                rows={dossier.internalExecutionAudit.stores}
                rowKey={(r) => r.storeId}
              />
            ) : (
              <div className="text-xs text-ink-2">
                Thương hiệu <strong>{dossier.brandName}</strong> nằm ngoài danh sách 69
                gian hàng B2C phụ trách = 1 trong File 4.1.
              </div>
            )}
          </Panel>

          {dossier.internalExecutionAudit.bookedProductsSummary.length > 0 && (
            <Panel
              flush
              title={`Cơ cấu dòng sản phẩm (SKU) được book thực tế trong File 3.2 (${dossier.brandName})`}
            >
              <DataTable<BookedProductSummaryItem>
                columns={bookedProductColumns}
                rows={dossier.internalExecutionAudit.bookedProductsSummary}
                rowKey={(r) => r.productName}
              />
            </Panel>
          )}

          {dossier.internalExecutionAudit.verifiedAiredDeals.length > 0 && (
            <Panel
              flush
              title={`Chứng từ đơn Booking & Video KOC đã lên sóng (${filteredAiredDeals.length}/${dossier.internalExecutionAudit.verifiedAiredDeals.length} đơn File 3.2)`}
            >
              <div className="px-4 py-3 border-b border-line bg-surface">
                <FilterBar
                  search={{
                    value: dealSearchQuery,
                    onChange: setDealSearchQuery,
                    placeholder:
                      'Tìm theo mã deal, @handle KOC, sản phẩm, gian hàng hoặc PIC...',
                  }}
                  resultCount={filteredAiredDeals.length}
                />
              </div>
              <DataTable<VerifiedBookedDealEvidenceItem>
                columns={airedDealsColumns}
                rows={filteredAiredDeals}
                rowKey={(r) => r.dealCode}
                empty="Không có đơn booking nào khớp từ khóa."
              />
            </Panel>
          )}
        </div>
      )}

      <OperationalReportDrawer
        isOpen={isReportDrawerOpen}
        onClose={() => setIsReportDrawerOpen(false)}
        purposeId="BRAND_MARKET_RESEARCH"
        moduleTitle={`Báo cáo Nghiên cứu Thị trường & Đối thủ — ${dossier.brandName}`}
        contextDataText={serializeDossierForModelContext(dossier, {
          playbookMode: activePlaybook,
          focusCompetitorName: focusCompetitorForModel || undefined,
          customQuestion: customResearchPrompt || undefined,
          minedClusters,
        })}
        onNotify={onNotify}
      />
    </div>
  );
};
