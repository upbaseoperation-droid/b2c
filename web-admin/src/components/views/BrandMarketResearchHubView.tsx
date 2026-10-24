'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  Globe,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  Swords,
  Target,
  UserPlus,
  Users,
} from 'lucide-react';
import { OperationalReportDrawer } from '../OperationalReportDrawer';
import type { BrandDetail, KocItem } from '../../lib/types';
import {
  PRICE_SEGMENT_LABEL,
  buildBrandResearchMarkdownReport,
  buildCompetitorMatrixCsv,
  generateBrandMarketResearchDossier,
  type BrandMarketResearchDossier,
  type BrandSkuPortfolioItem,
  type CompetitorMatrixItem,
  type KocTierAllocationItem,
  type LiveWebInspectionResult,
  type PlatformComplianceRuleItem,
  type ReviewMiningCluster,
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
  getEffectiveConfigForPurpose,
  loadApiWorkspaceConfig,
} from '../../lib/apiKeyConfig';
import {
  executeOperationalReport,
  type OperationalReportResult,
} from '../../lib/operationalReportService';
import { formatNumber, formatVnd, formatVndShort, getVietnamDateYmd } from '../../lib/format';
import { formatFollowers } from '../koc/kocUtils';
import {
  ActionMenu,
  Avatar,
  BrandAvatar,
  Button,
  ChannelBar,
  DataTable,
  Field,
  Input,
  PageActions,
  Panel,
  Stat,
  StatRow,
  Status,
  Tabs,
  Textarea,
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
    label: 'Tổng quan & SKU',
    shortPrompt:
      'Tổng hợp định vị thương hiệu, danh mục sản phẩm chính và việc cần làm cho đội Booking / Content.',
    systemDirective:
      'Tổng hợp ngắn gọn thông tin thương hiệu, vai trò từng sản phẩm (kéo khách, chủ lực, combo) và việc cần làm cho đội Booking và Content. Không dùng thuật ngữ tiếng Anh hay lời dẫn dài dòng.',
  },
  {
    id: 'COMPETITOR_DEEP_DIVE',
    label: 'So sánh đối thủ',
    shortPrompt:
      'So sánh giá bán, hoa hồng KOC, điểm khách phàn nàn ở đối thủ và gợi ý nội dung cạnh tranh.',
    systemDirective:
      'So sánh trực tiếp thương hiệu với từng đối thủ về đơn giá, tỷ lệ hoa hồng, điểm khách phàn nàn nhiều nhất ở đối thủ và gợi ý nội dung video KOC. Trình bày ngắn gọn, đi thẳng vào số liệu.',
  },
  {
    id: 'CONTENT_HOOKS_5',
    label: 'Gợi ý kịch bản',
    shortPrompt:
      'Lên các góc kịch bản video KOC (câu mở đầu, cảnh quay, thông tin chính, câu điều hướng mua) kèm danh sách từ cấm.',
    systemDirective:
      'Viết các góc kịch bản video ngắn gọn, tự nhiên gồm: câu mở đầu, cảnh quay thực tế, thông tin sản phẩm và câu điều hướng mua hàng, kèm các từ cấm dùng trên sàn.',
  },
  {
    id: 'KOC_BUDGET_ALLOCATION',
    label: 'Phân bổ KOC',
    shortPrompt:
      'Chia tỷ trọng ngân sách và số lượng video theo nhóm KL1–KL4 kết hợp gửi mẫu FOC 0đ.',
    systemDirective:
      'Lập phương án chia ngân sách và số lượng video theo từng nhóm KOC (KL1, KL2, KL3, KL4 và FOC 0đ) dựa trên khung giá thị trường và danh mục sản phẩm.',
  },
  {
    id: 'CUSTOMER_PAIN_FAQ',
    label: 'Bình luận & Câu hỏi',
    shortPrompt:
      'Tổng hợp vấn đề khách gặp phải, lý do phân vân và câu trả lời mẫu từ bình luận thực tế.',
    systemDirective:
      'Tổng hợp ngắn gọn vấn đề của khách, lý do khách còn phân vân trước khi mua và viết bộ câu trả lời ngắn gọn dùng cho video KOC và Livestream.',
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

function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  const segments = text.split(/(<br\s*\/?>)/gi);
  return segments.map((seg, sIdx) => {
    if (/^<br\s*\/?>$/i.test(seg)) {
      return <br key={`br-${sIdx}`} />;
    }
    const tokens = seg.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
    return (
      <React.Fragment key={`seg-${sIdx}`}>
        {tokens.map((tok, tIdx) => {
          if (tok.startsWith('**') && tok.endsWith('**') && tok.length > 4) {
            return (
              <strong key={tIdx} className="font-semibold text-ink">
                {tok.slice(2, -2)}
              </strong>
            );
          }
          if (tok.startsWith('`') && tok.endsWith('`') && tok.length > 2) {
            return (
              <code
                key={tIdx}
                className="px-1.5 py-0.5 rounded bg-sunken border border-line font-code text-2xs text-accent"
              >
                {tok.slice(1, -1)}
              </code>
            );
          }
          if (tok.startsWith('*') && tok.endsWith('*') && tok.length > 2) {
            return (
              <em key={tIdx} className="italic text-ink-2">
                {tok.slice(1, -1)}
              </em>
            );
          }
          return tok;
        })}
      </React.Fragment>
    );
  });
}

function renderProfessionalResearchReport(markdown: string): React.ReactNode {
  const lines = markdown.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Markdown Table block
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.length >= 2) {
        const parseRow = (rowStr: string) =>
          rowStr
            .slice(1, -1)
            .split('|')
            .map((c) => c.trim());
        const headers = parseRow(tableLines[0]);
        const isSeparator = (rowStr: string) => /^\|[\s:-]+\|/.test(rowStr) && !/[a-zA-Z0-9À-ỹ]/.test(rowStr);
        const bodyStartIdx = isSeparator(tableLines[1]) ? 2 : 1;
        const rows = tableLines.slice(bodyStartIdx).filter((r) => !isSeparator(r)).map(parseRow);

        blocks.push(
          <div key={`tbl-${i}`} className="my-2.5 overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-sunken border-b border-line text-ink">
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} className="py-2 px-3 font-semibold whitespace-nowrap">
                      {renderInlineMarkdown(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r, rIdx) => (
                  <tr key={rIdx} className="hover:bg-canvas/60 transition align-top">
                    {headers.map((_, cIdx) => (
                      <td key={cIdx} className="py-2 px-3 text-ink-2 leading-relaxed">
                        {renderInlineMarkdown(r[cIdx] || '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    if (/^[═─-]{4,}$/.test(trimmed)) {
      blocks.push(<hr key={`hr-${i}`} className="border-line my-2.5" />);
      i++;
      continue;
    }

    if (trimmed.startsWith('# ')) {
      blocks.push(
        <div key={`h1-${i}`} className="pb-2 border-b border-line">
          <h3 className="text-sm font-semibold text-ink">{renderInlineMarkdown(trimmed.slice(2))}</h3>
        </div>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      blocks.push(
        <h4
          key={`h2-${i}`}
          className="text-xs font-semibold uppercase tracking-wider text-accent pt-3 pb-1 border-b border-line/60"
        >
          {renderInlineMarkdown(trimmed.slice(3))}
        </h4>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      blocks.push(
        <h5 key={`h3-${i}`} className="text-xs font-semibold text-ink pt-2">
          {renderInlineMarkdown(trimmed.slice(4))}
        </h5>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('> ')) {
      blocks.push(
        <div
          key={`quote-${i}`}
          className="px-3 py-2 rounded-lg bg-accent-soft/40 border-l-2 border-accent text-xs text-ink"
        >
          {renderInlineMarkdown(trimmed.slice(2))}
        </div>
      );
      i++;
      continue;
    }

    if (/^[-•]\s+/.test(trimmed)) {
      blocks.push(
        <div key={`li-${i}`} className="flex items-start gap-2 text-xs text-ink-2 pl-1 leading-relaxed">
          <span className="text-accent font-semibold select-none mt-0.5">•</span>
          <div className="flex-1">{renderInlineMarkdown(trimmed.replace(/^[-•]\s+/, ''))}</div>
        </div>
      );
      i++;
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const numMatch = trimmed.match(/^(\d+\.)\s+(.*)$/);
      blocks.push(
        <div key={`oli-${i}`} className="flex items-start gap-2 text-xs text-ink-2 pl-1 leading-relaxed">
          <span className="font-semibold text-ink select-none">{numMatch?.[1]}</span>
          <div className="flex-1">{renderInlineMarkdown(numMatch?.[2] || trimmed)}</div>
        </div>
      );
      i++;
      continue;
    }

    blocks.push(
      <div key={`p-${i}`} className="text-xs text-ink-2 leading-relaxed">
        {renderInlineMarkdown(trimmed)}
      </div>
    );
    i++;
  }

  return <div className="space-y-2">{blocks}</div>;
}

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
  const webIntel = dossier.liveAutoWebIntel;
  const webSearchLines: string[] = [];

  if (webIntel?.officialWebsiteUrl) {
    webSearchLines.push(
      `• Website chính thức: ${webIntel.officialWebsiteUrl} (${webIntel.metaTitle || dossier.brandName})`
    );
  }
  if (webIntel?.priceRangeVnd) {
    webSearchLines.push(
      `• Khoảng giá cào thực tế trên Web/Sàn: ${webIntel.priceRangeVnd.formattedRange}`
    );
  }
  if (webIntel?.scrapedProducts?.length) {
    webSearchLines.push(
      `• Sản phẩm đang mở bán trên Web/Sàn (${webIntel.scrapedProducts.length} SKU): ${webIntel.scrapedProducts
        .slice(0, 6)
        .map(
          (p) =>
            `${p.productName} (${formatVnd(p.priceVnd)} - ${p.sourceDomain})`
        )
        .join(' | ')}`
    );
  }
  if (webIntel?.searchSnippets?.length) {
    for (const sn of webIntel.searchSnippets.slice(0, 8)) {
      webSearchLines.push(
        `• [${sn.domain}] ${sn.title}: ${sn.snippet}${
          sn.extractedPricesVnd?.[0] ? ` (Giá: ${formatVnd(sn.extractedPricesVnd[0])})` : ''
        } (${sn.url})`
      );
    }
  }

  const lines: string[] = [
    `[DỮ LIỆU PHÂN HỆ: Nghiên cứu Thị trường, Phân tích 4P & Đối thủ — ${dossier.brandName}]`,
    `[CHUYÊN ĐỀ NGHIÊN CỨU: ${options.playbookMode}]`,
    ...(options.focusCompetitorName
      ? [`[ĐỐI THỦ TRỌNG TÂM: ${options.focusCompetitorName}]`]
      : []),
    ...(options.customQuestion?.trim()
      ? [`[YÊU CẦU NGHIÊN CỨU CỤ THỂ]: ${options.customQuestion.trim()}`]
      : []),
    ...(webSearchLines.length > 0
      ? [
          `[KẾT QUẢ TÌM KIẾM TRÊN MẠNG TRƯỚC KHI PHÂN TÍCH]:`,
          ...webSearchLines,
        ]
      : []),
    `- Thương hiệu: ${dossier.brandName} | Ngành hàng: ${dossier.category} | Xuất xứ: ${dossier.originCountry}`,
    `- Tóm tắt: ${dossier.executiveSummary}`,
    `- Khách hàng mục tiêu: ${dossier.positioning.targetAudience}`,
    `- Giọng điệu thương hiệu: ${dossier.positioning.toneOfVoice}`,
    `- Khoảng giá: ${dossier.fourP.priceRangeText} | Giá trị đơn TB: ${formatVnd(dossier.marketLandscape.avgOrderValueVnd)} | Mua lặp lại: ${dossier.marketLandscape.repeatPurchaseRatePct}% (${dossier.marketLandscape.replenishmentCycleDays} ngày)`,
    `- Tỷ trọng kênh bán: TikTok Shop ${dossier.fourP.channelMixRatio.tiktokShopPct}% · Shopee Mall ${dossier.fourP.channelMixRatio.shopeeMallPct}% · Kênh khác ${dossier.fourP.channelMixRatio.otherChannelsPct}%`,
    `- Vấn đề khách hàng gặp phải: ${(dossier.positioning.painPoints || []).join(' | ')}`,
    `- Lý do phân vân trước khi mua: ${(dossier.positioning.barriersToTrial || []).join(' | ')}`,
    `- Điểm thuyết phục: ${(dossier.positioning.rtbs || []).join(' | ')}`,
    `- Danh mục sản phẩm (${dossier.skuPortfolio.length} SKU):`,
    ...dossier.skuPortfolio.slice(0, 6).map(
      (s) =>
        `  + [${s.roleLabel}] ${s.productName} (${s.packSize}): Giá bán ${formatVnd(s.dealPriceVnd)} (Niêm yết ${formatVnd(s.listPriceVnd)}, -${s.discountPct}%) · HH KOC ${s.affiliateCommissionPct}% · GMV ${s.estimatedGmvSharePct}% · Thành phần/Đặc điểm: ${s.coreIngredientsOrSpecs}`
    ),
    `- Đối thủ cùng phân khúc (${dossier.competitors.length} đối thủ):`,
    ...dossier.competitors.map(
      (c) =>
        `  + Đối thủ ${c.competitorName} (${c.tiktokHandle} · ${c.originCountry}): Sản phẩm "${c.heroSkuName}" giá ${formatVnd(c.dealPriceVnd)} (Niêm yết ${formatVnd(c.listPriceVnd)}) · HH ${c.affiliateCommissionPct}% · Điểm mạnh: ${c.keyUsps[0] || ''} · Điểm khách phàn nàn: ${c.customerComplaints[0] || ''} · Hướng cạnh tranh: ${c.upbaseCounterPlay}`
    ),
    `- Kịch bản mẫu:`,
    ...dossier.contentAngleBlueprints.map(
      (a) =>
        `  + ${a.pillarName} (${a.bestKocTier}): Mở đầu "${a.hook3s}" | Cảnh quay: ${a.visualProof} | Nội dung: ${a.keyMessageRtb}`
    ),
    `- Nhóm bình luận & câu hỏi khách hàng (${clusters.length} nhóm):`,
    ...clusters.slice(0, 4).map(
      (c) =>
        `  + [${c.categoryLabel} - ${c.sharePct}%] ${c.topicTitle}: "${c.sampleQuotes[0] || ''}" -> Gợi ý trả lời: ${c.suggestedFaqAnswer}`
    ),
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
  const [analyzingDossier, setAnalyzingDossier] = useState<boolean>(false);
  const [savingToProfile, setSavingToProfile] = useState<boolean>(false);
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

  // --- State Bàn Nghiên cứu Chuyên sâu bằng Mô hình ---
  const [apiConfigVersion, setApiConfigVersion] = useState<number>(0);
  const effectiveApiRoute = useMemo(() => {
    void apiConfigVersion;
    const cfg = loadApiWorkspaceConfig();
    return getEffectiveConfigForPurpose('BRAND_MARKET_RESEARCH', cfg);
  }, [apiConfigVersion]);

  const selectedProvider = effectiveApiRoute.primaryProvider;
  const selectedModel = effectiveApiRoute.primaryModel;
  const [activePlaybook, setActivePlaybook] =
    useState<ResearchPlaybookMode>('COMPREHENSIVE');
  const [focusCompetitorForModel, setFocusCompetitorForModel] = useState<string>('');
  const [customResearchPrompt, setCustomResearchPrompt] = useState<string>('');
  const [searchingWebBeforeModel, setSearchingWebBeforeModel] = useState<boolean>(false);
  const [runningModelResearch, setRunningModelResearch] = useState<boolean>(false);
  const [modelResearchResult, setModelResearchResult] =
    useState<OperationalReportResult | null>(null);
  const [copiedModelOutput, setCopiedModelOutput] = useState<boolean>(false);

  useEffect(() => {
    const onCfgUpdated = () => {
      setApiConfigVersion((v) => v + 1);
    };
    window.addEventListener(API_CONFIG_UPDATED_EVENT, onCfgUpdated);
    return () => window.removeEventListener(API_CONFIG_UPDATED_EVENT, onCfgUpdated);
  }, []);

  // --- State Quét KOC của Đối thủ ngay trong Tab 2 ---
  const [scanningCompetitorHandle, setScanningCompetitorHandle] = useState<string | null>(
    null
  );
  const [dissectingKocHandle, setDissectingKocHandle] = useState<string | null>(null);
  const [scannedCompProfile, setScannedCompProfile] =
    useState<TikTokCompetitorProfileSummary | null>(null);
  const [scannedCompKocs, setScannedCompKocs] = useState<TikTokCompetitorKocResult[]>([]);

  // --- State Đào Bình luận & Đánh giá Khách hàng (Tab 3) ---
  const [reviewVideoUrl, setReviewVideoUrl] = useState<string>('');
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
  const reportPanelRef = useRef<HTMLDivElement>(null);

  // Tìm kiếm thông tin trên mạng TRƯỚC khi đưa vào câu lệnh mô hình
  const handleRunModelResearch = useCallback(
    async (options?: {
      targetDossier?: BrandMarketResearchDossier;
      playbook?: ResearchPlaybookMode;
      focusCompetitor?: string;
      questionOverride?: string;
      skipPreSearch?: boolean;
      scrollToReport?: boolean;
    }) => {
      if (options?.scrollToReport) {
        reportPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      let d = options?.targetDossier ?? dossier;
      const mode = options?.playbook ?? activePlaybook;
      const focusComp = options?.focusCompetitor ?? focusCompetitorForModel;
      const question = options?.questionOverride ?? customResearchPrompt;

      if (options?.playbook) setActivePlaybook(options.playbook);
      if (options?.focusCompetitor !== undefined) {
        setFocusCompetitorForModel(options.focusCompetitor);
      }

      const playbookDef =
        RESEARCH_PLAYBOOKS.find((p) => p.id === mode) || RESEARCH_PLAYBOOKS[0];

      setRunningModelResearch(true);
      try {
        // Bước 1: Tìm kiếm thông tin từ trên mạng trước khi tạo Prompt (nếu chưa có dữ liệu web hoặc có yêu cầu tìm kiếm mới)
        const shouldSearchWebFirst =
          !options?.skipPreSearch &&
          (!d.liveAutoWebIntel || Boolean(question.trim()) || Boolean(focusComp));

        if (shouldSearchWebFirst) {
          setSearchingWebBeforeModel(true);
          try {
            const searchRes = await fetch('/api/integrations/market-research/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                mode: 'BRAND_DOSSIER',
                brandName: d.brandName,
                category: customCategory.trim() || undefined,
                competitors: focusComp
                  ? Array.from(
                      new Set([
                        focusComp,
                        ...d.competitors.map((c) => c.competitorName),
                      ])
                    )
                  : d.competitors.map((c) => c.competitorName),
                searchQuery: question.trim() || undefined,
              }),
            });
            const searchJson = await searchRes.json();
            if (searchRes.ok && searchJson.success && searchJson.dossier) {
              d = searchJson.dossier;
              setDossier(d);
              setMinedClusters(d.reviewClusters || []);
              if (d.liveWebInspection) {
                setWebInspection(d.liveWebInspection);
              }
            }
          } catch {
            // Tiếp tục tổng hợp nếu kết nối tìm kiếm bị gián đoạn
          } finally {
            setSearchingWebBeforeModel(false);
          }
        }

        // Bước 2: Đưa toàn bộ kết quả tìm kiếm từ trên mạng vào câu lệnh (Prompt Context)
        const contextText = serializeDossierForModelContext(d, {
          playbookMode: mode,
          focusCompetitorName: focusComp || undefined,
          customQuestion: question.trim() || undefined,
          minedClusters: d.reviewClusters || minedClusters,
        });

        const systemDirective = [
          effectiveApiRoute.purpose.systemInstruction,
          playbookDef.systemDirective,
          'Ưu tiên sử dụng số liệu từ mục [KẾT QUẢ TÌM KIẾM TRÊN MẠNG TRƯỚC KHI PHÂN TÍCH] (website, sản phẩm mở bán, giá bán thực tế và kết quả tìm kiếm trên mạng) để phân tích.',
          focusComp
            ? `Tập trung phân tích so sánh đối đầu trực tiếp giữa ${d.brandName} và đối thủ ${focusComp}.`
            : '',
          question.trim() ? `Yêu cầu trọng tâm của người dùng: ${question.trim()}` : '',
        ]
          .filter(Boolean)
          .join('\n\n');

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
        setSearchingWebBeforeModel(false);
        setRunningModelResearch(false);
      }
    },
    [
      activePlaybook,
      customCategory,
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
      setModelResearchResult(null);
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

  // Chạy phân tích tổng thể Brand & Đối thủ (Tìm kiếm trên mạng + Tổng hợp bằng Mô hình)
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
            searchQuery: customResearchPrompt.trim() || undefined,
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

        // Chạy luôn mô hình phân tích với dữ liệu vừa tìm kiếm từ trên mạng
        await handleRunModelResearch({
          targetDossier: nextDossier,
          playbook: activePlaybook,
          focusCompetitor: '',
          skipPreSearch: true,
        });

        onNotify?.(
          `Đã tìm kiếm dữ liệu trên mạng & cập nhật nghiên cứu cho ${nextDossier.brandName}`,
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
      customResearchPrompt,
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

  // Mổ xẻ kịch bản từ video thắng của KOC đối thủ (Tab 2)
  const handleDissectCompetitorKocVideo = useCallback(
    async (item: TikTokCompetitorKocResult) => {
      const compName =
        item.competitorCollaboration.competitorBrandName ||
        scannedCompProfile?.brandName ||
        'Đối thủ';
      const productPromoted =
        item.competitorCollaboration.competitorProductPromoted || compName;
      const videoUrl = item.competitorCollaboration.latestCollabVideoUrl || '';

      setDissectingKocHandle(item.handle);
      try {
        let scrapedComments: string[] = [];
        let extraSnippetsText = '';
        let clustersFromVideo: ReviewMiningCluster[] = [];

        try {
          const res = await fetch('/api/integrations/market-research/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mode: 'DISSECT_COMPETITOR_VIDEO',
              brandName: dossier.brandName,
              competitorName: compName,
              kocHandle: item.handle,
              productPromoted,
              videoUrl,
            }),
          });
          const json = await res.json();
          if (res.ok && json.success) {
            if (Array.isArray(json.scrapedComments)) {
              scrapedComments = json.scrapedComments;
            }
            if (Array.isArray(json.clusters) && json.clusters.length > 0) {
              clustersFromVideo = json.clusters;
            }
            if (Array.isArray(json.searchSnippets) && json.searchSnippets.length > 0) {
              extraSnippetsText = json.searchSnippets
                .slice(0, 3)
                .map((s: { title?: string; snippet?: string }) => `${s.title || ''}: ${s.snippet || ''}`)
                .join(' | ');
            }
          }
        } catch {
          // Tiếp tục chạy phân tích kịch bản từ thông số video KOC
        }

        const updatedDossier: BrandMarketResearchDossier =
          clustersFromVideo.length > 0
            ? { ...dossier, reviewClusters: clustersFromVideo }
            : dossier;
        if (clustersFromVideo.length > 0) {
          setMinedClusters(clustersFromVideo);
          setDossier(updatedDossier);
        }

        const sampleCommentsSummary =
          scrapedComments.length > 0
            ? `Bình luận dưới video (${scrapedComments.length} bình luận): "${scrapedComments.slice(0, 6).join('"; "')}".`
            : '';

        const dissectQuestion = [
          `Xem kịch bản video của KOC @${item.handle} (${item.channelProfile.nickname}, ${formatFollowers(item.channelProfile.followers)} flw, ER ${item.engagementMetrics.engagementRate}%, ${formatNumber(item.competitorCollaboration.latestCollabViews)} lượt xem) giới thiệu sản phẩm "${productPromoted}" của ${compName}.`,
          sampleCommentsSummary,
          extraSnippetsText ? `Thông tin sản phẩm đối thủ: ${extraSnippetsText}.` : '',
          `Yêu cầu: (1) Nêu câu mở đầu, cảnh quay và nội dung chính của video đối thủ; (2) Tóm tắt điểm khách hỏi hoặc phàn nàn dưới bình luận; (3) Viết kịch bản tương ứng cho ${dossier.brandName} dành cho nhóm KOC ${item.affiliateMetrics.suggestedClassification.tierLabel}.`,
        ]
          .filter(Boolean)
          .join(' ');

        setCustomResearchPrompt(dissectQuestion);
        await handleRunModelResearch({
          targetDossier: updatedDossier,
          playbook: 'CONTENT_HOOKS_5',
          focusCompetitor: compName,
          questionOverride: dissectQuestion,
          skipPreSearch: true,
          scrollToReport: true,
        });

        onNotify?.(
          `Đã phân tích video của KOC @${item.handle} (${compName})`,
          'success'
        );
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Không thể phân tích video.';
        onNotify?.(msg, 'error');
      } finally {
        setDissectingKocHandle(null);
      }
    },
    [dossier, handleRunModelResearch, onNotify, scannedCompProfile?.brandName]
  );

  // Lọc bình luận khách hàng & tự động tổng hợp câu trả lời mẫu
  const handleRunReviewMining = async () => {
    if (!reviewVideoUrl.trim() && !rawReviewText.trim()) {
      onNotify?.(
        'Vui lòng nhập link video TikTok hoặc dán danh sách bình luận khách hàng.',
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
        throw new Error(json.message || 'Không lọc được dữ liệu bình luận.');
      }
      const nextClusters: ReviewMiningCluster[] = Array.isArray(json.clusters)
        ? json.clusters
        : [];
      setMinedClusters(nextClusters);
      setMinedStats({
        totalLines: json.totalAnalyzedLines || 0,
        scrapedFromTikTok: json.scrapedCommentsCount || 0,
      });

      const updatedDossier: BrandMarketResearchDossier = {
        ...dossier,
        reviewClusters: nextClusters,
      };
      setDossier(updatedDossier);

      onNotify?.(
        `Đã lọc ${json.totalAnalyzedLines || 0} bình luận (${json.scrapedCommentsCount || 0} bình luận từ TikTok)`,
        'success'
      );

      void handleRunModelResearch({
        targetDossier: updatedDossier,
        playbook: 'CUSTOMER_PAIN_FAQ',
        questionOverride: `Từ ${json.totalAnalyzedLines || 0} bình luận của khách hàng vừa lọc cho ${dossier.brandName}, hãy tổng hợp câu trả lời mẫu cho Livestream/KOC và 5 câu mở đầu video trả lời các câu hỏi phổ biến nhất.`,
        skipPreSearch: true,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi lọc bình luận.';
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
      onNotify?.(`Đã lấy thông tin trang ${json.inspection.domain}`, 'success');
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
    link.download = `doi-thu-${dossier.brandKey}-${getVietnamDateYmd()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onNotify?.('Đã xuất file CSV danh sách đối thủ', 'success');
  };

  const handleDownloadMarkdownDossier = () => {
    const baseMd = buildBrandResearchMarkdownReport(dossier);
    const fullMd = modelResearchResult?.outputText
      ? `${baseMd}\n\n---\n\n## TỔNG HỢP NGHIÊN CỨU (${modelResearchResult.providerUsedLabel} · ${modelResearchResult.modelUsed})\n\n${modelResearchResult.outputText}`
      : baseMd;
    const blob = new Blob([fullMd], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ho-so-nghien-cuu-brand-${dossier.brandKey}-${getVietnamDateYmd()}.md`;
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

  // Trích xuất nhận định từ Báo cáo phân tích & dữ liệu mạng để cập nhật xuống các bảng Tab 1 & Tab 2
  const handleApplyModelInsightsToTables = useCallback(() => {
    const rawReport = modelResearchResult?.outputText || '';
    if (!rawReport.trim()) {
      onNotify?.('Chưa có kết quả tổng hợp để cập nhật vào bảng dữ liệu.', 'warning');
      return;
    }

    const lines = rawReport
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const extractedHooks: string[] = [];
    const extractedRtbs: string[] = [];
    const extractedPains: string[] = [];

    for (const line of lines) {
      const cleanBullet = line
        .replace(/^[-*+•]\s*/, '')
        .replace(/^\d+[.)]\s*/, '')
        .replace(/\*\*/g, '')
        .trim();

      if (/^(Mở đầu|Hook\s*3s|Câu mở đầu)/i.test(cleanBullet)) {
        const hookVal = cleanBullet
          .replace(/^(Mở đầu|Hook\s*3s|Câu mở đầu)[^:]*:\s*/i, '')
          .replace(/^["“]|["”]$/g, '')
          .trim();
        if (hookVal.length >= 15) extractedHooks.push(hookVal);
      } else if (
        /(thành phần|công nghệ|kiểm nghiệm|chứng nhận|ưu điểm|lợi thế)/i.test(
          cleanBullet
        ) &&
        cleanBullet.length >= 25 &&
        cleanBullet.length <= 200 &&
        !cleanBullet.startsWith('|')
      ) {
        extractedRtbs.push(cleanBullet);
      } else if (
        /(phàn nàn|rào cản|ngại|lo lắng|băn khoăn|kích ứng|nhờn rít)/i.test(
          cleanBullet
        ) &&
        cleanBullet.length >= 25 &&
        cleanBullet.length <= 200 &&
        !cleanBullet.startsWith('|')
      ) {
        extractedPains.push(cleanBullet);
      }
    }

    setDossier((prev) => {
      const nextRtbs = Array.from(
        new Set([
          ...(prev.liveAutoWebIntel?.extractedUsps || []),
          ...extractedRtbs,
          ...(prev.positioning.rtbs || []),
        ])
      ).slice(0, 6);

      const nextPains = Array.from(
        new Set([...extractedPains, ...(prev.positioning.painPoints || [])])
      ).slice(0, 5);

      const nextBlueprints = prev.contentAngleBlueprints.map((bp, idx) => {
        const candidateHook = extractedHooks[idx];
        return candidateHook
          ? {
              ...bp,
              hook3s: candidateHook,
            }
          : bp;
      });

      const nextCompetitors = prev.competitors.map((comp) => {
        const compRegex = new RegExp(
          comp.competitorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          'i'
        );
        const matchingBullet = lines.find(
          (l) =>
            compRegex.test(l) &&
            !l.startsWith('|') &&
            !l.startsWith('#') &&
            l.length >= 35 &&
            l.length <= 220
        );
        if (!matchingBullet) return comp;
        const cleaned = matchingBullet
          .replace(/^[-*+•]\s*/, '')
          .replace(/\*\*/g, '')
          .trim();
        return {
          ...comp,
          upbaseCounterPlay: cleaned,
        };
      });

      return {
        ...prev,
        positioning: {
          ...prev.positioning,
          rtbs: nextRtbs.length > 0 ? nextRtbs : prev.positioning.rtbs,
          painPoints: nextPains.length > 0 ? nextPains : prev.positioning.painPoints,
        },
        contentAngleBlueprints: nextBlueprints,
        competitors: nextCompetitors,
      };
    });

    onNotify?.(
      `Đã đồng bộ nhận định từ báo cáo xuống bảng Định vị, Đối thủ và Kịch bản mẫu của ${dossier.brandName}`,
      'success'
    );
  }, [dossier.brandName, modelResearchResult?.outputText, onNotify]);

  // --- Cột bảng Danh mục Sản phẩm ---
  const skuColumns = useMemo<Column<BrandSkuPortfolioItem>[]>(
    () => [
      {
        key: 'product',
        header: 'Sản phẩm',
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
        header: 'Phân nhóm',
        width: 120,
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
        header: 'Thành phần & Nhu cầu',
        width: 290,
        render: (row) => (
          <div className="space-y-0.5">
            <div className="text-xs text-ink line-clamp-2">
              {row.coreIngredientsOrSpecs}
            </div>
            <div className="text-2xs text-ink-3 line-clamp-1">
              Khách hàng: {row.targetNeed}
            </div>
          </div>
        ),
      },
      {
        key: 'pricing',
        header: 'Giá bán',
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
        header: 'Hoa hồng & Tỷ trọng',
        align: 'right',
        width: 170,
        render: (row) => (
          <div className="text-right tabular-nums">
            <div className="font-semibold text-positive">
              Hoa hồng: {row.affiliateCommissionPct}% · Doanh số {row.estimatedGmvSharePct}%
            </div>
            <div className="text-2xs text-ink-3">{row.monthlySalesEstimate}</div>
          </div>
        ),
      },
    ],
    []
  );

  // --- Cột bảng Phân bổ KOC (KL1 - KL4) ---
  const kocTierColumns = useMemo<Column<KocTierAllocationItem>[]>(
    () => [
      {
        key: 'tier',
        header: 'Nhóm KOC',
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
        header: 'Mục đích & Định dạng',
        width: 280,
        render: (row) => (
          <div>
            <div className="text-xs text-ink">{row.funnelRole}</div>
            <div className="text-2xs text-ink-3 mt-0.5">
              {row.primaryFormats.join(' · ')}
            </div>
          </div>
        ),
      },
      {
        key: 'weights',
        header: 'Tỷ trọng NS / Video',
        align: 'right',
        width: 150,
        render: (row) => (
          <div className="text-right tabular-nums">
            <div className="font-semibold text-ink">
              Ngân sách: {row.budgetWeightPct}%
            </div>
            <div className="text-2xs text-ink-3">
              Số video: {row.videoVolumeWeightPct}%
            </div>
          </div>
        ),
      },
      {
        key: 'cost',
        header: 'Khung giá thị trường',
        width: 210,
        render: (row) => (
          <div className="text-xs font-medium text-ink">
            {row.avgBookingCostRangeVnd}
          </div>
        ),
      },
      {
        key: 'kpi',
        header: 'Chỉ tiêu tham chiếu',
        align: 'right',
        width: 175,
        render: (row) => (
          <div className="text-right tabular-nums">
            <div className="font-medium text-ink">
              ROAS {row.targetRoas} · CTR {row.targetCtrPct}
            </div>
            <div className="text-2xs text-ink-3">
              Giữ chân 2s: {row.targetHookRate2sPct} · CVR {row.targetCvrPct}
            </div>
          </div>
        ),
      },
    ],
    []
  );

  // --- Cột bảng Kịch bản mẫu ---
  const contentAngleColumns = useMemo<Column<WinningContentAngleBlueprint>[]>(
    () => [
      {
        key: 'pillar',
        header: 'Chủ đề & Nhóm KOC',
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
        header: 'Câu mở đầu',
        width: 250,
        render: (row) => (
          <div className="text-xs font-medium text-accent leading-relaxed">
            &ldquo;{row.hook3s}&rdquo;
          </div>
        ),
      },
      {
        key: 'proof_rtb',
        header: 'Cảnh quay & Nội dung chính',
        width: 310,
        render: (row) => (
          <div className="space-y-0.5">
            <div className="text-xs text-ink">Cảnh quay: {row.visualProof}</div>
            <div className="text-2xs text-ink-3">Nội dung: {row.keyMessageRtb}</div>
          </div>
        ),
      },
      {
        key: 'cta',
        header: 'Điều hướng mua hàng',
        width: 190,
        render: (row) => (
          <div className="text-xs font-medium text-positive">{row.recommendedCta}</div>
        ),
      },
    ],
    []
  );

  // --- Cột bảng Từ ngữ cấm trên sàn ---
  const complianceColumns = useMemo<Column<PlatformComplianceRuleItem>[]>(
    () => [
      {
        key: 'risk',
        header: 'Nhóm nội dung',
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
        header: 'Từ cấm dùng',
        width: 240,
        render: (row) => (
          <div>
            <div className="font-code text-xs text-critical">
              {row.forbiddenPhrases.map((p) => `"${p}"`).join(', ')}
            </div>
            <div className="text-2xs text-ink-3 mt-0.5">
              Rủi ro: {row.platformPenaltyRisk}
            </div>
          </div>
        ),
      },
      {
        key: 'safe',
        header: 'Cách nói thay thế',
        render: (row) => (
          <span className="text-xs text-positive font-medium">
            {row.safeAlternativePhrasing}
          </span>
        ),
      },
    ],
    []
  );

  // --- Cột bảng Đối thủ ---
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
        header: 'Sản phẩm chính & Giá bán',
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
        header: 'Hoa hồng & Kênh',
        width: 145,
        render: (row) => (
          <div className="space-y-1">
            <div className="font-semibold text-positive text-xs tabular-nums">
              Hoa hồng: {row.affiliateCommissionPct}%
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
        header: 'Điểm mạnh & Khách phàn nàn',
        width: 265,
        render: (row) => (
          <div className="space-y-1">
            <div className="text-xs text-ink line-clamp-2">
              <strong className="text-positive font-medium">+ Mạnh: </strong>
              {row.keyUsps[0]}
            </div>
            <div className="text-2xs text-ink-2 line-clamp-2">
              <strong className="text-critical font-medium">− Phàn nàn: </strong>
              {row.customerComplaints[0]}
            </div>
          </div>
        ),
      },
      {
        key: 'counterPlay',
        header: 'Hướng cạnh tranh',
        width: 240,
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
        width: 230,
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
                    questionOverride: `So sánh ${dossier.brandName} và ${row.competitorName} (${row.heroSkuName}). Nêu cách xử lý điểm khách phàn nàn "${row.customerComplaints[0]}" trên video KOC.`,
                    scrollToReport: true,
                  });
                }}
              >
                So sánh
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
                Xem
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
        header: 'Thao tác',
        align: 'right',
        width: 245,
        render: (item) => {
          const clean = item.handle.toLowerCase().replace(/^@+/, '');
          const alreadySaved = existingByHandle.has(clean);
          const isDissecting = dissectingKocHandle === item.handle;
          return (
            <div className="flex items-center justify-end gap-1.5 flex-wrap">
              <Button
                size="sm"
                variant="secondary"
                disabled={isDissecting || runningModelResearch}
                icon={FileText}
                onClick={() => void handleDissectCompetitorKocVideo(item)}
              >
                {isDissecting ? 'Đang xem...' : 'Xem kịch bản'}
              </Button>
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
        },
      },
    ],
    [
      dissectingKocHandle,
      existingByHandle,
      handleDissectCompetitorKocVideo,
      handleSaveOneCompetitorKoc,
      runningModelResearch,
    ]
  );

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

  const webSearchSnippets = dossier.liveAutoWebIntel?.searchSnippets || [];
  const webScrapedProducts = dossier.liveAutoWebIntel?.scrapedProducts || [];

  return (
    <div className="space-y-5">
      <PageActions>
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

      {/* ===================================================================== */}
      {/* 1. THANH ĐIỀU KHIỂN THƯƠNG HIỆU / ĐỐI THỦ                              */}
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
                <Status tone="info">{dossier.originCountry}</Status>
                <span className="text-xs text-ink-3">{dossier.category}</span>
                {dossier.liveAutoWebIntel?.officialWebsiteUrl && (
                  <a
                    href={dossier.liveAutoWebIntel.officialWebsiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-2xs font-code text-accent hover:underline"
                  >
                    {dossier.liveAutoWebIntel.officialWebsiteDomain}{' '}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
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
              {analyzingDossier ? 'Đang tìm trên mạng…' : 'Nghiên cứu'}
            </Button>
          </div>
        </div>

        {showAdvancedResearch && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-line">
            <Field label="Ngành hàng">
              <Input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder={dossier.category}
              />
            </Field>
            <Field label="Đối thủ cần so sánh (cách nhau bằng dấu phẩy)">
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
      {/* 2. HÀNG CHỈ SỐ CỐT LÕI                                                */}
      {/* ===================================================================== */}
      <StatRow size="sm">
        <Stat
          label="Khoảng giá & Giá trị đơn"
          value={dossier.fourP.priceRangeText}
          note={`Đơn TB ${formatVndShort(dossier.marketLandscape.avgOrderValueVnd)} · Mua lại ${dossier.marketLandscape.repeatPurchaseRatePct}% (${dossier.marketLandscape.replenishmentCycleDays} ngày)`}
        />
        <Stat
          label="Sản phẩm chính & Hoa hồng"
          value={competitorBenchmarkSummary.brandHeroName}
          note={`Giá bán: ${formatVnd(competitorBenchmarkSummary.brandHeroPrice)} · Hoa hồng: ${dossier.fourP.affiliateCommissionRange}`}
        />
        <Stat
          label="Đối thủ cùng phân khúc"
          value={`${dossier.competitors.length} đối thủ`}
          note={`Giá TB: ${formatVnd(competitorBenchmarkSummary.avgCompPrice)} · Hoa hồng TB: ${competitorBenchmarkSummary.avgCompCommission}%`}
        />
        <Stat
          label="Dữ liệu tìm thấy trên mạng"
          value={
            webSearchSnippets.length > 0 || webScrapedProducts.length > 0
              ? `${webScrapedProducts.length} SP · ${webSearchSnippets.length} nguồn web`
              : `${dossier.skuPortfolio.length} SP · ${dossier.evidenceLedger.length} nguồn`
          }
          note={
            dossier.liveAutoWebIntel?.officialWebsiteDomain
              ? `Web hãng: ${dossier.liveAutoWebIntel.officialWebsiteDomain} · Sàn TMĐT & TikTok`
              : 'Tổng hợp từ Website hãng, Sàn TMĐT & TikTok'
          }
        />
      </StatRow>

      {/* ===================================================================== */}
      {/* 3. TỔNG HỢP NGHIÊN CỨU                                                */}
      {/* ===================================================================== */}
      <div ref={reportPanelRef}>
      <Panel
        title={`Tổng hợp nghiên cứu: ${dossier.brandName}${
          focusCompetitorForModel ? ` và ${focusCompetitorForModel}` : ''
        }`}
      >
        <div className="space-y-4">
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
                <option value="">Tất cả đối thủ ({dossier.competitors.length})</option>
                {dossier.competitors.map((c) => (
                  <option key={c.id} value={c.competitorName}>
                    {dossier.brandName} vs. {c.competitorName}
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
                placeholder={`Nhập yêu cầu cụ thể cho ${dossier.brandName} (hệ thống sẽ tìm kiếm trên mạng trước khi tổng hợp)...`}
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
                {searchingWebBeforeModel
                  ? 'Đang tìm web...'
                  : runningModelResearch
                    ? 'Đang tổng hợp...'
                    : 'Tìm & Tổng hợp'}
              </Button>
            </div>
          </div>

          {/* Hiển thị dữ liệu đã tìm kiếm từ trên mạng trước khi đưa vào câu lệnh */}
          {(webSearchSnippets.length > 0 || webScrapedProducts.length > 0 || dossier.liveAutoWebIntel?.officialWebsiteUrl) && (
            <div className="rounded-lg border border-line bg-surface px-3.5 py-2.5 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-2xs">
                <span className="font-semibold text-ink flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-accent" />
                  Dữ liệu tìm kiếm từ trên mạng đưa vào câu lệnh ({webScrapedProducts.length} sản phẩm · {webSearchSnippets.length} kết quả web)
                </span>
                {dossier.liveAutoWebIntel?.officialWebsiteUrl && (
                  <a
                    href={dossier.liveAutoWebIntel.officialWebsiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-code text-accent hover:underline inline-flex items-center gap-1"
                  >
                    {dossier.liveAutoWebIntel.officialWebsiteUrl}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {webSearchSnippets.slice(0, 4).map((sn, idx) => (
                  <a
                    key={idx}
                    href={sn.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-1 rounded bg-canvas border border-line text-2xs text-ink-2 hover:text-accent hover:border-line-strong transition truncate max-w-xs"
                    title={`${sn.title} — ${sn.snippet}`}
                  >
                    <strong className="text-ink">[{sn.domain}]</strong> {sn.title}
                  </a>
                ))}
                {webScrapedProducts.slice(0, 3).map((prod, idx) => (
                  <span
                    key={`p-${idx}`}
                    className="px-2 py-1 rounded bg-canvas border border-line text-2xs text-ink-2 truncate max-w-xs"
                  >
                    {prod.productName}: <strong className="text-accent">{formatVnd(prod.priceVnd)}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

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
                    {modelResearchResult.latencyMs}ms
                    {modelResearchResult.usage
                      ? ` · ${formatNumber(modelResearchResult.usage.totalTokens)} tokens`
                      : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!modelResearchResult?.outputText}
                  icon={Check}
                  onClick={handleApplyModelInsightsToTables}
                >
                  Cập nhật vào các bảng
                </Button>
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

            <div className="p-4 max-h-[540px] overflow-y-auto">
              {runningModelResearch ? (
                <div className="py-8 flex items-center justify-center gap-2.5 text-xs text-ink-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-accent" />
                  <span>
                    {searchingWebBeforeModel ? (
                      <>
                        Đang tìm kiếm thông tin trên mạng (Website, Sàn TMĐT, TikTok) cho{' '}
                        <strong>{dossier.brandName}</strong> trước khi đưa vào câu lệnh...
                      </>
                    ) : (
                      <>
                        Đang tổng hợp dữ liệu đã tìm kiếm của{' '}
                        <strong>{dossier.brandName}</strong>...
                      </>
                    )}
                  </span>
                </div>
              ) : modelResearchResult?.outputText ? (
                renderProfessionalResearchReport(modelResearchResult.outputText)
              ) : (
                <div className="text-xs text-ink-3 py-4">
                  Chọn mục phía trên hoặc bấm &ldquo;Tìm & Tổng hợp&rdquo; để xem kết quả.
                </div>
              )}
            </div>
          </div>
        </div>
      </Panel>
      </div>

      {/* ===================================================================== */}
      {/* 4. BA TAB NGHIÊN CỨU                                                  */}
      {/* ===================================================================== */}
      <Tabs<ResearchTabKey>
        value={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'BRAND_STRATEGY',
            label: 'Thương hiệu & Sản phẩm',
            count: dossier.skuPortfolio.length,
          },
          {
            key: 'COMPETITOR_INTELLIGENCE',
            label: 'Đối thủ & KOC',
            count: dossier.competitors.length,
          },
          {
            key: 'INSIGHTS_AND_EXECUTION',
            label: 'Bình luận & Nguồn Web',
            count: minedClusters.length + webSearchSnippets.length,
          },
        ]}
      />

      {/* ===================================================================== */}
      {/* TAB 1: THƯƠNG HIỆU, SẢN PHẨM, KỊCH BẢN & PHÂN BỔ KOC                  */}
      {/* ===================================================================== */}
      {activeTab === 'BRAND_STRATEGY' && (
        <div className="space-y-5">
          <Panel title={`Khách hàng & Định vị: ${dossier.brandName}`}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-lg bg-canvas border border-line space-y-1">
                  <div className="text-2xs font-semibold text-ink-3">
                    Thông tin chung
                  </div>
                  <p className="text-xs text-ink leading-relaxed">
                    {dossier.positioning.story}
                  </p>
                </div>
                <div className="p-3.5 rounded-lg bg-canvas border border-line space-y-1">
                  <div className="text-2xs font-semibold text-ink-3">
                    Khách hàng mục tiêu
                  </div>
                  <p className="text-xs text-ink leading-relaxed">
                    {dossier.positioning.targetAudience}
                  </p>
                </div>
                <div className="p-3.5 rounded-lg bg-canvas border border-line space-y-1">
                  <div className="text-2xs font-semibold text-ink-3">
                    Giọng điệu nội dung
                  </div>
                  <p className="text-xs text-ink leading-relaxed">
                    {dossier.positioning.toneOfVoice}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-line border border-line rounded-lg bg-surface">
                <div className="p-4 space-y-2">
                  <div className="text-xs font-semibold text-critical">
                    Vấn đề của khách
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
                    Lý do phân vân
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
                    Điểm thuyết phục
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

          <Panel title="Sản phẩm, Giá & Kênh bán">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-line bg-canvas space-y-2">
                <div className="text-xs font-semibold text-ink">
                  Thành phần & Đặc điểm chính
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {dossier.fourP.keyIngredientsOrSpecs.map((spec, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 rounded bg-surface border border-line text-xs text-ink"
                    >
                      • {spec}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-lg border border-line bg-canvas space-y-2">
                <div className="text-xs font-semibold text-ink">
                  Khoảng giá, Chiết khấu & Hoa hồng
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded bg-surface border border-line font-semibold text-ink">
                    Giá: {dossier.fourP.priceRangeText}
                  </span>
                  <span className="px-2.5 py-1 rounded bg-surface border border-line font-semibold text-positive">
                    Giảm TB: -{dossier.fourP.avgDealDiscountPct}%
                  </span>
                  <span className="px-2.5 py-1 rounded bg-surface border border-line font-semibold text-accent">
                    Hoa hồng: {dossier.fourP.affiliateCommissionRange}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-line bg-canvas space-y-2">
                <div className="text-xs font-semibold text-ink">
                  Tỷ trọng kênh bán
                </div>
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

              <div className="p-4 rounded-lg border border-line bg-canvas space-y-2">
                <div className="text-xs font-semibold text-ink">
                  Combo & Quà tặng kèm
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

          <Panel
            flush
            title={`Danh mục sản phẩm (${dossier.skuPortfolio.length} mã)`}
          >
            <DataTable<BrandSkuPortfolioItem>
              columns={skuColumns}
              rows={dossier.skuPortfolio}
              rowKey={(r) => r.id}
              empty="Chưa có danh mục sản phẩm."
            />
          </Panel>

          <Panel
            flush
            title={`Kịch bản mẫu (${dossier.contentAngleBlueprints.length} chủ đề)`}
            actions={
              <Button
                size="sm"
                variant="secondary"
                icon={Target}
                onClick={() =>
                  void handleRunModelResearch({
                    playbook: 'CONTENT_HOOKS_5',
                    scrollToReport: true,
                  })
                }
              >
                Tạo thêm kịch bản
              </Button>
            }
          >
            <DataTable<WinningContentAngleBlueprint>
              columns={contentAngleColumns}
              rows={dossier.contentAngleBlueprints}
              rowKey={(r) => r.id}
              empty="Chưa có kịch bản mẫu."
            />
          </Panel>

          <Panel
            flush
            title="Phân bổ KOC (KL1 – KL4)"
          >
            <DataTable<KocTierAllocationItem>
              columns={kocTierColumns}
              rows={dossier.kocTierStrategy}
              rowKey={(r) => r.tierCode}
              empty="Chưa có dữ liệu KOC."
            />
          </Panel>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <Panel
              title="Điểm mạnh / Điểm yếu & Rủi ro"
              className="lg:col-span-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 border border-line rounded-lg overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-line">
                <div className="divide-y divide-line">
                  <div className="p-3.5 space-y-1.5">
                    <div className="text-xs font-semibold text-positive">
                      Điểm mạnh
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
                      Cơ hội
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
                      Điểm yếu
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
                      Rủi ro
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
              title="Từ cấm trên sàn (TikTok / Shopee)"
              className="lg:col-span-6"
            >
              <DataTable<PlatformComplianceRuleItem>
                columns={complianceColumns}
                rows={dossier.swotAndCompliance.platformComplianceRules}
                rowKey={(r) => r.riskCategory}
                empty="Chưa có dữ liệu."
              />
            </Panel>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: ĐỐI THỦ & QUÉT KOC                                             */}
      {/* ===================================================================== */}
      {activeTab === 'COMPETITOR_INTELLIGENCE' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-line bg-surface space-y-1">
              <div className="text-2xs font-semibold text-ink-3">
                Sản phẩm chính của {dossier.brandName}
              </div>
              <div className="text-sm font-semibold text-ink truncate">
                {competitorBenchmarkSummary.brandHeroName}
              </div>
              <div className="text-xs text-accent font-medium tabular-nums">
                Giá: {formatVnd(competitorBenchmarkSummary.brandHeroPrice)} · Hoa hồng:{' '}
                {competitorBenchmarkSummary.brandHeroCommission}%
              </div>
            </div>

            <div className="p-4 rounded-xl border border-line bg-surface space-y-1">
              <div className="text-2xs font-semibold text-ink-3">
                Trung bình {dossier.competitors.length} đối thủ
              </div>
              <div className="text-sm font-semibold text-ink tabular-nums">
                Giá TB: {formatVnd(competitorBenchmarkSummary.avgCompPrice)}{' '}
                <span className="text-2xs font-normal text-ink-3">
                  ({competitorBenchmarkSummary.priceDiffPct <= 0
                    ? `Thấp hơn ${Math.abs(competitorBenchmarkSummary.priceDiffPct)}%`
                    : `Cao hơn +${competitorBenchmarkSummary.priceDiffPct}%`})
                </span>
              </div>
              <div className="text-xs text-positive font-medium tabular-nums">
                Hoa hồng TB: {competitorBenchmarkSummary.avgCompCommission}%
              </div>
            </div>

            <div className="p-4 rounded-xl border border-line bg-surface flex flex-col justify-between gap-2">
              <div className="text-2xs font-semibold text-ink-3">
                So sánh nhanh
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
                    scrollToReport: true,
                  })
                }
              >
                So sánh {dossier.competitors.length} đối thủ
              </Button>
            </div>
          </div>

          <Panel
            flush
            title={`Danh sách đối thủ (${dossier.competitors.length})`}
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
                  placeholder="Nhập tên đối thủ hoặc @handle TikTok (VD: Mustela, Cocoon, @handle...)"
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
                  Thêm đối thủ
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
              empty="Chưa có dữ liệu đối thủ."
            />
          </Panel>

          {(scanningCompetitorHandle || scannedCompKocs.length > 0) && (
            <Panel
              flush
              title={
                scannedCompProfile
                  ? `KOC đăng bài cho ${scannedCompProfile.brandName} (@${scannedCompProfile.handle})`
                  : `Đang quét KOC của ${scanningCompetitorHandle}...`
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
      {/* TAB 3: BÌNH LUẬN KHÁCH HÀNG, QUÉT WEB & THỰC THI B2C                  */}
      {/* ===================================================================== */}
      {activeTab === 'INSIGHTS_AND_EXECUTION' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <Panel
              title="Bình luận & Đánh giá khách hàng"
              className="lg:col-span-4"
            >
              <div className="space-y-3.5">
                <Field label="Link video TikTok">
                  <Input
                    type="text"
                    value={reviewVideoUrl}
                    onChange={(e) => setReviewVideoUrl(e.target.value)}
                    placeholder="https://www.tiktok.com/@.../video/..."
                    className="font-code text-xs"
                  />
                </Field>

                <Field label="Hoặc dán bình luận / đánh giá (mỗi dòng 1 ý)">
                  <Textarea
                    rows={5}
                    value={rawReviewText}
                    onChange={(e) => setRawReviewText(e.target.value)}
                    placeholder="Dán bình luận hoặc câu hỏi của khách hàng..."
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
                    {miningReviews ? 'Đang lọc...' : 'Lọc bình luận'}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={runningModelResearch}
                    icon={RefreshCw}
                    onClick={() =>
                      void handleRunModelResearch({
                        playbook: 'CUSTOMER_PAIN_FAQ',
                        scrollToReport: true,
                      })
                    }
                  >
                    Tổng hợp câu trả lời
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
              title={`Nhóm bình luận & Câu hỏi thường gặp (${minedClusters.length})`}
              className="lg:col-span-8"
              actions={
                <Button
                  size="sm"
                  variant="primary"
                  disabled={savingFaqs}
                  icon={Check}
                  onClick={handleSyncFaqsToBrandProfile}
                >
                  Lưu vào hồ sơ {dossier.brandName}
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
                        {cluster.mentionCount} bình luận · {cluster.sharePct}%
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
                          Mở đầu video trả lời
                        </span>
                        <span className="text-ink">
                          {cluster.recommendedScriptHook}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-md bg-canvas border border-line">
                        <span className="font-semibold text-ink block mb-0.5">
                          Câu hỏi: {cluster.suggestedFaqQuestion}
                        </span>
                        <span className="text-ink-2">{cluster.suggestedFaqAnswer}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <Panel title="Quét website thương hiệu / đối thủ">
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
                  <>
                    <Button
                      variant="secondary"
                      icon={FileCheck}
                      onClick={() => {
                        const updated = generateBrandMarketResearchDossier({
                          brandNameOrQuery: dossier.brandName,
                          customCategory: dossier.category,
                          customCompetitorInputs: dossier.competitors.map(
                            (c) => c.competitorName
                          ),
                          liveWebInspection: webInspection,
                          liveAutoWebIntel: dossier.liveAutoWebIntel,
                          savedBrandProfile: findProfileForBrand(dossier.brandName),
                        });
                        setDossier(updated);
                        onNotify?.(
                          `Đã cập nhật dữ liệu trang đích ${webInspection.domain} vào hồ sơ ${dossier.brandName}`,
                          'success'
                        );
                      }}
                    >
                      Cập nhật vào hồ sơ
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={runningModelResearch}
                      icon={FileText}
                      onClick={() => {
                        const updated = generateBrandMarketResearchDossier({
                          brandNameOrQuery: dossier.brandName,
                          customCategory: dossier.category,
                          customCompetitorInputs: dossier.competitors.map(
                            (c) => c.competitorName
                          ),
                          liveWebInspection: webInspection,
                          liveAutoWebIntel: dossier.liveAutoWebIntel,
                          savedBrandProfile: findProfileForBrand(dossier.brandName),
                        });
                        setDossier(updated);
                        void handleRunModelResearch({
                          targetDossier: updated,
                          playbook: 'COMPETITOR_DEEP_DIVE',
                          questionOverride: `Phân tích trang đích ${webInspection.domain} (${webInspection.pageTitle}): Mốc giá phát hiện (${webInspection.detectedPricesVnd.map(formatVnd).join(', ') || 'chưa rõ'}), tiêu đề chính (${webInspection.h1Headings.concat(webInspection.h2Headings).slice(0, 4).join('; ')}) và đề xuất hướng cạnh tranh cho ${dossier.brandName}.`,
                          skipPreSearch: true,
                          scrollToReport: true,
                        });
                      }}
                    >
                      Phân tích trang đích
                    </Button>
                  </>
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
                          Điểm nổi bật trên trang
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

          {/* 3. Kết quả tìm kiếm trên mạng & Sản phẩm cào trực tiếp */}
          <Panel
            flush={webSearchSnippets.length > 0}
            title={`Kết quả tìm kiếm trên mạng (${webSearchSnippets.length} nguồn): ${dossier.brandName}`}
          >
            {webSearchSnippets.length > 0 ? (
              <div className="divide-y divide-line">
                {webSearchSnippets.map((sn, idx) => (
                  <div
                    key={idx}
                    className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:bg-canvas/40 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-code text-2xs font-semibold text-accent px-2 py-0.5 rounded bg-canvas border border-line">
                          {sn.domain}
                        </span>
                        <a
                          href={sn.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-semibold text-ink hover:text-accent hover:underline truncate"
                        >
                          {sn.title}
                        </a>
                        {sn.extractedPricesVnd?.[0] && (
                          <Status tone="positive">
                            Giá: {formatVnd(sn.extractedPricesVnd[0])}
                          </Status>
                        )}
                      </div>
                      <p className="text-xs text-ink-2 leading-relaxed">
                        {sn.snippet}
                      </p>
                    </div>
                    <a
                      href={sn.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 shrink-0 rounded-md border border-line-strong bg-surface px-2.5 h-7 text-2xs font-medium text-accent hover:bg-sunken"
                    >
                      Mở trang <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-ink-2">
                Bấm nút &ldquo;Nghiên cứu&rdquo; hoặc &ldquo;Tìm &amp; Tổng hợp&rdquo; để tìm kiếm thông tin mới nhất trên mạng cho <strong>{dossier.brandName}</strong>.
              </div>
            )}
          </Panel>

          {webScrapedProducts.length > 0 && (
            <Panel
              flush
              title={`Sản phẩm đang mở bán trên Website / Sàn TMĐT (${webScrapedProducts.length} sản phẩm)`}
            >
              <div className="divide-y divide-line">
                {webScrapedProducts.map((prod, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-canvas/40"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-ink truncate">
                        {prod.productName}
                      </div>
                      <div className="text-2xs text-ink-3 mt-0.5">
                        Nguồn: {prod.sourceDomain}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right tabular-nums">
                        <div className="text-xs font-semibold text-accent">
                          {formatVnd(prod.priceVnd)}
                        </div>
                        {prod.originalPriceVnd && prod.originalPriceVnd > prod.priceVnd && (
                          <div className="text-2xs text-ink-3 line-through">
                            {formatVnd(prod.originalPriceVnd)}
                          </div>
                        )}
                      </div>
                      {prod.sourceUrl && (
                        <a
                          href={prod.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded border border-line bg-surface px-2.5 h-7 text-2xs font-medium text-accent hover:bg-sunken"
                        >
                          Xem SP <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
