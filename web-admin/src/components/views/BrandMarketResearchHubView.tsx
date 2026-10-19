'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  Check,
  Download,
  ExternalLink,
  FileCheck,
  Globe,
  MessageSquare,
  Search,
  ShieldAlert,
  UserPlus,
  Users,
} from 'lucide-react';
import type { BrandDetail, KocItem } from '../../lib/types';
import {
  buildBrandResearchMarkdownReport,
  buildCompetitorMatrixCsv,
  generateBrandMarketResearchDossier,
  type BrandMarketResearchDossier,
  type BrandSkuPortfolioItem,
  type CompetitorMatrixItem,
  type EvidenceCitation,
  type LiveWebInspectionResult,
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
import { formatNumber, formatVnd } from '../../lib/format';
import { formatFollowers } from '../koc/kocUtils';
import {
  Avatar,
  BrandAvatar,
  Button,
  ChannelBar,
  DataTable,
  Panel,
  Stat,
  StatRow,
  Status,
  Tabs,
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
  | 'BRAND_AUDIT_4P'
  | 'INTERNAL_EXECUTION'
  | 'COMPETITOR_MATRIX'
  | 'REVIEW_PAIN_MINER'
  | 'EVIDENCE_AND_WEB';

const FEATURED_B2C_BRANDS = [
  'Kutieskin',
  'ClubClio',
  'Rejuran',
  "L'Occitane Việt Nam",
  'Ziaja Intimate',
  'Fresh',
  'Cindy Bloom',
  'Nucos',
];

const SAMPLE_COMPETITOR_URLS = [
  { url: 'https://kutieskin.vn', label: 'Kutieskin Official (kutieskin.vn)' },
  { url: 'https://cocoonvietnam.com', label: 'Cocoon Vietnam (cocoonvietnam.com)' },
  { url: 'https://www.larocheposay.vn', label: 'La Roche-Posay VN' },
];

const DEFAULT_SAMPLE_REVIEWS = [
  'Da mình hỗn hợp thiên dầu mùa hè dùng mấy dòng trước cứ bị bóng nhẫy và lên mụn ẩn ở trán.',
  'Sợ nhất bôi kem chống nắng xong đánh nền lên bị vón cục từng mảng trắng ở khóe mũi.',
  'Có mẹ nào kiểm tra xem kem này có chứa corticoid không ạ, mình sợ bôi cho bé sơ sinh bị mỏng da.',
  'Đặt ở giỏ hàng này có phải gian hàng Mall chính hãng có tem phụ tiếng Việt không shop?',
  'Mình đang dùng retinol bị bong tróc đỏ rát thì kết hợp sản phẩm này vào buổi sáng được không?',
  'Mua combo 2 hộp hôm nay còn được tặng kèm tuýp mini như trên video KOC giới thiệu không ạ?',
].join('\n');

export const BrandMarketResearchHubView: React.FC<BrandMarketResearchHubViewProps> = ({
  brands,
  kocs,
  selectedBrand,
  onSaveScrapedKocs,
  onNavigateToBrandProfile,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<ResearchTabKey>('BRAND_AUDIT_4P');

  const initialBrandName =
    selectedBrand && selectedBrand !== 'ALL' ? selectedBrand : 'Kutieskin';
  const [brandQuery, setBrandQuery] = useState<string>(initialBrandName);
  const [customCategory, setCustomCategory] = useState<string>('');
  const [customCompetitorText, setCustomCompetitorText] = useState<string>('');
  const [analyzingDossier, setAnalyzingDossier] = useState<boolean>(false);
  const [savingToProfile, setSavingToProfile] = useState<boolean>(false);

  const { profiles: savedBrandProfiles } = useBrandProfiles();

  const [dossier, setDossier] = useState<BrandMarketResearchDossier>(() =>
    generateBrandMarketResearchDossier({ brandNameOrQuery: initialBrandName })
  );

  const [prevSelectedBrand, setPrevSelectedBrand] = useState<string | undefined>(selectedBrand);
  if (selectedBrand !== prevSelectedBrand) {
    setPrevSelectedBrand(selectedBrand);
    if (selectedBrand && selectedBrand !== 'ALL' && selectedBrand !== brandQuery) {
      setBrandQuery(selectedBrand);
      setDossier(generateBrandMarketResearchDossier({ brandNameOrQuery: selectedBrand }));
    }
  }

  // --- Bộ lọc tra cứu nhanh dẫn chứng ---
  const [selectedEvidenceFilter, setSelectedEvidenceFilter] = useState<string>('ALL');
  const [highlightedEvidenceId, setHighlightedEvidenceId] = useState<string | null>(null);

  // --- State Quét KOC của Đối thủ ngay trong Tab 3 ---
  const [scanningCompetitorHandle, setScanningCompetitorHandle] = useState<string | null>(null);
  const [scannedCompProfile, setScannedCompProfile] =
    useState<TikTokCompetitorProfileSummary | null>(null);
  const [scannedCompKocs, setScannedCompKocs] = useState<TikTokCompetitorKocResult[]>([]);

  // --- State Đào Bình luận & Đánh giá Khách hàng (Tab 4) ---
  const [reviewVideoUrl, setReviewVideoUrl] = useState<string>(
    'https://www.tiktok.com/@keyshulive/video/7542352999495060743'
  );
  const [rawReviewText, setRawReviewText] = useState<string>(DEFAULT_SAMPLE_REVIEWS);
  const [miningReviews, setMiningReviews] = useState<boolean>(false);
  const [minedClusters, setMinedClusters] = useState<ReviewMiningCluster[]>(
    () => dossier.reviewClusters
  );
  const [minedStats, setMinedStats] = useState<{
    totalLines: number;
    scrapedFromTikTok: number;
  }>({ totalLines: 6, scrapedFromTikTok: 0 });
  const [savingFaqs, setSavingFaqs] = useState<boolean>(false);

  // --- State Quét Website / Trang đích trực tiếp (Tab 5) ---
  const [inspectUrlInput, setInspectUrlInput] = useState<string>('https://kutieskin.vn');
  const [inspectingUrl, setInspectingUrl] = useState<boolean>(false);
  const [webInspection, setWebInspection] = useState<LiveWebInspectionResult | null>(null);

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
                onClick={() => handleJumpToEvidence(id)}
                title={
                  ev
                    ? `[${ev.id}] ${ev.sourceDocument}: ${ev.exactQuoteOrMetric}`
                    : `Xem dẫn chứng ${id}`
                }
                className="inline-flex items-center gap-1 rounded border border-border-default bg-bg-subtle px-1.5 py-0.5 font-mono text-xs font-medium text-accent hover:border-accent hover:bg-accent-soft transition-colors"
              >
                [{id}]
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
      const target = (targetBrandName ?? brandQuery).trim();
      if (!target) {
        onNotify?.('Vui lòng chọn hoặc nhập tên thương hiệu cần nghiên cứu.', 'warning');
        return;
      }
      setAnalyzingDossier(true);
      try {
        const compList =
          overrideCompetitors ??
          customCompetitorText
            .split(/[,;\n]+/)
            .map((s) => s.trim())
            .filter(Boolean);

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
        setDossier(json.dossier);
        setMinedClusters(json.dossier.reviewClusters || []);
        onNotify?.(
          `Đã lập hồ sơ 8 mô-đun & trích xuất ${json.dossier.evidenceLedger?.length || 0} dẫn chứng cho thương hiệu ${json.dossier.brandName}`,
          'success'
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi khi phân tích thương hiệu.';
        onNotify?.(msg, 'error');
      } finally {
        setAnalyzingDossier(false);
      }
    },
    [brandQuery, customCategory, customCompetitorText, onNotify]
  );

  // Đồng bộ Định vị & Đối thủ vào Hồ sơ Thương hiệu (BrandProfile)
  const handleSyncPositioningToBrandProfile = async () => {
    setSavingToProfile(true);
    try {
      const targetKey = brandKey(dossier.brandName);
      const matchedProfile = savedBrandProfiles.find((p) => p.key === targetKey);
      const currentRevision = matchedProfile?.revision ?? 0;

      await saveBrandProfileSectionShared({
        brandName: dossier.brandName,
        revision: currentRevision,
        section: 'POSITIONING',
        data: dossier.positioning,
        summary: `Cập nhật định vị, nỗi đau khách hàng & danh sách đối thủ từ Nghiên cứu thị trường`,
      });

      onNotify?.(
        `Đã đồng bộ Định vị, Nỗi đau khách hàng & Đối thủ vào Hồ sơ thương hiệu ${dossier.brandName}`,
        'success'
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Không lưu được vào Hồ sơ thương hiệu.';
      onNotify?.(msg, 'error');
    } finally {
      setSavingToProfile(false);
    }
  };

  // Lưu bộ Câu hỏi khó (FAQ) từ Đào bình luận vào Hồ sơ Thương hiệu
  const handleSyncFaqsToBrandProfile = async () => {
    setSavingFaqs(true);
    try {
      const targetKey = brandKey(dossier.brandName);
      const matchedProfile = savedBrandProfiles.find((p) => p.key === targetKey);
      const currentRevision = matchedProfile?.revision ?? 0;
      const existingFaqs = matchedProfile?.faqs || [];

      const generatedFaqs = minedClusters.map((c, idx) => ({
        id: `faq-research-${Date.now()}-${idx + 1}`,
        question: c.suggestedFaqQuestion,
        answer: c.suggestedFaqAnswer,
        mention: ['Chính hãng 100%', 'Kiểm nghiệm an toàn', 'Đổi trả minh bạch'],
        avoid: ['Cam kết khỏi 100%', 'Chữa bệnh dứt điểm'],
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
        `Đã lưu ${generatedFaqs.length} câu hỏi khó (FAQ) vào Hồ sơ thương hiệu ${dossier.brandName}`,
        'success'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không lưu được mục Câu hỏi khó.';
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
        setScannedCompProfile(json.competitorProfile || null);
        setScannedCompKocs(Array.isArray(json.results) ? json.results : []);
        onNotify?.(
          `Đã phát hiện ${(json.results || []).length} KOC đang đăng bài cho đối thủ ${competitorName}`,
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

  // Chạy Đào bình luận khách hàng (Từ Link Video TikTok + Danh sách đánh giá)
  const handleRunReviewMining = async () => {
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
        `Đã phân tích ${json.totalAnalyzedLines || 0} bình luận (trong đó ${json.scrapedCommentsCount || 0} bình luận cào trực tiếp từ TikTok)`,
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
    onNotify?.('Đã xuất file CSV Ma trận đối thủ cạnh tranh', 'success');
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
    onNotify?.('Đã tải xuống Báo cáo Nghiên cứu Thương hiệu & Dẫn chứng (.MD)', 'success');
  };

  // --- Cột bảng Ma trận Danh mục Sản phẩm (SKU Portfolio) ---
  const skuColumns = useMemo<Column<BrandSkuPortfolioItem>[]>(
    () => [
      {
        key: 'product',
        header: 'Dòng sản phẩm (SKU) & Vai trò Phễu',
        render: (row) => (
          <div className="min-w-[240px]">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <Status
                tone={
                  row.role === 'HERO_CORE'
                    ? 'brand'
                    : row.role === 'TRAFFIC_DRIVER'
                      ? 'positive'
                      : row.role === 'VIP_BUNDLE'
                        ? 'warning'
                        : 'neutral'
                }
              >
                {row.roleLabel}
              </Status>
              <span className="font-mono text-xs text-text-muted">{row.skuCode}</span>
              {renderEvidenceBadges(row.evidenceIds)}
            </div>
            <div className="text-[13px] font-semibold text-text-primary leading-snug">
              {row.productName}
            </div>
            <div className="text-xs text-text-secondary mt-0.5">
              Quy cách: {row.packSize} · {row.avgRatingText}
            </div>
          </div>
        ),
      },
      {
        key: 'pricing',
        header: 'Giá Deal / Kinh tế học Đơn vị',
        render: (row) => (
          <div className="min-w-[190px]">
            <div className="font-mono text-[13px] font-semibold text-accent">
              {formatVnd(row.dealPriceVnd)}{' '}
              <span className="text-xs font-normal text-success">(-{row.discountPct}%)</span>
            </div>
            <div className="font-mono text-xs text-text-muted line-through">
              Niêm yết: {formatVnd(row.listPriceVnd)}
            </div>
            <div className="text-xs text-text-secondary mt-1">{row.unitEconomicsNote}</div>
          </div>
        ),
      },
      {
        key: 'commission_share',
        header: 'Hoa hồng & Đóng góp GMV',
        align: 'right',
        render: (row) => (
          <div className="text-right font-mono min-w-[130px]">
            <div className="text-[13px] font-semibold text-success">
              HH KOC: {row.affiliateCommissionPct}%
            </div>
            <div className="text-xs text-text-secondary">
              Tỷ trọng GMV: {row.estimatedGmvSharePct}%
            </div>
            <div className="text-xs text-text-muted">SL: {row.monthlySalesEstimate}</div>
          </div>
        ),
      },
      {
        key: 'specs_need',
        header: 'Hoạt chất Cốt lõi & Nhu cầu Giải quyết',
        render: (row) => (
          <div className="min-w-[260px] text-[12px]">
            <div className="text-text-primary mb-1">
              <span className="font-medium text-text-secondary">Công thức:</span>{' '}
              {row.coreIngredientsOrSpecs}
            </div>
            <div className="text-text-secondary">
              <span className="font-medium text-accent">Chỉ định:</span> {row.targetNeed}
            </div>
          </div>
        ),
      },
    ],
    [renderEvidenceBadges]
  );

  // --- Cột bảng Đơn Booking Thực tế đã lên sóng (File 3.2) ---
  const airedDealsColumns = useMemo<Column<VerifiedBookedDealEvidenceItem>[]>(
    () => [
      {
        key: 'dealCode',
        header: 'Mã Đơn (File 3.2) & Kênh KOC',
        render: (row) => (
          <div className="min-w-[180px]">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[12px] font-semibold text-accent">
                {row.dealCode}
              </span>
              <Status tone="neutral">{row.klTier}</Status>
            </div>
            <div className="font-mono text-[12px] text-text-primary mt-0.5">
              @{row.channelId}
            </div>
            <div className="text-xs text-text-muted">
              Gian: {row.storeName} · PIC: {row.pic}
            </div>
          </div>
        ),
      },
      {
        key: 'product_format',
        header: 'Sản phẩm Book & Định dạng',
        render: (row) => (
          <div className="min-w-[180px]">
            <div className="text-[13px] font-medium text-text-primary">{row.productName}</div>
            <div className="text-xs text-text-secondary">
              {row.format} · {row.videoType}
            </div>
          </div>
        ),
      },
      {
        key: 'cost_air',
        header: 'Chi phí Net & Ngày Air',
        align: 'right',
        render: (row) => (
          <div className="text-right font-mono min-w-[130px]">
            <div className="text-[13px] font-semibold text-text-primary">
              {formatVnd(row.costVnd)}
            </div>
            <div className="text-xs text-text-secondary">Air: {row.actualAirDate}</div>
            <div className="text-xs text-text-muted">Kế hoạch: {row.plannedAirDate}</div>
          </div>
        ),
      },
      {
        key: 'performance',
        header: 'Lượt xem & Doanh thu Seller',
        align: 'right',
        render: (row) => (
          <div className="text-right font-mono min-w-[150px]">
            {row.sellerGmvVnd !== undefined ? (
              <>
                <div className="text-[12px] font-semibold text-success">
                  GMV: {formatVnd(row.sellerGmvVnd)}
                </div>
                <div className="text-xs text-text-secondary">
                  {formatNumber(row.views || 0)} views · {row.sellerOrders || 0} đơn
                </div>
                <div className="text-xs text-accent">ROAS: {row.roas || 0}x</div>
              </>
            ) : (
              <span className="text-xs text-text-muted">Đối soát lịch Air W40–W45</span>
            )}
          </div>
        ),
      },
      {
        key: 'proofLink',
        header: 'Bằng chứng Video Air',
        align: 'right',
        render: (row) =>
          row.linkAir ? (
            <a
              href={row.linkAir}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded border border-border-default bg-bg-surface px-2.5 py-1 text-xs font-medium text-accent hover:border-accent hover:bg-accent-soft"
            >
              Mở Video TikTok
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="text-xs text-text-muted">—</span>
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
        header: 'Đối thủ & Kênh Chính thức',
        render: (row) => (
          <div className="flex items-start gap-2.5 min-w-[210px]">
            <BrandAvatar name={row.competitorName} size={28} />
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[13px] font-semibold text-text-primary">
                  {row.competitorName}
                </span>
                {renderEvidenceBadges(row.evidenceIds)}
              </div>
              <div className="flex items-center gap-2 text-xs text-text-muted font-mono mt-0.5">
                <span>{row.tiktokHandle}</span>
                <span>·</span>
                <span>{row.originCountry}</span>
              </div>
              {row.storeRatingAndSoldText && (
                <div className="text-xs text-text-secondary mt-0.5">
                  {row.storeRatingAndSoldText}
                </div>
              )}
              {row.shopeeMallUrl && (
                <a
                  href={row.shopeeMallUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-accent hover:underline mt-0.5"
                >
                  Gian hàng Shopee <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ),
      },
      {
        key: 'heroSku',
        header: 'SKU Đối đầu & So sánh Đơn giá/ml-g',
        render: (row) => {
          const disc =
            row.listPriceVnd > 0
              ? Math.round(((row.listPriceVnd - row.dealPriceVnd) / row.listPriceVnd) * 100)
              : 0;
          return (
            <div className="min-w-[230px]">
              <div className="text-[12px] text-text-primary font-medium line-clamp-2 mb-1">
                {row.heroSkuName}
              </div>
              <div className="flex items-center gap-2 font-mono text-[12px]">
                <span className="font-semibold text-accent">{formatVnd(row.dealPriceVnd)}</span>
                <span className="text-text-muted line-through text-xs">
                  {formatVnd(row.listPriceVnd)}
                </span>
                <Status tone="positive">-{disc}%</Status>
              </div>
              {row.pricePerUnitComparison && (
                <div className="text-xs text-warning mt-1">{row.pricePerUnitComparison}</div>
              )}
            </div>
          );
        },
      },
      {
        key: 'koc_scale',
        header: 'Quy mô KOC & GMV Sàn/tháng',
        align: 'right',
        render: (row) => (
          <div className="text-right font-mono min-w-[140px]">
            <div className="text-[13px] font-semibold text-success">
              HH: {row.affiliateCommissionPct}%
            </div>
            <div className="text-xs text-text-secondary">
              ~{formatNumber(row.estimatedMonthlyVideoCount)} video/tháng
            </div>
            {row.estimatedMonthlyGmvVnd && (
              <div className="text-xs text-text-muted">
                GMV ~{formatVnd(row.estimatedMonthlyGmvVnd)}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'channelShare',
        header: 'Tỷ trọng Sàn',
        render: (row) => (
          <div className="min-w-[140px]">
            <ChannelBar
              showLegend={false}
              values={[
                { channel: 'tiktok', value: row.tiktokChannelSharePct },
                { channel: 'shopee', value: row.shopeeChannelSharePct },
              ]}
            />
            <div className="flex justify-between text-xs text-text-muted font-mono mt-1">
              <span>TikTok {row.tiktokChannelSharePct}%</span>
              <span>Shopee {row.shopeeChannelSharePct}%</span>
            </div>
          </div>
        ),
      },
      {
        key: 'strengthsWeaknesses',
        header: 'Điểm mạnh USP & Điểm yếu Khách phàn nàn',
        render: (row) => (
          <div className="min-w-[260px] space-y-1.5 text-[12px]">
            <div>
              <span className="font-semibold text-success">Điểm mạnh: </span>
              <span className="text-text-secondary">{row.keyUsps[0]}</span>
            </div>
            <div>
              <span className="font-semibold text-danger">Khách phàn nàn: </span>
              <span className="text-text-secondary">{row.customerComplaints[0]}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'counterPlay',
        header: 'Đòn phản công cho ' + dossier.brandName,
        render: (row) => (
          <div className="min-w-[240px] text-[12px] text-text-primary bg-bg-subtle p-2 rounded border border-border-subtle">
            {row.upbaseCounterPlay}
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Dò KOC Đối thủ',
        align: 'right',
        render: (row) => {
          const isScanning = scanningCompetitorHandle === row.tiktokHandle;
          return (
            <Button
              size="sm"
              variant="secondary"
              disabled={isScanning}
              icon={Users}
              onClick={() => handleScanCompetitorKocs(row.tiktokHandle, row.competitorName)}
            >
              {isScanning ? 'Đang quét...' : 'Quét KOC'}
            </Button>
          );
        },
      },
    ],
    [dossier.brandName, handleScanCompetitorKocs, renderEvidenceBadges, scanningCompetitorHandle]
  );

  const filteredEvidenceList = useMemo(() => {
    if (selectedEvidenceFilter === 'ALL') return dossier.evidenceLedger;
    return dossier.evidenceLedger.filter((ev) => ev.category === selectedEvidenceFilter);
  }, [dossier.evidenceLedger, selectedEvidenceFilter]);

  return (
    <div className="space-y-5">
      {/* Thanh Điều khiển Chọn Thương hiệu & Chạy Phân tích */}
      <Panel
        title="Trung tâm Nghiên cứu Thị trường, Thương hiệu & Đối thủ (8 Mô-đun kèm Dẫn chứng Xác thực)"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {onNavigateToBrandProfile && (
              <Button
                size="sm"
                variant="secondary"
                icon={BookOpen}
                onClick={() => onNavigateToBrandProfile(dossier.brandName)}
              >
                Mở Hồ sơ Brand ({dossier.brandName})
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              icon={Download}
              onClick={handleDownloadMarkdownDossier}
            >
              Xuất Báo cáo & Dẫn chứng (.MD)
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={savingToProfile}
              icon={Check}
              onClick={handleSyncPositioningToBrandProfile}
            >
              Lưu Định vị & Đối thủ vào Hồ sơ Brand
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Chọn nhanh Brand tiêu biểu trong 69 gian hàng B2C */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-text-muted mr-1">
              Chọn nhanh Brand B2C:
            </span>
            {FEATURED_B2C_BRANDS.map((bName) => {
              const active = dossier.brandName.toLowerCase() === bName.toLowerCase();
              return (
                <button
                  key={bName}
                  type="button"
                  onClick={() => {
                    setBrandQuery(bName);
                    void handleRunBrandAnalysis(bName);
                  }}
                  className={`px-2.5 py-1 rounded text-[12px] font-medium transition-colors border ${
                    active
                      ? 'bg-accent text-text-inverse border-accent'
                      : 'bg-bg-subtle text-text-secondary border-border-default hover:text-text-primary'
                  }`}
                >
                  {bName}
                </button>
              );
            })}
          </div>

          {/* Ô nhập Brand bất kỳ + Ngành hàng + Đối thủ tùy chỉnh */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-4">
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Thương hiệu cần nghiên cứu (Chọn từ 42 Brand B2C hoặc gõ tên mới)
              </label>
              <div className="relative">
                <input
                  type="text"
                  list="b2c-brand-research-list"
                  value={brandQuery}
                  onChange={(e) => setBrandQuery(e.target.value)}
                  placeholder="VD: Kutieskin, ClubClio, Rejuran, La Roche-Posay..."
                  className="w-full h-9 px-3 rounded border border-border-default bg-bg-surface text-[13px] text-text-primary focus:outline-none focus:border-accent"
                />
                <datalist id="b2c-brand-research-list">
                  {brands.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.category}
                    </option>
                  ))}
                </datalist>
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Ngành hàng (Tùy chọn nếu nghiên cứu Brand ngoài)
              </label>
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder={dossier.category || 'Mỹ phẩm / Mẹ & Bé / Sức khỏe'}
                className="w-full h-9 px-3 rounded border border-border-default bg-bg-surface text-[13px] text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Thêm đối thủ muốn so sánh (Cách nhau dấu phẩy)
              </label>
              <input
                type="text"
                value={customCompetitorText}
                onChange={(e) => setCustomCompetitorText(e.target.value)}
                placeholder="VD: @mustelavietnam, Bepanthen, Yoosun..."
                className="w-full h-9 px-3 rounded border border-border-default bg-bg-surface text-[13px] text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div className="md:col-span-2">
              <Button
                variant="primary"
                className="w-full justify-center"
                disabled={analyzingDossier}
                icon={Search}
                onClick={() => void handleRunBrandAnalysis()}
              >
                {analyzingDossier ? 'Đang phân tích...' : 'Phân tích Brand'}
              </Button>
            </div>
          </div>
        </div>
      </Panel>

      {/* Hàng Chỉ số Tóm tắt Thương hiệu & Số lượng Dẫn chứng */}
      <StatRow>
        <Stat
          label={`Thương hiệu · ${dossier.originCountry}`}
          value={dossier.brandName}
          note={
            dossier.isUpbaseManaged
              ? `UpBase B2C vận hành (${dossier.internalExecutionAudit.totalStoresCount} gian hàng · PIC: ${dossier.accountPic || 'B2C'})`
              : `Thương hiệu nghiên cứu mở rộng · ${dossier.category}`
          }
        />
        <Stat
          label="Quy mô Ngành & Định vị Giá"
          value={dossier.fourP.priceRangeText}
          note={`${dossier.marketLandscape.categoryMarketSizeText.split('(')[0].trim()} (+${dossier.marketLandscape.yoyGrowthPct}%/năm)`}
        />
        <Stat
          label="Đối soát Thực thi B2C (Tháng 10)"
          value={
            dossier.internalExecutionAudit.totalBudgetNetVnd > 0
              ? `Net: ${formatVnd(dossier.internalExecutionAudit.totalBudgetNetVnd)}`
              : `${dossier.skuPortfolio.length} Dòng SKU chủ lực`
          }
          note={
            dossier.internalExecutionAudit.totalBookedOrders > 0
              ? `Đã book ${dossier.internalExecutionAudit.totalBookedOrders} đơn (Thực chi ${formatVnd(dossier.internalExecutionAudit.totalActualSpentNetVnd)} · Air ${dossier.internalExecutionAudit.totalAiredVideos} video)`
              : `AOV: ${formatVnd(dossier.marketLandscape.avgOrderValueVnd)} · Mua lại: ${dossier.marketLandscape.repeatPurchaseRatePct}%`
          }
          tone="positive"
        />
        <Stat
          label="Sổ Dẫn chứng & Nguồn Xác thực"
          value={`${dossier.evidenceLedger.length} dẫn chứng [EV]`}
          note={`Đối soát ${dossier.competitors.length} đối thủ trực tiếp & ${dossier.contentAngleBlueprints.length} góc kịch bản`}
          tone="warning"
        />
      </StatRow>

      {/* Thanh chuyển đổi 5 Tab công cụ nghiên cứu */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs<ResearchTabKey>
          value={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'BRAND_AUDIT_4P',
              label: `1. Hồ sơ Brand, 4P & SKU (${dossier.skuPortfolio.length})`,
            },
            {
              key: 'INTERNAL_EXECUTION',
              label: `2. Đối soát Thực thi & Đơn Book Thật (${
                dossier.internalExecutionAudit.totalBookedOrders ||
                dossier.internalExecutionAudit.stores.length
              })`,
            },
            {
              key: 'COMPETITOR_MATRIX',
              label: `3. Ma trận Đối thủ & Quét KOC (${dossier.competitors.length})`,
            },
            {
              key: 'REVIEW_PAIN_MINER',
              label: `4. Đào Bình luận & Nỗi đau Khách (${minedClusters.length})`,
            },
            {
              key: 'EVIDENCE_AND_WEB',
              label: `5. Sổ Dẫn chứng [EV] & Quét Website (${dossier.evidenceLedger.length})`,
            },
          ]}
        />
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: HỒ SƠ BÓC TÁCH BRAND, 4P, DANH MỤC SKU, MÙA VỤ & SWOT          */}
      {/* ===================================================================== */}
      {activeTab === 'BRAND_AUDIT_4P' && (
        <div className="space-y-5">
          {/* Tóm tắt điều hành kèm mã dẫn chứng */}
          <Panel
            title={`Định vị Chiến lược & Tóm tắt Điều hành: ${dossier.brandName}`}
            actions={renderEvidenceBadges(dossier.fourP.evidenceIds)}
          >
            <div className="space-y-3 text-[13px] text-text-primary leading-relaxed">
              <p className="bg-bg-subtle p-3.5 rounded border border-border-subtle">
                {dossier.executiveSummary}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded border border-border-default bg-bg-surface">
                  <div className="text-xs font-medium text-text-muted uppercase mb-1">
                    Câu chuyện & Nguồn gốc Thương hiệu
                  </div>
                  <div className="text-[12px] text-text-secondary">{dossier.positioning.story}</div>
                </div>
                <div className="p-3 rounded border border-border-default bg-bg-surface">
                  <div className="text-xs font-medium text-text-muted uppercase mb-1">
                    Chân dung Khách hàng Mục tiêu
                  </div>
                  <div className="text-[12px] text-text-secondary">
                    {dossier.positioning.targetAudience}
                  </div>
                </div>
                <div className="p-3 rounded border border-border-default bg-bg-surface">
                  <div className="text-xs font-medium text-text-muted uppercase mb-1">
                    Giọng điệu Nội dung (Tone of Voice)
                  </div>
                  <div className="text-[12px] text-text-secondary">
                    {dossier.positioning.toneOfVoice}
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          {/* Bóc tách Chiến lược 4P */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Panel
              title="P1 — Sản phẩm & Lợi điểm Độc nhất (Product & USP)"
              actions={renderEvidenceBadges(dossier.fourP.evidenceIds.slice(0, 3))}
            >
              <p className="text-[12px] text-text-secondary mb-3">
                {dossier.fourP.productStrategy}
              </p>
              <div className="space-y-1.5">
                {dossier.fourP.keyIngredientsOrSpecs.map((spec, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-[12px] text-text-primary bg-bg-subtle px-2.5 py-1.5 rounded"
                  >
                    <span className="font-mono text-accent font-semibold">0{i + 1}.</span>
                    <span>{spec}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel
              title="P2 & P3 — Chiến lược Giá, Hoa hồng & Kênh Phân phối (Price & Place)"
              actions={renderEvidenceBadges(dossier.fourP.evidenceIds.slice(0, 2))}
            >
              <p className="text-[12px] text-text-secondary mb-3">{dossier.fourP.priceStrategy}</p>
              <p className="text-[12px] text-text-secondary mb-3">{dossier.fourP.placeStrategy}</p>
              <div className="p-3 rounded bg-bg-subtle border border-border-subtle">
                <div className="text-xs font-medium text-text-muted mb-1.5">
                  Tỷ trọng phân bổ kênh thương mại điện tử
                </div>
                <ChannelBar
                  showLegend={false}
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
                <div className="flex justify-between text-xs font-mono text-text-secondary mt-1.5">
                  <span>TikTok Shop: {dossier.fourP.channelMixRatio.tiktokShopPct}%</span>
                  <span>Shopee Mall: {dossier.fourP.channelMixRatio.shopeeMallPct}%</span>
                  <span>Khác: {dossier.fourP.channelMixRatio.otherChannelsPct}%</span>
                </div>
              </div>
            </Panel>
          </div>

          {/* BẢNG MA TRẬN DANH MỤC SẢN PHẨM & KINH TẾ HỌC ĐƠN VỊ (SKU PORTFOLIO) */}
          <Panel
            title={`Ma trận Danh mục Sản phẩm & Kinh tế học Đơn vị (${dossier.skuPortfolio.length} dòng SKU)`}
          >
            <DataTable<BrandSkuPortfolioItem>
              columns={skuColumns}
              rows={dossier.skuPortfolio}
              rowKey={(r) => r.id}
              empty="Chưa có danh mục SKU."
            />
          </Panel>

          {/* Tâm lý khách hàng: Nỗi đau - Rào cản - Bằng chứng RTB - Cơ chế Khuyến mãi */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Panel
              title="Nỗi đau Khách hàng (Pain Points)"
            >
              <ul className="space-y-2 text-[12px] text-text-primary">
                {(dossier.positioning.painPoints || []).map((item, idx) => (
                  <li
                    key={idx}
                    className="p-2.5 rounded bg-bg-subtle border-l-2 border-danger leading-relaxed"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel
              title="Rào cản Ngần ngại Mua (Barriers)"
            >
              <ul className="space-y-2 text-[12px] text-text-primary">
                {(dossier.positioning.barriersToTrial || []).map((item, idx) => (
                  <li
                    key={idx}
                    className="p-2.5 rounded bg-bg-subtle border-l-2 border-warning leading-relaxed"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel
              title="Bằng chứng Tin cậy (RTBs)"
            >
              <ul className="space-y-2 text-[12px] text-text-primary">
                {(dossier.positioning.rtbs || []).map((item, idx) => (
                  <li
                    key={idx}
                    className="p-2.5 rounded bg-bg-subtle border-l-2 border-success leading-relaxed"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel
              title="P4 — Cơ chế Deal & Quà tặng (Promotion)"
            >
              <ul className="space-y-2 text-[12px] text-text-primary">
                {dossier.fourP.winningBundleMechanics.map((item, idx) => (
                  <li
                    key={idx}
                    className="p-2.5 rounded bg-bg-subtle border-l-2 border-accent leading-relaxed"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          {/* QUY MÔ NGÀNH, TỪ KHÓA TÌM KIẾM & LỊCH MÙA VỤ 4 QUÝ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5">
              <Panel
                title="Từ khóa Tìm kiếm Cao trên TikTok & Shopee"
                actions={renderEvidenceBadges(dossier.marketLandscape.evidenceIds.slice(0, 2))}
              >
                <div className="space-y-2.5">
                  {dossier.marketLandscape.searchKeywords.map((kw, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded border border-border-default bg-bg-surface space-y-1"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-[12px] font-semibold text-accent">
                          &ldquo;{kw.keyword}&rdquo;
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Status
                            tone={
                              kw.competitionLevel === 'CƠ HỘI NGÁCH'
                                ? 'positive'
                                : kw.competitionLevel === 'CAO'
                                  ? 'warning'
                                  : 'neutral'
                            }
                          >
                            {kw.competitionLevel}
                          </Status>
                          <span className="font-mono text-xs text-text-muted">
                            ~{formatNumber(kw.monthlySearchVolumeEst)} lượt/tháng
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-text-secondary">
                        <span className="font-medium text-text-primary">{kw.searchIntent}:</span>{' '}
                        {kw.recommendedVideoHook}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            <div className="lg:col-span-7">
              <Panel
                title="Lịch Điểm rơi Chiến dịch & Tính Mùa vụ 12 Tháng (Seasonality Calendar)"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {dossier.marketLandscape.seasonalityCalendar.map((q) => (
                    <div
                      key={q.quarter}
                      className="p-3 rounded border border-border-default bg-bg-surface space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-semibold text-text-primary">
                          {q.quarter}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Status
                            tone={
                              q.demandLevel === 'ĐỈNH ĐIỂM'
                                ? 'danger'
                                : q.demandLevel === 'TĂNG TRƯỞNG'
                                  ? 'brand'
                                  : 'neutral'
                            }
                          >
                            {q.demandLevel}
                          </Status>
                          <span className="font-mono text-xs font-semibold text-accent">
                            Ngân sách {q.recommendedBudgetWeightPct}%
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-text-muted">{q.weatherOrEventTrigger}</div>
                      <div className="text-[12px] text-text-primary">
                        <span className="font-medium text-danger">Nhu cầu bùng phát:</span>{' '}
                        {q.customerSymptomSpike}
                      </div>
                      <div className="text-xs text-text-secondary">
                        <span className="font-medium text-success">SKU trọng tâm:</span>{' '}
                        {q.prioritySkus}
                      </div>
                      <div className="text-xs text-text-secondary">
                        <span className="font-medium text-accent">Tuyến nội dung:</span>{' '}
                        {q.contentFocus}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>

          {/* MA TRẬN SWOT CÓ DẪN CHỨNG & QUY CHUẨN KIỂM DUYỆT SÀN */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7">
              <Panel
                title="Ma trận SWOT Thực chiến (Gắn trực tiếp Dẫn chứng Đối soát)"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
                  <div className="p-3 rounded border border-border-default bg-bg-surface space-y-2">
                    <div className="font-semibold text-success uppercase text-xs">
                      Điểm mạnh (Strengths)
                    </div>
                    {dossier.swotAndCompliance.strengths.map((s, i) => (
                      <div key={i} className="p-2 rounded bg-bg-subtle space-y-1">
                        <div className="text-text-primary font-medium">
                          {s.point} {renderEvidenceBadges(s.evidenceIds)}
                        </div>
                        <div className="text-xs text-text-secondary">
                          → Ứng dụng: {s.strategicImpact}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded border border-border-default bg-bg-surface space-y-2">
                    <div className="font-semibold text-warning uppercase text-xs">
                      Điểm yếu & Nút thắt (Weaknesses)
                    </div>
                    {dossier.swotAndCompliance.weaknesses.map((w, i) => (
                      <div key={i} className="p-2 rounded bg-bg-subtle space-y-1">
                        <div className="text-text-primary font-medium">
                          {w.point} {renderEvidenceBadges(w.evidenceIds)}
                        </div>
                        <div className="text-xs text-text-secondary">
                          → Hệ quả: {w.strategicImpact}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded border border-border-default bg-bg-surface space-y-2">
                    <div className="font-semibold text-accent uppercase text-xs">
                      Cơ hội Tăng trưởng (Opportunities)
                    </div>
                    {dossier.swotAndCompliance.opportunities.map((o, i) => (
                      <div key={i} className="p-2 rounded bg-bg-subtle space-y-1">
                        <div className="text-text-primary font-medium">
                          {o.point} {renderEvidenceBadges(o.evidenceIds)}
                        </div>
                        <div className="text-xs text-text-secondary">
                          → Đòn bẩy: {o.strategicImpact}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded border border-border-default bg-bg-surface space-y-2">
                    <div className="font-semibold text-danger uppercase text-xs">
                      Thách thức & Rủi ro (Threats)
                    </div>
                    {dossier.swotAndCompliance.threats.map((t, i) => (
                      <div key={i} className="p-2 rounded bg-bg-subtle space-y-1">
                        <div className="text-text-primary font-medium">
                          {t.point} {renderEvidenceBadges(t.evidenceIds)}
                        </div>
                        <div className="text-xs text-text-secondary">
                          → Phòng vệ: {t.strategicImpact}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>
            </div>

            <div className="lg:col-span-5">
              <Panel
                title="Quy chuẩn Kiểm duyệt Sàn & Từ khóa Cấm (TikTok Shop / Shopee)"
              >
                <div className="space-y-3">
                  {dossier.swotAndCompliance.platformComplianceRules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded border border-border-default bg-bg-surface space-y-1.5 text-[12px]"
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-danger">
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                        <span>{rule.riskCategory}</span>
                      </div>
                      <div>
                        <span className="font-medium text-text-secondary">Từ ngữ cấm dùng: </span>
                        <span className="font-mono text-xs text-danger">
                          {rule.forbiddenPhrases.map((p) => `"${p}"`).join(', ')}
                        </span>
                      </div>
                      <div className="text-xs text-text-muted">
                        <span className="font-medium">Rủi ro chế tài:</span>{' '}
                        {rule.platformPenaltyRisk}
                      </div>
                      <div className="p-2 rounded bg-bg-subtle border-l-2 border-success text-text-primary">
                        <span className="font-semibold text-success">Cách nói an toàn: </span>
                        {rule.safeAlternativePhrasing}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>

          {/* CƠ CẤU PHÂN BỔ KOC THEO PHÂN TẦNG KL1-KL4 & ĐỊNH MỨC KPI */}
          <Panel
            title="Cơ cấu Phân bổ Ngân sách KOC theo Phân tầng (KL1 – KL4) & Định mức KPI"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {dossier.kocTierStrategy.map((tier) => (
                <div
                  key={tier.tierCode}
                  className="p-3.5 rounded border border-border-default bg-bg-surface flex flex-col justify-between space-y-2.5"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Status tone="brand">{tier.tierCode}</Status>
                      {renderEvidenceBadges(tier.evidenceIds)}
                    </div>
                    <div className="text-[13px] font-semibold text-text-primary">
                      {tier.tierLabel}
                    </div>
                    <div className="font-mono text-xs text-text-muted">
                      Quy mô: {tier.followerRange}
                    </div>
                    <p className="text-[12px] text-text-secondary">{tier.funnelRole}</p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-border-subtle text-xs">
                    <div className="flex justify-between font-mono">
                      <span className="text-text-muted">Tỷ trọng ngân sách:</span>
                      <span className="font-semibold text-accent">{tier.budgetWeightPct}%</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span className="text-text-muted">Tỷ trọng số video:</span>
                      <span className="font-semibold text-text-primary">
                        {tier.videoVolumeWeightPct}%
                      </span>
                    </div>
                    <div className="text-text-secondary">
                      <span className="font-medium text-text-primary">Đơn giá tham chiếu:</span>{' '}
                      {tier.avgBookingCostRangeVnd}
                    </div>
                    <div className="p-2 rounded bg-bg-subtle font-mono text-xs space-y-0.5">
                      <div>Hook 2s: {tier.targetHookRate2sPct} · CTR: {tier.targetCtrPct}</div>
                      <div>CVR: {tier.targetCvrPct} · ROAS: {tier.targetRoas}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Khung Góc kịch bản KOC chuyển đổi cao */}
          <Panel
            title="Khung Góc Kịch bản KOC Chuyển đổi Cao (Winning Content Angles)"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dossier.contentAngleBlueprints.map((angle: WinningContentAngleBlueprint, idx) => (
                <div
                  key={angle.id}
                  className="p-4 rounded border border-border-default bg-bg-surface space-y-2.5 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Status tone="brand">Góc 0{idx + 1}</Status>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-text-muted">
                          {angle.bestKocTier}
                        </span>
                        {renderEvidenceBadges(angle.evidenceIds)}
                      </div>
                    </div>
                    <div className="text-[14px] font-semibold text-text-primary">
                      {angle.pillarName}
                    </div>
                    <div className="text-xs text-text-muted">
                      Tệp người xem: {angle.targetPersona}
                    </div>
                    <div className="p-2.5 rounded bg-bg-subtle border border-border-subtle text-[12px] text-text-primary">
                      <span className="font-semibold text-accent">Hook 3s đầu: </span>
                      &ldquo;{angle.hook3s}&rdquo;
                    </div>
                    <div className="text-[12px] text-text-secondary">
                      <span className="font-medium text-text-primary">Cảnh quay bắt buộc: </span>
                      {angle.visualProof}
                    </div>
                    <div className="text-[12px] text-text-secondary">
                      <span className="font-medium text-text-primary">Thông điệp RTB: </span>
                      {angle.keyMessageRtb}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border-subtle flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-success font-medium">CTA: {angle.recommendedCta}</span>
                    {angle.expectedRoasRange && (
                      <span className="font-mono text-accent">
                        CTR {angle.expectedCtrRange} · ROAS {angle.expectedRoasRange}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: ĐỐI SOÁT THỰC THI NỘI BỘ B2C & ĐƠN BOOKING THẬT (FILE 4.1 & 3.2) */}
      {/* ===================================================================== */}
      {activeTab === 'INTERNAL_EXECUTION' && (
        <div className="space-y-5">
          <Panel
            title={`Sổ cái Đối soát Thực thi Nội bộ B2C: ${dossier.brandName}`}
            actions={renderEvidenceBadges(dossier.internalExecutionAudit.evidenceIds)}
          >
            {dossier.internalExecutionAudit.stores.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dossier.internalExecutionAudit.stores.map((st) => (
                    <div
                      key={st.storeId}
                      className="p-4 rounded border border-border-default bg-bg-surface space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-[14px] font-semibold text-text-primary">
                            {st.storeName}
                          </div>
                          <div className="text-xs text-text-muted font-mono">
                            Mã gian: {st.storeId} · Sàn: {st.platform}
                          </div>
                        </div>
                        <Status
                          tone={
                            st.utilizationPct > 100
                              ? 'danger'
                              : st.scheduleAdherencePct >= 60
                                ? 'positive'
                                : 'warning'
                          }
                        >
                          Giải ngân {st.utilizationPct}% · Đúng lịch {st.scheduleAdherencePct}%
                        </Status>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded bg-bg-subtle font-mono text-[12px]">
                        <div>
                          <div className="text-xs text-text-muted">Hạn mức Net</div>
                          <div className="font-semibold text-text-primary">
                            {formatVnd(st.budgetNetVnd)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-text-muted">Thực chi Net</div>
                          <div className="font-semibold text-accent">
                            {formatVnd(st.actualSpentNetVnd)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-text-muted">Kế hoạch Video</div>
                          <div className="font-semibold text-text-primary">
                            {st.totalPlannedVideos} ({st.planPaidVideos} Paid / {st.planSelfVideos}{' '}
                            Self)
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-text-muted">Đã Book / Đã Air</div>
                          <div className="font-semibold text-success">
                            {st.totalBookedOrders} / {st.totalAiredVideos} video
                          </div>
                        </div>
                      </div>

                      <div className="text-[12px] text-text-secondary space-y-1">
                        <div>
                          <span className="font-medium text-text-primary">Nhân sự phụ trách:</span>{' '}
                          PIC {st.pic} · Trưởng nhóm: {st.leaderName}
                        </div>
                        <div>
                          <span className="font-medium text-warning">Chẩn đoán lịch Air W40–W45:</span>{' '}
                          {st.syncDiagnosis}
                        </div>
                        {st.top3BurstDates.length > 0 && (
                          <div className="font-mono text-xs text-text-muted">
                            Ngày lên sóng tập trung cao nhất: {st.top3BurstDates.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded bg-bg-subtle border border-border-subtle text-[13px] text-text-secondary">
                Thương hiệu <strong>{dossier.brandName}</strong> hiện đang được phân tích theo chế độ
                mở rộng (chưa phát sinh mã gian hàng trong 69 gian hàng B2C phụ trách = 1 của File
                4.1). Bạn có thể tham khảo bảng dữ liệu chuẩn ngành từ TikTok Seller Center bên dưới.
              </div>
            )}
          </Panel>

          {/* Thống kê Ngân sách & Đơn giá theo từng Dòng sản phẩm từ File 3.2 */}
          {dossier.internalExecutionAudit.bookedProductsSummary.length > 0 && (
            <Panel
              title={`Cơ cấu Dòng sản phẩm (SKU) được Book thực tế trong File 3.2 (${dossier.brandName})`}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {dossier.internalExecutionAudit.bookedProductsSummary.map((prod, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded border border-border-default bg-bg-surface space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-text-primary">
                        {prod.productName}
                      </span>
                      <Status tone="brand">{prod.bookedOrderCount} đơn book</Status>
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-2 rounded bg-bg-subtle font-mono text-[12px]">
                      <div>
                        <div className="text-xs text-text-muted">Tổng chi thực tế</div>
                        <div className="font-semibold text-accent">
                          {formatVnd(prod.totalSpentVnd)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-text-muted">Đơn giá TB / Video</div>
                        <div className="font-semibold text-text-primary">
                          {formatVnd(prod.avgCostPerVideoVnd)}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-text-secondary">
                      Phân tầng chủ đạo: <strong>{prod.dominantTier}</strong> · Hình thức:{' '}
                      {prod.dominantFormat}
                    </div>
                    {prod.sampleVideoLinks.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {prod.sampleVideoLinks.map((url, uIdx) => (
                          <a
                            key={uIdx}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded border border-border-default px-2 py-0.5 text-xs font-mono text-accent hover:bg-accent-soft"
                          >
                            Video mẫu #{uIdx + 1} <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* Bảng Chứng từ Đơn Booking & Link Video TikTok đã Air thật (File 3.2) */}
          {dossier.internalExecutionAudit.verifiedAiredDeals.length > 0 && (
            <Panel
              title={`Chứng từ Đơn Booking & Video KOC đã lên sóng thực tế (${dossier.internalExecutionAudit.verifiedAiredDeals.length} đơn tiêu biểu từ File 3.2)`}
            >
              <DataTable<VerifiedBookedDealEvidenceItem>
                columns={airedDealsColumns}
                rows={dossier.internalExecutionAudit.verifiedAiredDeals}
                rowKey={(r) => r.dealCode}
                empty="Chưa có dữ liệu đơn booking."
              />
            </Panel>
          )}

          {/* Hiệu suất Chiến dịch Quảng cáo TikTok Seller Center */}
          <Panel
            title="Đối chiếu Hiệu suất Chiến dịch Quảng cáo TikTok Shop Seller Center"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {dossier.internalExecutionAudit.sellerAdsCampaigns.map((camp) => (
                <div
                  key={camp.campaignId}
                  className="p-3.5 rounded border border-border-default bg-bg-surface space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-text-primary truncate">
                      {camp.campaignName}
                    </span>
                    <Status tone={camp.isDirectBrandMatch ? 'positive' : 'neutral'}>
                      {camp.isDirectBrandMatch ? 'Đúng Brand' : 'Chuẩn ngành'}
                    </Status>
                  </div>
                  <div className="text-xs text-text-muted font-mono">
                    ID: {camp.campaignId} · Gian: {camp.storeName}
                  </div>
                  <div className="grid grid-cols-3 gap-2 p-2 rounded bg-bg-subtle font-mono text-xs">
                    <div>
                      <div className="text-text-muted">Chi phí Ads</div>
                      <div className="font-semibold text-text-primary">
                        {formatVnd(camp.costVnd)}
                      </div>
                    </div>
                    <div>
                      <div className="text-text-muted">GMV</div>
                      <div className="font-semibold text-success">{formatVnd(camp.gmvVnd)}</div>
                    </div>
                    <div>
                      <div className="text-text-muted">ROAS</div>
                      <div className="font-semibold text-accent">{camp.roas}x</div>
                    </div>
                  </div>
                  <div className="flex justify-between font-mono text-xs text-text-secondary">
                    <span>Đơn: {formatNumber(camp.orders)}</span>
                    <span>CPA: {formatVnd(camp.cpaVnd)}</span>
                    <span>Hook 2s: {camp.hookRate2sPct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: MA TRẬN ĐỐI THỦ TRỰC DIỆN & QUÉT KOC ĐỐI THỦ                  */}
      {/* ===================================================================== */}
      {activeTab === 'COMPETITOR_MATRIX' && (
        <div className="space-y-5">
          <Panel
            title={`Ma trận Đối đầu Trực diện: ${dossier.brandName} vs ${dossier.competitors.length} Đối thủ Cùng Phân khúc`}
            actions={
              <Button
                size="sm"
                variant="secondary"
                icon={Download}
                onClick={handleDownloadCompetitorCsv}
              >
                Xuất bảng Excel (.CSV)
              </Button>
            }
          >
            <DataTable<CompetitorMatrixItem>
              columns={competitorColumns}
              rows={dossier.competitors}
              rowKey={(r) => r.id}
              empty="Chưa có dữ liệu đối thủ cạnh tranh."
            />
          </Panel>

          {/* Kết quả Quét KOC thực tế của Đối thủ khi người dùng bấm nút "Quét KOC" */}
          {(scanningCompetitorHandle || scannedCompKocs.length > 0) && (
            <Panel
              title={
                scannedCompProfile
                  ? `Danh sách KOC Thực tế đang làm cho Đối thủ: ${scannedCompProfile.brandName} (@${scannedCompProfile.handle})`
                  : `Đang dò quét mạng lưới KOC của đối thủ ${scanningCompetitorHandle}...`
              }
            >
              {scannedCompKocs.length === 0 ? (
                <div className="py-6 text-center text-[13px] text-text-muted">
                  Đang quét dữ liệu KOC từ TikTok...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {scannedCompKocs.map((item) => {
                    const clean = item.handle.toLowerCase().replace(/^@+/, '');
                    const alreadySaved = existingByHandle.has(clean);
                    return (
                      <div
                        key={item.handle}
                        className="p-3.5 rounded border border-border-default bg-bg-surface flex items-start justify-between gap-3"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <Avatar name={item.channelProfile.nickname} src={item.channelProfile.avatarUrl} size={36} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-semibold text-text-primary truncate">
                                {item.channelProfile.nickname}
                              </span>
                              <Status tone="brand">{item.affiliateMetrics.suggestedClassification.tierLabel}</Status>
                            </div>
                            <div className="text-xs font-mono text-text-muted">
                              @{item.handle} · {formatFollowers(item.channelProfile.followers)} flw · ER{' '}
                              {item.engagementMetrics.engagementRate}%
                            </div>
                            <div className="text-[12px] text-text-secondary line-clamp-2 mt-1">
                              {item.competitorCollaboration.competitorProductPromoted}
                            </div>
                            <div className="flex items-center gap-3 text-xs font-mono text-text-muted mt-1">
                              <span>{formatNumber(item.competitorCollaboration.latestCollabViews)} views</span>
                              <span>{item.competitorCollaboration.competitorVideoCount} video</span>
                              {item.competitorCollaboration.latestCollabVideoUrl && (
                                <a
                                  href={item.competitorCollaboration.latestCollabVideoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-accent hover:underline inline-flex items-center gap-0.5"
                                >
                                  Xem video <ArrowUpRight className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant={alreadySaved ? 'secondary' : 'primary'}
                          icon={alreadySaved ? Check : UserPlus}
                          onClick={() => handleSaveOneCompetitorKoc(item)}
                        >
                          {alreadySaved ? 'Cập nhật' : 'Lưu KOC'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: ĐÀO BÌNH LUẬN & NỖI ĐAU KHÁCH HÀNG (REVIEW & COMMENT MINER)    */}
      {/* ===================================================================== */}
      {activeTab === 'REVIEW_PAIN_MINER' && (
        <div className="space-y-5">
          <Panel
            title="Công cụ Đào Bình luận & Phân tích Nỗi đau Khách hàng (Review & Comment Miner)"
            actions={
              <Button
                size="sm"
                variant="primary"
                disabled={savingFaqs}
                icon={Check}
                onClick={handleSyncFaqsToBrandProfile}
              >
                Lưu {minedClusters.length} cụm FAQ vào Hồ sơ Brand ({dossier.brandName})
              </Button>
            }
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-5 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    1. Link Video TikTok của Brand hoặc Đối thủ (Tự động cào bình luận người xem)
                  </label>
                  <input
                    type="text"
                    value={reviewVideoUrl}
                    onChange={(e) => setReviewVideoUrl(e.target.value)}
                    placeholder="https://www.tiktok.com/@.../video/..."
                    className="w-full h-9 px-3 rounded border border-border-default bg-bg-surface text-[12px] font-mono text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    2. Dán thêm đánh giá Shopee / Bình luận khách hàng (Mỗi dòng 1 bình luận)
                  </label>
                  <textarea
                    rows={6}
                    value={rawReviewText}
                    onChange={(e) => setRawReviewText(e.target.value)}
                    placeholder="Dán các bình luận, câu hỏi hoặc phàn nàn 1-3 sao của khách hàng vào đây..."
                    className="w-full p-2.5 rounded border border-border-default bg-bg-surface text-[12px] text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-text-muted">
                    Đã xử lý: {minedStats.totalLines} dòng ({minedStats.scrapedFromTikTok} cào từ
                    TikTok)
                  </span>
                  <Button
                    variant="primary"
                    disabled={miningReviews}
                    icon={MessageSquare}
                    onClick={() => void handleRunReviewMining()}
                  >
                    Bóc tách Nỗi đau & Câu hỏi
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-7 space-y-3">
                {minedClusters.map((cluster) => (
                  <div
                    key={cluster.id}
                    className="p-3.5 rounded border border-border-default bg-bg-surface space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Status
                          tone={
                            cluster.category === 'PAIN_POINT'
                              ? 'danger'
                              : cluster.category === 'BARRIER_TO_TRIAL'
                                ? 'warning'
                                : cluster.category === 'COMPETITOR_COMPLAINT'
                                  ? 'brand'
                                  : 'positive'
                          }
                        >
                          {cluster.categoryLabel}
                        </Status>
                        <span className="text-[13px] font-semibold text-text-primary">
                          {cluster.topicTitle}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-text-muted">
                          {cluster.mentionCount} lượt · {cluster.sharePct}% tỷ trọng
                        </span>
                        {renderEvidenceBadges(cluster.evidenceIds)}
                      </div>
                    </div>

                    <div className="space-y-1 pl-2 border-l-2 border-border-default">
                      {cluster.sampleQuotes.map((q, i) => (
                        <div key={i} className="text-[12px] text-text-secondary italic">
                          &ldquo;{q}&rdquo;
                        </div>
                      ))}
                    </div>

                    <div className="p-2 rounded bg-bg-subtle text-[12px]">
                      <span className="font-semibold text-accent">
                        Gợi ý Hook làm Video giải đáp:{' '}
                      </span>
                      <span className="text-text-primary">{cluster.recommendedScriptHook}</span>
                    </div>

                    <div className="text-xs text-text-secondary">
                      <span className="font-medium text-text-primary">
                        FAQ chuẩn hóa ({cluster.suggestedFaqQuestion}):{' '}
                      </span>
                      {cluster.suggestedFaqAnswer}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: SỔ DẪN CHỨNG XÁC THỰC ([EV]) & QUÉT LIVE WEBSITE              */}
      {/* ===================================================================== */}
      {activeTab === 'EVIDENCE_AND_WEB' && (
        <div className="space-y-5">
          {/* SỔ DẪN CHỨNG & TRUY VẾT NGUỒN XÁC THỰC */}
          <Panel
            title={`Sổ Dẫn chứng & Nguồn Xác thực Dữ liệu (${dossier.evidenceLedger.length} Mã dẫn chứng [EV-01..EV-${String(dossier.evidenceLedger.length).padStart(2, '0')}])`}
          >
            <div className="space-y-4">
              {/* Bộ lọc theo loại nguồn dẫn chứng */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'ALL', label: `Tất cả nguồn (${dossier.evidenceLedger.length})` },
                  { id: 'INTERNAL_PLAN_41', label: 'File 4.1 & 4.1.1 (Kế hoạch B2C)' },
                  { id: 'BOOKING_LEDGER_32', label: 'File 3.2 (Đơn Book & Link Air)' },
                  { id: 'SELLER_CENTER_ADS', label: 'TikTok Seller Center' },
                  { id: 'CLINICAL_REGULATORY', label: 'Hồ sơ Kiểm định & Công bố' },
                  { id: 'STOREFRONT_OFFICIAL', label: 'Hệ thống Phân phối Mall/Nhà thuốc' },
                  { id: 'COMPETITOR_BENCHMARK', label: 'Đối soát Đối thủ' },
                  { id: 'CUSTOMER_VOC', label: 'Tiếng nói Khách hàng (VOC)' },
                  { id: 'LIVE_WEB_DOM', label: 'Quét trực tiếp DOM Website' },
                ].map((f) => {
                  const active = selectedEvidenceFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedEvidenceFilter(f.id)}
                      className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                        active
                          ? 'bg-accent text-text-inverse border-accent'
                          : 'bg-bg-subtle text-text-secondary border-border-default hover:text-text-primary'
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              {/* Danh sách thẻ dẫn chứng */}
              <div className="space-y-2.5">
                {filteredEvidenceList.map((ev) => {
                  const isHighlighted = highlightedEvidenceId === ev.id;
                  return (
                    <div
                      key={ev.id}
                      className={`p-3.5 rounded border transition-colors space-y-1.5 ${
                        isHighlighted
                          ? 'border-accent bg-accent-soft'
                          : 'border-border-default bg-bg-surface'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[12px] font-semibold text-accent px-2 py-0.5 rounded bg-bg-subtle border border-border-default">
                            [{ev.id}]
                          </span>
                          <Status
                            tone={
                              ev.reliabilityTag === 'ĐỐI SOÁT NỘI BỘ 100%'
                                ? 'positive'
                                : ev.reliabilityTag === 'QUÉT TRỰC TIẾP DOM/HTTP'
                                  ? 'brand'
                                  : ev.reliabilityTag === 'HỒ SƠ CÔNG BỐ / KIỂM ĐỊNH'
                                    ? 'warning'
                                    : 'neutral'
                            }
                          >
                            {ev.reliabilityTag}
                          </Status>
                          <span className="text-[12px] font-medium text-text-secondary">
                            {ev.categoryLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-text-muted font-mono">
                          <span>Đối soát: {ev.verifiedDate}</span>
                          {ev.sourceUrl && (
                            <a
                              href={ev.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-accent hover:underline"
                            >
                              Mở link nguồn <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="text-[13px] font-semibold text-text-primary">
                        Luận điểm chứng minh: {ev.claimSupported}
                      </div>

                      <div className="text-[12px] text-text-secondary">
                        <span className="font-medium text-text-primary">Tài liệu / Nguồn gốc: </span>
                        {ev.sourceDocument}
                      </div>

                      <div className="p-2.5 rounded bg-bg-subtle border border-border-subtle font-mono text-xs text-text-primary leading-relaxed">
                        {ev.exactQuoteOrMetric}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>

          {/* CÔNG CỤ QUÉT TRỰC TIẾP WEBSITE / TRANG ĐÍCH ĐỂ BỔ SUNG DẪN CHỨNG LIVE DOM */}
          <Panel
            title="Trình Quét Trực tiếp Website & Trang đích Thương hiệu / Đối thủ (Live Web DOM Inspector)"
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-text-muted mr-1">URL mẫu:</span>
                {SAMPLE_COMPETITOR_URLS.map((sample) => (
                  <button
                    key={sample.url}
                    type="button"
                    onClick={() => {
                      setInspectUrlInput(sample.url);
                      void handleInspectWebsiteUrl(sample.url);
                    }}
                    className="px-2.5 py-1 rounded text-xs bg-bg-subtle text-text-secondary border border-border-default hover:text-text-primary"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={inspectUrlInput}
                  onChange={(e) => setInspectUrlInput(e.target.value)}
                  placeholder="Nhập URL website thương hiệu hoặc đối thủ (VD: https://kutieskin.vn)"
                  className="flex-1 h-9 px-3 rounded border border-border-default bg-bg-surface text-[13px] font-mono text-text-primary focus:outline-none focus:border-accent"
                />
                <Button
                  variant="primary"
                  disabled={inspectingUrl}
                  icon={Globe}
                  onClick={() => void handleInspectWebsiteUrl()}
                >
                  Quét Trang Đích
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
                      });
                      setDossier(updated);
                      onNotify?.(
                        `Đã gộp dẫn chứng DOM từ ${webInspection.domain} vào Sổ dẫn chứng của ${dossier.brandName}`,
                        'success'
                      );
                    }}
                  >
                    Gộp vào Sổ Dẫn chứng Brand
                  </Button>
                )}
              </div>

              {webInspection && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded border border-border-default bg-bg-surface space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[12px] font-semibold text-accent">
                        {webInspection.domain}
                      </span>
                      <Status tone={webInspection.isLiveFetched ? 'positive' : 'warning'}>
                        {webInspection.isLiveFetched
                          ? `Kết nối trực tiếp (HTTP ${webInspection.httpStatus})`
                          : 'Chế độ phân tích tên miền'}
                      </Status>
                    </div>
                    <div className="text-[14px] font-semibold text-text-primary">
                      {webInspection.pageTitle}
                    </div>
                    <p className="text-[12px] text-text-secondary">
                      {webInspection.metaDescription}
                    </p>
                    <div className="text-xs text-text-muted bg-bg-subtle p-2 rounded">
                      {webInspection.summaryNote}
                    </div>

                    {webInspection.detectedPricesVnd.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-text-muted mb-1">
                          Mốc giá phát hiện trên trang:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {webInspection.detectedPricesVnd.map((p) => (
                            <span
                              key={p}
                              className="px-2 py-0.5 rounded bg-bg-subtle border border-border-default font-mono text-xs text-accent"
                            >
                              {formatVnd(p)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded border border-border-default bg-bg-surface space-y-3">
                    <div>
                      <div className="text-xs font-medium text-text-muted uppercase mb-1">
                        Tiêu đề H1 / H2 & Danh mục phát hiện trên trang
                      </div>
                      <ul className="space-y-1 text-[12px] text-text-primary">
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
                      <div>
                        <div className="text-xs font-medium text-text-muted uppercase mb-1">
                          Tuyên bố Giá trị & USP trích xuất từ HTML
                        </div>
                        <ul className="space-y-1 text-[12px] text-text-secondary">
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
