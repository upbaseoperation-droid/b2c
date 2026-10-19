'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  Check,
  Download,
  ExternalLink,
  FileCheck,
  FileSpreadsheet,
  Globe,
  MessageSquare,
  Search,
  ShieldAlert,
  UserPlus,
  Users,
} from 'lucide-react';
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
  type EvidenceCitation,
  type InternalStoreAuditItem,
  type KocTierAllocationItem,
  type LiveWebInspectionResult,
  type PlatformComplianceRuleItem,
  type ReviewMiningCluster,
  type SearchKeywordMetricItem,
  type SeasonalityQuarterItem,
  type SellerAdsCampaignEvidenceItem,
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
import { formatNumber, formatVnd, formatVndShort } from '../../lib/format';
import { formatFollowers } from '../koc/kocUtils';
import {
  ActionMenu,
  Avatar,
  BrandAvatar,
  Button,
  ChannelBar,
  ChannelTag,
  Chips,
  DataTable,
  Field,
  FilterBar,
  Input,
  PageActions,
  Panel,
  Segmented,
  Stat,
  StatRow,
  Status,
  Tabs,
  Textarea,
  channelOf,
} from '../ui';
import type { ChipOption, Column } from '../ui';

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
  | 'BRAND_AUDIT_4P'
  | 'INTERNAL_EXECUTION'
  | 'COMPETITOR_MATRIX'
  | 'REVIEW_PAIN_MINER'
  | 'EVIDENCE_AND_WEB';

type AuditSubSectionKey = 'ALL' | 'STRATEGY_4P' | 'SKU_KOC' | 'SEASON_SWOT';

type EvidenceFilterKey =
  | 'ALL'
  | 'INTERNAL_PLAN_41'
  | 'BOOKING_LEDGER_32'
  | 'CLINICAL_REGULATORY'
  | 'SELLER_CENTER_ADS'
  | 'STOREFRONT_OFFICIAL'
  | 'COMPETITOR_BENCHMARK'
  | 'LIVE_WEB_DOM';

/** Gợi ý thêm cho ô nghiên cứu (ngoài danh sách thương hiệu đang quản lý). */
const EXTRA_RESEARCH_SUGGESTIONS: Array<[string, string]> = [
  ["Nous", "Thời trang & Phụ kiện Sơ sinh Mẹ & Bé"],
  ["BU Baby", "Thời trang & Phụ kiện Sơ sinh Mẹ & Bé"],
  ["Lullaby", "Thời trang & Phụ kiện Sơ sinh Mẹ & Bé"],
  ["Cocoon", "Mỹ phẩm thuần chay Việt Nam"],
  ["Cỏ Mềm", "Mỹ phẩm thiên nhiên"],
  ["La Roche-Posay", "Dược mỹ phẩm Pháp"],
  ["SKIN1004", "Chăm sóc da Hàn Quốc"],
  ["CeraVe", "Dược mỹ phẩm Mỹ"],
  ["Cetaphil", "Chăm sóc da nhạy cảm"],
  ["Bioderma", "Dược mỹ phẩm Pháp"],
  ["SVR", "Dược mỹ phẩm Pháp"],
  ["Obagi", "Dược mỹ phẩm đặc trị"],
  ["Torriden", "Chăm sóc da Hàn Quốc"],
  ["Keyshu", "Chăm sóc da & Làm trắng"],
  ["Anessa", "Chống nắng Nhật Bản"],
  ["L'Oréal", "Chăm sóc da & Tóc"],
  ["Rom&nd", "Trang điểm Hàn Quốc"],
  ["Judydoll", "Trang điểm"],
  ["Colorkey", "Trang điểm"],
  ["Maybelline", "Trang điểm"],
  ["Mustela", "Chăm sóc da Mẹ & Bé Pháp"],
  ["Bepanthen", "Chăm sóc da Bé Đức"],
  ["Momo Rabbit", "Tã bỉm Hàn Quốc"],
  ["Moony", "Tã bỉm Nhật Bản"],
  ["D-nee", "Giặt xả & Tắm gội Mẹ Bé"],
  ["Femfresh", "Dung dịch vệ sinh Anh Quốc"],
  ["Lactacyd", "Dung dịch vệ sinh Pháp"],
  ["Nerman", "Chăm sóc cá nhân Nam giới"],
  ["Romano", "Chăm sóc cá nhân Nam giới"],
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

export const BrandMarketResearchHubView: React.FC<BrandMarketResearchHubViewProps> = ({
  brands,
  kocs,
  selectedBrand,
  onSaveScrapedKocs,
  onNavigateToBrandProfile,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<ResearchTabKey>('BRAND_AUDIT_4P');
  const [auditSubSection, setAuditSubSection] = useState<AuditSubSectionKey>('ALL');

  const initialBrandName =
    selectedBrand && selectedBrand !== 'ALL' ? selectedBrand : 'Kutieskin';
  const [brandQuery, setBrandQuery] = useState<string>(initialBrandName);
  const [hasEditedBrandQuery, setHasEditedBrandQuery] = useState<boolean>(false);
  const [customCategory, setCustomCategory] = useState<string>('');
  const [customCompetitorText, setCustomCompetitorText] = useState<string>('');
  const [showAdvancedResearch, setShowAdvancedResearch] = useState(false);
  const [tab3CompetitorInput, setTab3CompetitorInput] = useState<string>('');
  const [dealSearchQuery, setDealSearchQuery] = useState<string>('');
  const [analyzingDossier, setAnalyzingDossier] = useState<boolean>(false);
  const [savingToProfile, setSavingToProfile] = useState<boolean>(false);

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

  // --- Bộ lọc tra cứu nhanh dẫn chứng ---
  const [selectedEvidenceFilter, setSelectedEvidenceFilter] =
    useState<EvidenceFilterKey>('ALL');
  const [evidenceSearch, setEvidenceSearch] = useState<string>('');
  const [highlightedEvidenceId, setHighlightedEvidenceId] = useState<string | null>(null);

  // --- State Quét KOC của Đối thủ ngay trong Tab 3 ---
  const [scanningCompetitorHandle, setScanningCompetitorHandle] = useState<string | null>(null);
  const [scannedCompProfile, setScannedCompProfile] =
    useState<TikTokCompetitorProfileSummary | null>(null);
  const [scannedCompKocs, setScannedCompKocs] = useState<TikTokCompetitorKocResult[]>([]);

  // --- State Đào Bình luận & Đánh giá Khách hàng (Tab 4) ---
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

  // --- State Quét Website / Trang đích trực tiếp (Tab 5) ---
  const [inspectUrlInput, setInspectUrlInput] = useState<string>('');
  const [inspectingUrl, setInspectingUrl] = useState<boolean>(false);
  const [webInspection, setWebInspection] = useState<LiveWebInspectionResult | null>(null);

  const [prevSelectedBrand, setPrevSelectedBrand] = useState<string | undefined>(selectedBrand);
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
      const firstAirLink =
        nextDossier.internalExecutionAudit.verifiedAiredDeals.find((d) => Boolean(d.linkAir))
          ?.linkAir || '';
      setReviewVideoUrl(firstAirLink);
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

  const evidenceLookup = useMemo(() => {
    const map = new Map<string, EvidenceCitation>();
    for (const ev of dossier.evidenceLedger) {
      map.set(ev.id, ev);
    }
    return map;
  }, [dossier.evidenceLedger]);

  // Nhảy tới Sổ dẫn chứng và tô sáng mã [EV-xx] khi bấm vào badge
  const handleJumpToEvidence = useCallback((evId: string) => {
    setSelectedEvidenceFilter('ALL');
    setEvidenceSearch('');
    setHighlightedEvidenceId(evId);
    setActiveTab('EVIDENCE_AND_WEB');
  }, []);

  const renderEvidenceBadges = useCallback(
    (evIds?: string[]) => {
      if (!evIds || evIds.length === 0) return null;
      return (
        <span className="inline-flex flex-wrap items-center gap-1">
          {evIds.map((id) => {
            const ev = evidenceLookup.get(id);
            return (
              <button
                key={id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleJumpToEvidence(id);
                }}
                title={
                  ev
                    ? `[${ev.id}] ${ev.sourceDocument}: ${ev.exactQuoteOrMetric}`
                    : `Xem dẫn chứng ${id}`
                }
                className="inline-flex items-center rounded px-1.5 py-0.5 font-code text-2xs font-medium text-accent bg-accent-soft/70 hover:bg-accent-soft transition-colors"
              >
                {id}
              </button>
            );
          })}
        </span>
      );
    },
    [evidenceLookup, handleJumpToEvidence]
  );

  // Chạy phân tích tổng thể Brand & Đối thủ
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
        onNotify?.('Vui lòng chọn hoặc nhập tên thương hiệu / đối thủ cần nghiên cứu.', 'warning');
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
        if (json.scannedCompetitorProfile) {
          setScannedCompProfile(json.scannedCompetitorProfile);
        }
        if (Array.isArray(json.scannedCompetitorKocs) && json.scannedCompetitorKocs.length > 0) {
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
        onNotify?.(
          `Đã lập hồ sơ nghiên cứu và trích xuất ${nextDossier.evidenceLedger?.length || 0} dẫn chứng cho ${nextDossier.brandName}`,
          'success'
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi khi phân tích thương hiệu.';
        onNotify?.(msg, 'error');
      } finally {
        setAnalyzingDossier(false);
      }
    },
    [brandQuery, customCategory, customCompetitorText, hasEditedBrandQuery, onNotify]
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
      const msg = err instanceof Error ? err.message : 'Không lưu được mục câu hỏi thường gặp.';
      onNotify?.(msg, 'error');
    } finally {
      setSavingFaqs(false);
    }
  };

  // Quét KOC thực tế đang làm cho một đối thủ cụ thể trong Ma trận Đối thủ
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
      setMinedClusters(Array.isArray(json.clusters) ? json.clusters : []);
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
    const md = buildBrandResearchMarkdownReport(dossier);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ho-so-nghien-cuu-brand-${dossier.brandKey}-${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
    onNotify?.('Đã tải xuống báo cáo nghiên cứu thương hiệu (.MD)', 'success');
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
              <span className="font-code">{row.skuCode}</span> · {row.packSize} · {row.avgRatingText}
            </div>
          </div>
        ),
      },
      {
        key: 'role',
        header: 'Vai trò phễu',
        width: 155,
        render: (row) => (
          <div>
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
            <div className="mt-1">{renderEvidenceBadges(row.evidenceIds)}</div>
          </div>
        ),
      },
      {
        key: 'specs_need',
        header: 'Đặc tính & Tệp khách hàng',
        width: 280,
        render: (row) => (
          <div className="space-y-0.5">
            <div className="text-xs text-ink line-clamp-2">{row.coreIngredientsOrSpecs}</div>
            <div className="text-2xs text-ink-3 line-clamp-1">Tệp khách: {row.targetNeed}</div>
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
              <span className="text-2xs font-medium text-positive">(-{row.discountPct}%)</span>
            </div>
            <div className="text-2xs text-ink-3">
              Niêm yết: <span className="line-through">{formatVnd(row.listPriceVnd)}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'commission_share',
        header: 'Hoa hồng & Sản lượng',
        align: 'right',
        width: 165,
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
    [renderEvidenceBadges]
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
            <div className="font-semibold text-ink">Ngân sách: {row.budgetWeightPct}%</div>
            <div className="text-2xs text-ink-3">Số lượng video: {row.videoVolumeWeightPct}%</div>
          </div>
        ),
      },
      {
        key: 'cost',
        header: 'Đơn giá tham chiếu (File 3.2)',
        width: 210,
        render: (row) => (
          <div>
            <div className="text-xs font-medium text-ink">{row.avgBookingCostRangeVnd}</div>
            <div className="mt-0.5">{renderEvidenceBadges(row.evidenceIds)}</div>
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
            <div className="font-medium text-ink">ROAS {row.targetRoas} · CTR {row.targetCtrPct}</div>
            <div className="text-2xs text-ink-3">
              Hook 2s: {row.targetHookRate2sPct} · CVR {row.targetCvrPct}
            </div>
          </div>
        ),
      },
    ],
    [renderEvidenceBadges]
  );

  // --- Cột bảng Khung Góc Kịch bản KOC ---
  const contentAngleColumns = useMemo<Column<WinningContentAngleBlueprint>[]>(
    () => [
      {
        key: 'pillar',
        header: 'Trụ cột kịch bản & Tệp người xem',
        width: 220,
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
        width: 300,
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
        width: 200,
        render: (row) => (
          <div>
            <div className="text-xs font-medium text-positive">{row.recommendedCta}</div>
            <div className="mt-0.5">{renderEvidenceBadges(row.evidenceIds)}</div>
          </div>
        ),
      },
    ],
    [renderEvidenceBadges]
  );

  // --- Cột bảng Lịch Mùa vụ 4 Quý ---
  const seasonalityColumns = useMemo<Column<SeasonalityQuarterItem>[]>(
    () => [
      {
        key: 'quarter',
        header: 'Quý & Mức cầu',
        width: 150,
        render: (row) => (
          <div>
            <div className="font-semibold text-ink">{row.quarter}</div>
            <div className="mt-1">
              <Status
                tone={
                  row.demandLevel === 'ĐỈNH ĐIỂM'
                    ? 'critical'
                    : row.demandLevel === 'TĂNG TRƯỞNG'
                      ? 'info'
                      : 'neutral'
                }
              >
                {row.demandLevel}
              </Status>
            </div>
          </div>
        ),
      },
      {
        key: 'trigger',
        header: 'Thời tiết / Sự kiện & Nhu cầu phát sinh',
        width: 270,
        render: (row) => (
          <div className="space-y-0.5">
            <div className="text-xs font-medium text-ink">{row.customerSymptomSpike}</div>
            <div className="text-2xs text-ink-3">{row.weatherOrEventTrigger}</div>
          </div>
        ),
      },
      {
        key: 'sku_content',
        header: 'SKU trọng tâm & Tuyến nội dung',
        width: 290,
        render: (row) => (
          <div className="space-y-0.5">
            <div className="text-xs text-ink">SKU: {row.prioritySkus}</div>
            <div className="text-2xs text-ink-3">Nội dung: {row.contentFocus}</div>
          </div>
        ),
      },
      {
        key: 'weight',
        header: 'Tỷ trọng ngân sách năm',
        align: 'right',
        width: 130,
        render: (row) => (
          <span className="font-semibold text-accent tabular-nums">
            {row.recommendedBudgetWeightPct}%
          </span>
        ),
      },
    ],
    []
  );

  // --- Cột bảng Từ khóa Tìm kiếm ---
  const keywordColumns = useMemo<Column<SearchKeywordMetricItem>[]>(
    () => [
      {
        key: 'keyword',
        header: 'Từ khóa tìm kiếm',
        width: 180,
        render: (row) => (
          <div>
            <div className="font-code font-semibold text-ink">&ldquo;{row.keyword}&rdquo;</div>
            <div className="text-2xs text-ink-3 mt-0.5">
              ~{formatNumber(row.monthlySearchVolumeEst)} lượt/tháng · Cạnh tranh: {row.competitionLevel}
            </div>
          </div>
        ),
      },
      {
        key: 'intent',
        header: 'Ý định',
        width: 140,
        render: (row) => (
          <Status
            tone={
              row.competitionLevel === 'CƠ HỘI NGÁCH'
                ? 'positive'
                : row.competitionLevel === 'CAO'
                  ? 'warning'
                  : 'info'
            }
          >
            {row.searchIntent}
          </Status>
        ),
      },
      {
        key: 'hook',
        header: 'Gợi ý Hook mở đầu video',
        render: (row) => <span className="text-xs text-ink-2">{row.recommendedVideoHook}</span>,
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
            <div className="text-2xs text-ink-3 mt-0.5">Chế tài: {row.platformPenaltyRisk}</div>
          </div>
        ),
      },
      {
        key: 'safe',
        header: 'Cách diễn đạt an toàn thay thế',
        render: (row) => (
          <span className="text-xs text-positive font-medium">{row.safeAlternativePhrasing}</span>
        ),
      },
    ],
    []
  );

  // --- Cột bảng Gian hàng Nội bộ B2C (Tab 2) ---
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
              <span className="font-code">{st.storeId}</span> · PIC: {st.pic} · TN: {st.leaderName}
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
              {st.totalPlannedVideos} KH → <strong className="text-accent">{st.totalBookedOrders}</strong> book →{' '}
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
          <div>
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
            {st.top3BurstDates.length > 0 && (
              <div className="text-2xs text-ink-3 font-code mt-1">
                Cao điểm: {st.top3BurstDates.join(', ')}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'diagnosis',
        header: 'Chẩn đoán lịch Air W40–W45',
        render: (st) => <span className="text-xs text-ink-2">{st.syncDiagnosis}</span>,
      },
    ],
    []
  );

  // --- Cột bảng Cơ cấu SKU được Book thực tế (Tab 2) ---
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
          <span className="font-semibold text-ink tabular-nums">{prod.bookedOrderCount} đơn</span>
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
          <span className="text-ink tabular-nums">{formatVnd(prod.avgCostPerVideoVnd)}</span>
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
              <span className="font-code text-2xs font-normal text-ink-3">· {row.klTier}</span>
            </div>
            <div className="text-2xs text-ink-3 mt-0.5">
              <span className="font-code text-accent">{row.dealCode}</span> · {row.storeName} · PIC:{' '}
              {row.pic}
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

  // --- Cột bảng Chiến dịch Ads Seller Center ---
  const sellerAdsColumns = useMemo<Column<SellerAdsCampaignEvidenceItem>[]>(
    () => [
      {
        key: 'campaign',
        header: 'Chiến dịch TikTok Seller Center',
        width: 240,
        render: (camp) => (
          <div>
            <div className="font-semibold text-ink">{camp.campaignName}</div>
            <div className="text-2xs text-ink-3 font-code mt-0.5">
              ID: {camp.campaignId} · Gian: {camp.storeName}
            </div>
          </div>
        ),
      },
      {
        key: 'spend_gmv',
        header: 'Chi phí Ads & Doanh thu GMV',
        align: 'right',
        width: 185,
        render: (camp) => (
          <div className="text-right tabular-nums">
            <div className="font-semibold text-positive">GMV: {formatVnd(camp.gmvVnd)}</div>
            <div className="text-2xs text-ink-3">Chi phí Ads: {formatVnd(camp.costVnd)}</div>
          </div>
        ),
      },
      {
        key: 'roas_orders',
        header: 'ROAS & Số đơn',
        align: 'right',
        width: 150,
        render: (camp) => (
          <div className="text-right tabular-nums">
            <div className="font-semibold text-accent">
              ROAS {camp.roas}x · {formatNumber(camp.orders)} đơn
            </div>
            <div className="text-2xs text-ink-3">CPA: {formatVnd(camp.cpaVnd)}</div>
          </div>
        ),
      },
      {
        key: 'creative_metrics',
        header: 'Chỉ số sáng tạo (Hook 2s · CTR · CVR)',
        align: 'right',
        width: 190,
        render: (camp) => (
          <div className="text-right tabular-nums">
            <div className="font-medium text-ink">
              Hook 2s: {camp.hookRate2sPct}% · Xem hết: {camp.completionRate100Pct}%
            </div>
            <div className="text-2xs text-ink-3">
              CTR {camp.ctrPct}% · CVR {camp.cvrPct}%
            </div>
          </div>
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
        header: 'Đối thủ & Kênh chính thức',
        width: 210,
        render: (row) => (
          <div className="flex items-start gap-2.5 min-w-0">
            <BrandAvatar name={row.competitorName} size={28} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-ink">{row.competitorName}</span>
                {renderEvidenceBadges(row.evidenceIds)}
              </div>
              <div className="text-2xs text-ink-3 font-code mt-0.5">
                {row.tiktokHandle} · {row.originCountry} · {PRICE_SEGMENT_LABEL[row.priceSegment]}
              </div>
              {row.storeRatingAndSoldText && (
                <div className="text-2xs text-ink-2 mt-0.5">{row.storeRatingAndSoldText}</div>
              )}
              {row.shopeeMallUrl && (
                <a
                  href={row.shopeeMallUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-2xs text-accent hover:underline mt-0.5"
                >
                  Shopee Mall <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ),
      },
      {
        key: 'heroSku',
        header: 'SKU đối đầu & Giá bán',
        width: 225,
        render: (row) => {
          const disc =
            row.listPriceVnd > 0
              ? Math.round(((row.listPriceVnd - row.dealPriceVnd) / row.listPriceVnd) * 100)
              : 0;
          return (
            <div>
              <div className="font-medium text-ink line-clamp-2">{row.heroSkuName}</div>
              <div className="text-2xs tabular-nums mt-0.5">
                <strong className="text-accent">{formatVnd(row.dealPriceVnd)}</strong>{' '}
                <span className="text-ink-3 line-through">{formatVnd(row.listPriceVnd)}</span>
                {disc > 0 && <span className="text-positive font-medium ml-1">(-{disc}%)</span>}
              </div>
              {row.pricePerUnitComparison && (
                <div className="text-2xs text-warning mt-0.5">{row.pricePerUnitComparison}</div>
              )}
            </div>
          );
        },
      },
      {
        key: 'koc_scale',
        header: 'Hoa hồng & KOC',
        align: 'right',
        width: 130,
        render: (row) => (
          <div className="text-right tabular-nums">
            <div className="font-semibold text-positive">HH: {row.affiliateCommissionPct}%</div>
            <div className="text-2xs text-ink-3">
              {row.estimatedMonthlyVideoCount > 0
                ? `${row.estimatedMonthlyVideoCount} KOC đã quét`
                : 'Chưa quét KOC'}
            </div>
          </div>
        ),
      },
      {
        key: 'channelShare',
        header: 'Tỷ trọng sàn',
        width: 140,
        render: (row) => (
          <div>
            <ChannelBar
              showLegend={false}
              values={[
                { channel: 'tiktok', value: row.tiktokChannelSharePct },
                { channel: 'shopee', value: row.shopeeChannelSharePct },
              ]}
            />
            <div className="flex justify-between text-2xs text-ink-3 tabular-nums mt-1">
              <span>TikTok {row.tiktokChannelSharePct}%</span>
              <span>Shopee {row.shopeeChannelSharePct}%</span>
            </div>
          </div>
        ),
      },
      {
        key: 'strengthsWeaknesses',
        header: 'Điểm mạnh & Điểm yếu khách phàn nàn',
        width: 260,
        render: (row) => (
          <div className="space-y-1">
            <div className="text-xs text-ink line-clamp-2">
              <strong className="text-positive font-medium">+ Mạnh: </strong>
              {row.keyUsps[0]}
            </div>
            <div className="text-2xs text-ink-2 line-clamp-2">
              <strong className="text-critical font-medium">− Yếu: </strong>
              {row.customerComplaints[0]}
            </div>
          </div>
        ),
      },
      {
        key: 'counterPlay',
        header: `Phương án cạnh tranh cho ${dossier.brandName}`,
        width: 230,
        render: (row) => (
          <div className="text-xs text-ink-2 leading-relaxed line-clamp-3">
            {row.upbaseCounterPlay}
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Thao tác',
        align: 'right',
        width: 195,
        render: (row) => {
          const isScanning = scanningCompetitorHandle === row.tiktokHandle;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                disabled={analyzingDossier}
                icon={Search}
                onClick={() => void handleRunBrandAnalysis(row.competitorName, [])}
              >
                Phân tích
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={isScanning}
                icon={Users}
                onClick={() => handleScanCompetitorKocs(row.tiktokHandle, row.competitorName)}
              >
                {isScanning ? 'Đang quét...' : 'Quét KOC'}
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
      handleScanCompetitorKocs,
      renderEvidenceBadges,
      scanningCompetitorHandle,
    ]
  );

  // --- Cột bảng KOC Quét Thực tế của Đối thủ (Tab 3) ---
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
                @{item.handle} · {item.affiliateMetrics.suggestedClassification.tierLabel}
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

  // --- Cột bảng Sổ Dẫn chứng Xác thực [EV] (Tab 5) ---
  const evidenceColumns = useMemo<Column<EvidenceCitation>[]>(
    () => [
      {
        key: 'id',
        header: 'Mã [EV] & Phân loại',
        width: 195,
        render: (ev) => (
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-code font-semibold text-accent">{ev.id}</span>
              <Status
                tone={
                  ev.reliabilityTag === 'ĐỐI SOÁT NỘI BỘ 100%'
                    ? 'positive'
                    : ev.reliabilityTag === 'QUÉT TRỰC TIẾP DOM/HTTP'
                      ? 'info'
                      : ev.reliabilityTag === 'HỒ SƠ CÔNG BỐ / KIỂM ĐỊNH'
                        ? 'warning'
                        : 'neutral'
                }
              >
                {ev.reliabilityTag}
              </Status>
            </div>
            <div className="text-2xs text-ink-3 mt-1">{ev.categoryLabel}</div>
          </div>
        ),
      },
      {
        key: 'claim',
        header: 'Luận điểm & Tài liệu nguồn',
        width: 280,
        render: (ev) => (
          <div>
            <div className="font-semibold text-ink">{ev.claimSupported}</div>
            <div className="text-2xs text-ink-3 mt-0.5">{ev.sourceDocument}</div>
          </div>
        ),
      },
      {
        key: 'quote',
        header: 'Trích dẫn số liệu / Bằng chứng gốc',
        render: (ev) => (
          <div className="font-code text-xs text-ink-2 leading-relaxed">
            {ev.exactQuoteOrMetric}
          </div>
        ),
      },
      {
        key: 'date_link',
        header: 'Đối soát',
        align: 'right',
        width: 130,
        render: (ev) => (
          <div className="text-right tabular-nums">
            <div className="text-2xs text-ink-3">{ev.verifiedDate}</div>
            {ev.sourceUrl && (
              <a
                href={ev.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-2xs font-medium text-accent hover:underline mt-0.5"
              >
                Mở nguồn <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
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

  const evidenceChipOptions = useMemo<ChipOption<EvidenceFilterKey>[]>(() => {
    const countByCat = (cat: EvidenceFilterKey) =>
      cat === 'ALL'
        ? dossier.evidenceLedger.length
        : dossier.evidenceLedger.filter((e) => e.category === cat).length;

    const base: Array<{ key: EvidenceFilterKey; label: string }> = [
      { key: 'ALL', label: 'Tất cả nguồn' },
      { key: 'INTERNAL_PLAN_41', label: 'File 4.1 & 4.1.1' },
      { key: 'BOOKING_LEDGER_32', label: 'File 3.2 & 3.5' },
      { key: 'CLINICAL_REGULATORY', label: 'Pháp lý & Brief' },
      { key: 'SELLER_CENTER_ADS', label: 'Seller Center' },
      { key: 'STOREFRONT_OFFICIAL', label: 'Gian hàng Mall' },
      { key: 'COMPETITOR_BENCHMARK', label: 'Đối thủ' },
      { key: 'LIVE_WEB_DOM', label: 'DOM Website' },
    ];
    return base
      .map((item) => ({ ...item, count: countByCat(item.key) }))
      .filter((item) => item.key === 'ALL' || (item.count || 0) > 0);
  }, [dossier.evidenceLedger]);

  const filteredEvidenceList = useMemo(() => {
    return dossier.evidenceLedger.filter((ev) => {
      if (selectedEvidenceFilter !== 'ALL' && ev.category !== selectedEvidenceFilter) {
        return false;
      }
      if (evidenceSearch.trim()) {
        const q = evidenceSearch.trim().toLowerCase();
        const hay = `${ev.id} ${ev.claimSupported} ${ev.sourceDocument} ${ev.exactQuoteOrMetric}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [dossier.evidenceLedger, selectedEvidenceFilter, evidenceSearch]);

  const showStrategy4P = auditSubSection === 'ALL' || auditSubSection === 'STRATEGY_4P';
  const showSkuKoc = auditSubSection === 'ALL' || auditSubSection === 'SKU_KOC';
  const showSeasonSwot = auditSubSection === 'ALL' || auditSubSection === 'SEASON_SWOT';

  return (
    <div className="space-y-5">
      <PageActions>
        <ActionMenu
          items={[
            ...(onNavigateToBrandProfile
              ? [{ label: `Mở hồ sơ ${dossier.brandName}`, icon: BookOpen, onSelect: () => onNavigateToBrandProfile(dossier.brandName) }]
              : []),
            { label: 'Xuất báo cáo (.md)', icon: Download, onSelect: handleDownloadMarkdownDossier },
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

      {/* 1. ĐẦU HỒ SƠ (một hàng) + Ô NGHIÊN CỨU THƯƠNG HIỆU KHÁC */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-[240px] flex-1">
            <BrandAvatar name={dossier.brandName} size={32} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-ink truncate">{dossier.brandName}</h2>
                {!dossier.isUpbaseManaged && <Status tone="info">Thương hiệu mở rộng</Status>}
              </div>
              <div className="text-2xs text-ink-3 truncate">
                {[
                  dossier.category,
                  dossier.originCountry,
                  dossier.isUpbaseManaged ? `${dossier.internalExecutionAudit.totalStoresCount} gian hàng B2C` : '',
                  dossier.accountPic ? `Quản lý: ${dossier.accountPic}` : '',
                  dossier.brandPicName ? `PIC: ${dossier.brandPicName}` : '',
                ].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto md:shrink-0">
            <div className="relative flex-1 md:w-72">
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
                placeholder="Nghiên cứu thương hiệu khác…"
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
              Tùy chọn{customCategory || customCompetitorText ? ' (đang bật)' : ''}
            </Button>
            <Button
              variant="secondary"
              disabled={analyzingDossier}
              icon={Search}
              onClick={() => void handleRunBrandAnalysis()}
            >
              {analyzingDossier ? 'Đang phân tích…' : 'Phân tích'}
            </Button>
          </div>
        </div>

        {showAdvancedResearch && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:max-w-2xl md:ml-auto">
            <Field label="Ngành hàng">
              <Input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder={dossier.category}
              />
            </Field>
            <Field label="So sánh thêm đối thủ (tên hoặc @handle)">
              <Input
                type="text"
                value={customCompetitorText}
                onChange={(e) => setCustomCompetitorText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    void handleRunBrandAnalysis();
                  }
                }}
                placeholder="VD: Nous, Cocoon, @handle..."
              />
            </Field>
          </div>
        )}
      </div>

      {/* 2. HÀNG CHỈ SỐ TÓM TẮT */}
      <StatRow size="sm">
        <Stat
          label="Khoảng giá"
          value={dossier.fourP.priceRangeText}
          note={`AOV ${formatVndShort(dossier.marketLandscape.avgOrderValueVnd)} · Mua lặp lại ${dossier.marketLandscape.repeatPurchaseRatePct}% (${dossier.marketLandscape.replenishmentCycleDays} ngày)`}
        />
        <Stat
          label="Ngân sách Net"
          value={
            dossier.internalExecutionAudit.totalBudgetNetVnd > 0
              ? formatVndShort(dossier.internalExecutionAudit.totalBudgetNetVnd)
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
          note={
            dossier.internalExecutionAudit.totalBookedOrders > 0
              ? `Thực chi ${formatVndShort(dossier.internalExecutionAudit.totalActualSpentNetVnd)} (${dossier.internalExecutionAudit.budgetUtilizationPct}% hạn mức)`
              : 'Thương hiệu ngoài danh sách 69 gian hàng B2C'
          }
        />
        <Stat
          label="Video KOC"
          value={`${dossier.internalExecutionAudit.totalBookedOrders} book / ${dossier.internalExecutionAudit.totalAiredVideos} air`}
          note={`Chỉ tiêu ${dossier.internalExecutionAudit.totalPlannedVideos} video · Đúng lịch ${dossier.internalExecutionAudit.onTimeAirRatePct}%`}
        />
        <Stat
          label="Quy mô nghiên cứu"
          value={`${dossier.competitors.length} đối thủ · ${dossier.skuPortfolio.length} SKU`}
          note={`${dossier.evidenceLedger.length} mã dẫn chứng [EV]`}
        />
      </StatRow>

      {/* 3. THANH CHUYỂN TAB CHÍNH */}
      <Tabs<ResearchTabKey>
        value={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'BRAND_AUDIT_4P',
            label: 'Định vị, 4P & SKU',
            count: dossier.skuPortfolio.length,
          },
          {
            key: 'INTERNAL_EXECUTION',
            label: 'Đối soát thực thi B2C',
            count:
              dossier.internalExecutionAudit.totalBookedOrders ||
              dossier.internalExecutionAudit.stores.length,
          },
          {
            key: 'COMPETITOR_MATRIX',
            label: 'Ma trận đối thủ & KOC',
            count: dossier.competitors.length,
          },
          {
            key: 'REVIEW_PAIN_MINER',
            label: 'Đào bình luận & FAQ',
            count: minedClusters.length,
          },
          {
            key: 'EVIDENCE_AND_WEB',
            label: 'Sổ dẫn chứng & Quét web',
            count: dossier.evidenceLedger.length,
          },
        ]}
      />

      {activeTab === 'BRAND_AUDIT_4P' && (
        <Segmented<AuditSubSectionKey>
          value={auditSubSection}
          onChange={setAuditSubSection}
          items={[
            { key: 'ALL', label: 'Tất cả mục' },
            { key: 'STRATEGY_4P', label: 'Định vị & 4P' },
            { key: 'SKU_KOC', label: 'SKU & Kịch bản KOC' },
            { key: 'SEASON_SWOT', label: 'Mùa vụ & SWOT' },
          ]}
        />
      )}

      {/* ===================================================================== */}
      {/* TAB 1: HỒ SƠ BÓC TÁCH BRAND, 4P, DANH MỤC SKU, MÙA VỤ & SWOT          */}
      {/* ===================================================================== */}
      {activeTab === 'BRAND_AUDIT_4P' && (
        <div className="space-y-5">
          {showStrategy4P && (
            <>
              {/* Khối 1: Tóm tắt điều hành & 3 trụ cột định vị */}
              <Panel
                title={`Định vị chiến lược & Tóm tắt điều hành: ${dossier.brandName}`}
                actions={renderEvidenceBadges(dossier.fourP.evidenceIds)}
              >
                <div className="space-y-4">
                  <div className="border-l-2 border-accent bg-canvas px-4 py-3 rounded-r-md text-xs text-ink leading-relaxed">
                    {dossier.executiveSummary}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-line border border-line rounded-lg bg-surface">
                    <div className="p-3.5 space-y-1">
                      <div className="text-2xs font-semibold text-ink-3">
                        Câu chuyện & Quy mô vận hành
                      </div>
                      <p className="text-xs text-ink-2 leading-relaxed">
                        {dossier.positioning.story}
                      </p>
                    </div>
                    <div className="p-3.5 space-y-1">
                      <div className="text-2xs font-semibold text-ink-3">
                        Chân dung khách hàng mục tiêu
                      </div>
                      <p className="text-xs text-ink-2 leading-relaxed">
                        {dossier.positioning.targetAudience}
                      </p>
                    </div>
                    <div className="p-3.5 space-y-1">
                      <div className="text-2xs font-semibold text-ink-3">
                        Giọng điệu nội dung (Tone of Voice)
                      </div>
                      <p className="text-xs text-ink-2 leading-relaxed">
                        {dossier.positioning.toneOfVoice}
                      </p>
                    </div>
                  </div>
                </div>
              </Panel>

              {/* Khối 2: Bóc tách 4P & Tâm lý khách hàng trong bố cục bảng đối xứng */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <Panel
                  title="Phân tích chiến lược 4P (Product · Price · Place · Promotion)"
                  className="lg:col-span-7"
                  actions={renderEvidenceBadges(dossier.fourP.evidenceIds.slice(0, 3))}
                >
                  <div className="divide-y divide-line -my-2">
                    <div className="py-3 space-y-2">
                      <div className="text-xs font-semibold text-ink">
                        P1 — Sản phẩm & Lợi điểm cốt lõi (USP)
                      </div>
                      <p className="text-xs text-ink-2 leading-relaxed">
                        {dossier.fourP.productStrategy}
                      </p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {dossier.fourP.keyIngredientsOrSpecs.map((spec, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-2xs text-ink bg-canvas px-2.5 py-1.5 rounded border border-line"
                          >
                            <span className="font-code text-accent font-semibold">0{i + 1}</span>
                            <span className="leading-snug">{spec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="py-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-ink">
                          P2 — Chiến lược giá & Hoa hồng
                        </div>
                        <p className="text-xs text-ink-2 leading-relaxed">
                          {dossier.fourP.priceStrategy}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-ink">
                          P3 — Kênh phân phối thương mại điện tử
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
                    </div>

                    <div className="py-3 space-y-1.5">
                      <div className="text-xs font-semibold text-ink">
                        P4 — Cơ chế Deal, Combo & Quà tặng (Promotion)
                      </div>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
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

                <Panel
                  title="Tâm lý mua hàng: Nỗi đau · Rào cản · Bằng chứng tin cậy (RTB)"
                  className="lg:col-span-5"
                >
                  <div className="divide-y divide-line -my-2">
                    <div className="py-3 space-y-1.5">
                      <div className="text-xs font-semibold text-critical">
                        Nỗi đau khách hàng (Pain Points)
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

                    <div className="py-3 space-y-1.5">
                      <div className="text-xs font-semibold text-warning">
                        Rào cản ngần ngại thử (Barriers to Trial)
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

                    <div className="py-3 space-y-1.5">
                      <div className="text-xs font-semibold text-positive">
                        Bằng chứng tin cậy (Reasons to Believe)
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
                </Panel>
              </div>
            </>
          )}

          {showSkuKoc && (
            <>
              {/* BẢNG MA TRẬN DANH MỤC SẢN PHẨM (SKU PORTFOLIO) */}
              <Panel
                flush
                title={`Danh mục sản phẩm (SKU) & Đối soát File 3.2 (${dossier.skuPortfolio.length} dòng SKU)`}
              >
                <DataTable<BrandSkuPortfolioItem>
                  columns={skuColumns}
                  rows={dossier.skuPortfolio}
                  rowKey={(r) => r.id}
                  empty="Chưa có danh mục SKU."
                />
              </Panel>

              {/* BẢNG PHÂN BỔ NGÂN SÁCH KOC THEO PHÂN TẦNG KL1-KL4 */}
              <Panel
                flush
                title="Cơ cấu phân bổ ngân sách KOC theo phân tầng (KL1 – KL4) từ thực tế File 3.2"
              >
                <DataTable<KocTierAllocationItem>
                  columns={kocTierColumns}
                  rows={dossier.kocTierStrategy}
                  rowKey={(r) => r.tierCode}
                  empty="Chưa có dữ liệu phân tầng KOC."
                />
              </Panel>

              {/* BẢNG KHUNG GÓC KỊCH BẢN KOC CHUYỂN ĐỔI CAO */}
              <Panel
                flush
                title={`Khung góc kịch bản KOC chuyển đổi cao (${dossier.contentAngleBlueprints.length} góc tiếp cận)`}
              >
                <DataTable<WinningContentAngleBlueprint>
                  columns={contentAngleColumns}
                  rows={dossier.contentAngleBlueprints}
                  rowKey={(r) => r.id}
                  empty="Chưa có khung góc kịch bản."
                />
              </Panel>
            </>
          )}

          {showSeasonSwot && (
            <>
              {/* LỊCH MÙA VỤ 4 QUÝ & TỪ KHÓA TÌM KIẾM */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <Panel
                  flush
                  title="Lịch điểm rơi chiến dịch & Tính mùa vụ 12 tháng"
                  className="lg:col-span-7"
                >
                  <DataTable<SeasonalityQuarterItem>
                    columns={seasonalityColumns}
                    rows={dossier.marketLandscape.seasonalityCalendar}
                    rowKey={(r) => r.quarter}
                    empty="Chưa có lịch mùa vụ."
                  />
                </Panel>

                <Panel
                  flush
                  title="Chủ đề tìm kiếm & Hook nội dung"
                  className="lg:col-span-5"
                  actions={renderEvidenceBadges(dossier.marketLandscape.evidenceIds.slice(0, 2))}
                >
                  <DataTable<SearchKeywordMetricItem>
                    columns={keywordColumns}
                    rows={dossier.marketLandscape.searchKeywords}
                    rowKey={(r) => r.keyword}
                    empty="Chưa có từ khóa."
                  />
                </Panel>
              </div>

              {/* MA TRẬN SWOT 2x2 SẮC NÉT & QUY CHUẨN KIỂM DUYỆT SÀN */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <Panel
                  title="Ma trận SWOT thực chiến (gắn dẫn chứng đối soát)"
                  className="lg:col-span-7"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 border border-line rounded-lg overflow-hidden divide-y md:divide-y-0 md:divide-x divide-line">
                    <div className="divide-y divide-line">
                      <div className="p-3.5 space-y-2">
                        <div className="text-xs font-semibold text-positive">
                          Điểm mạnh (Strengths)
                        </div>
                        <ul className="space-y-2">
                          {dossier.swotAndCompliance.strengths.map((s, i) => (
                            <li key={i} className="text-xs space-y-0.5">
                              <div className="font-medium text-ink">
                                {s.point} {renderEvidenceBadges(s.evidenceIds)}
                              </div>
                              <div className="text-2xs text-ink-3">→ {s.strategicImpact}</div>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-3.5 space-y-2">
                        <div className="text-xs font-semibold text-accent">
                          Cơ hội tăng trưởng (Opportunities)
                        </div>
                        <ul className="space-y-2">
                          {dossier.swotAndCompliance.opportunities.map((o, i) => (
                            <li key={i} className="text-xs space-y-0.5">
                              <div className="font-medium text-ink">
                                {o.point} {renderEvidenceBadges(o.evidenceIds)}
                              </div>
                              <div className="text-2xs text-ink-3">→ {o.strategicImpact}</div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="divide-y divide-line">
                      <div className="p-3.5 space-y-2">
                        <div className="text-xs font-semibold text-warning">
                          Điểm yếu & Nút thắt (Weaknesses)
                        </div>
                        <ul className="space-y-2">
                          {dossier.swotAndCompliance.weaknesses.map((w, i) => (
                            <li key={i} className="text-xs space-y-0.5">
                              <div className="font-medium text-ink">
                                {w.point} {renderEvidenceBadges(w.evidenceIds)}
                              </div>
                              <div className="text-2xs text-ink-3">→ {w.strategicImpact}</div>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-3.5 space-y-2">
                        <div className="text-xs font-semibold text-critical">
                          Thách thức & Rủi ro (Threats)
                        </div>
                        <ul className="space-y-2">
                          {dossier.swotAndCompliance.threats.map((t, i) => (
                            <li key={i} className="text-xs space-y-0.5">
                              <div className="font-medium text-ink">
                                {t.point} {renderEvidenceBadges(t.evidenceIds)}
                              </div>
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
                  title="Quy chuẩn kiểm duyệt sàn & Từ khóa cấm (TikTok / Shopee)"
                  className="lg:col-span-5"
                >
                  <DataTable<PlatformComplianceRuleItem>
                    columns={complianceColumns}
                    rows={dossier.swotAndCompliance.platformComplianceRules}
                    rowKey={(r) => r.riskCategory}
                    empty="Chưa có quy chuẩn kiểm duyệt."
                  />
                </Panel>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: ĐỐI SOÁT THỰC THI NỘI BỘ B2C & ĐƠN BOOKING THẬT (FILE 4.1, 3.2 & 3.5) */}
      {/* ===================================================================== */}
      {activeTab === 'INTERNAL_EXECUTION' && (
        <div className="space-y-5">
          <Panel
            flush={dossier.internalExecutionAudit.stores.length > 0}
            title={`Đối soát thực thi nội bộ B2C (File 4.1 & 4.1.1): ${dossier.brandName}`}
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
                {dossier.internalExecutionAudit.brandFiles35?.operationFileUrl && (
                  <a
                    href={dossier.internalExecutionAudit.brandFiles35.operationFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2.5 h-7 text-2xs font-medium text-ink hover:bg-sunken"
                  >
                    File vận hành <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {renderEvidenceBadges(dossier.internalExecutionAudit.evidenceIds)}
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
                Thương hiệu <strong>{dossier.brandName}</strong> nằm ngoài danh sách 69 gian hàng
                B2C phụ trách = 1 trong File 4.1.
              </div>
            )}
          </Panel>

          {/* Cơ cấu SKU được Book thực tế trong File 3.2 */}
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

          {/* Bảng Chứng từ Đơn Booking & Link Video TikTok đã Air thật (File 3.2) */}
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
                    placeholder: 'Tìm theo mã deal, @handle KOC, sản phẩm, gian hàng hoặc PIC...',
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

          {/* Chiến dịch Quảng cáo TikTok Seller Center */}
          {dossier.internalExecutionAudit.sellerAdsCampaigns.length > 0 && (
            <Panel
              flush
              title={`Hiệu suất chiến dịch quảng cáo TikTok Shop Seller Center (${dossier.brandName})`}
            >
              <DataTable<SellerAdsCampaignEvidenceItem>
                columns={sellerAdsColumns}
                rows={dossier.internalExecutionAudit.sellerAdsCampaigns}
                rowKey={(r) => r.campaignId}
              />
            </Panel>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: MA TRẬN ĐỐI THỦ TRỰC DIỆN & QUÉT KOC ĐỐI THỦ                  */}
      {/* ===================================================================== */}
      {activeTab === 'COMPETITOR_MATRIX' && (
        <div className="space-y-5">
          <Panel
            flush
            title={`Ma trận đối đầu trực diện: ${dossier.brandName} vs ${dossier.competitors.length} đối thủ cùng phân khúc`}
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
                  value={tab3CompetitorInput}
                  onChange={(e) => setTab3CompetitorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tab3CompetitorInput.trim()) {
                      void handleRunBrandAnalysis(tab3CompetitorInput.trim(), []);
                    }
                  }}
                  placeholder="Nhập tên đối thủ hoặc @handle TikTok cần phân tích sâu / quét KOC (VD: Nous, Cocoon, La Roche-Posay...)"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  disabled={analyzingDossier || !tab3CompetitorInput.trim()}
                  icon={Search}
                  onClick={() => {
                    if (tab3CompetitorInput.trim()) {
                      void handleRunBrandAnalysis(tab3CompetitorInput.trim(), []);
                    }
                  }}
                >
                  {analyzingDossier ? 'Đang phân tích...' : 'Phân tích đối thủ'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={Boolean(scanningCompetitorHandle) || !tab3CompetitorInput.trim()}
                  icon={Users}
                  onClick={() => {
                    if (tab3CompetitorInput.trim()) {
                      void handleScanCompetitorKocs(
                        tab3CompetitorInput.trim(),
                        tab3CompetitorInput.trim()
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
                loading={Boolean(scanningCompetitorHandle) && scannedCompKocs.length === 0}
                empty="Đang quét dữ liệu KOC từ TikTok..."
              />
            </Panel>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: ĐÀO BÌNH LUẬN & NỖI ĐAU KHÁCH HÀNG (REVIEW & COMMENT MINER)    */}
      {/* ===================================================================== */}
      {activeTab === 'REVIEW_PAIN_MINER' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <Panel
            title="Nguồn dữ liệu bình luận & đánh giá"
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
                  rows={6}
                  value={rawReviewText}
                  onChange={(e) => setRawReviewText(e.target.value)}
                  placeholder="Dán các bình luận, câu hỏi hoặc phản hồi thực tế của khách hàng..."
                  className="text-xs"
                />
              </Field>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-2xs text-ink-3">
                  {minedStats.totalLines > 0
                    ? `Đã phân tích ${minedStats.totalLines} dòng (${minedStats.scrapedFromTikTok} từ TikTok)`
                    : 'Trích xuất nhóm vấn đề & FAQ'}
                </span>
                <Button
                  variant="primary"
                  disabled={miningReviews}
                  icon={MessageSquare}
                  onClick={() => void handleRunReviewMining()}
                >
                  {miningReviews ? 'Đang bóc tách...' : 'Bóc tách bình luận'}
                </Button>
              </div>
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
                <div key={cluster.id} className="p-4 space-y-2.5 hover:bg-canvas/40 transition-colors">
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
                    <div className="flex items-center gap-2">
                      <span className="text-2xs text-ink-3 tabular-nums">
                        {cluster.mentionCount} lượt nhắc · {cluster.sharePct}% tỷ trọng
                      </span>
                      {renderEvidenceBadges(cluster.evidenceIds)}
                    </div>
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
                      <span className="text-ink">{cluster.recommendedScriptHook}</span>
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
      )}

      {/* ===================================================================== */}
      {/* TAB 5: SỔ DẪN CHỨNG XÁC THỰC ([EV]) & QUÉT LIVE WEBSITE              */}
      {/* ===================================================================== */}
      {activeTab === 'EVIDENCE_AND_WEB' && (
        <div className="space-y-5">
          <Panel
            flush
            title={`Sổ dẫn chứng & Nguồn xác thực dữ liệu (${filteredEvidenceList.length}/${dossier.evidenceLedger.length} mã dẫn chứng)`}
            actions={
              highlightedEvidenceId ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setHighlightedEvidenceId(null)}
                >
                  Bỏ đánh dấu [{highlightedEvidenceId}]
                </Button>
              ) : undefined
            }
          >
            <div className="px-4 py-3 border-b border-line bg-surface">
              <FilterBar
                search={{
                  value: evidenceSearch,
                  onChange: setEvidenceSearch,
                  placeholder: 'Tìm theo mã [EV], luận điểm, tên file nguồn hoặc số liệu...',
                }}
                chips={
                  <Chips<EvidenceFilterKey>
                    items={evidenceChipOptions}
                    value={selectedEvidenceFilter}
                    onChange={setSelectedEvidenceFilter}
                  />
                }
                resultCount={filteredEvidenceList.length}
              />
            </div>

            <DataTable<EvidenceCitation>
              columns={evidenceColumns}
              rows={filteredEvidenceList}
              rowKey={(r) => r.id}
              rowClassName={(r) =>
                highlightedEvidenceId === r.id ? 'bg-accent-soft/60' : undefined
              }
              empty="Không có dẫn chứng nào khớp bộ lọc."
            />
          </Panel>

          {/* CÔNG CỤ QUÉT TRỰC TIẾP WEBSITE / TRANG ĐÍCH */}
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
                        `Đã gộp dẫn chứng DOM từ ${webInspection.domain} vào sổ dẫn chứng của ${dossier.brandName}`,
                        'success'
                      );
                    }}
                  >
                    Gộp vào sổ dẫn chứng
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
                      <Status tone={webInspection.isLiveFetched ? 'positive' : 'warning'}>
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
                    <div className="text-2xs text-ink-3 bg-canvas p-2.5 rounded border border-line">
                      {webInspection.summaryNote}
                    </div>

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
                          .slice(0, 8)
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
                          Tuyên bố giá trị & USP trích xuất từ HTML
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
        </div>
      )}
    </div>
  );
};
