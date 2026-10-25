'use client';

import React, { useState, useMemo } from 'react';
import { formatVndShort, getVietnamDateYmd } from '../../lib/format';
import { ActionMenu, Button, ConfirmDialog, Field, Input, Modal, PageActions, Panel, Select, Status, Tabs, Textarea } from '../ui';
import { ContentPlanBoard } from './ContentPlanBoard';
import { PlanSelfChannelBoard } from './PlanSelfChannelBoard';
import { BrandMonthlyPlanForm } from './BrandMonthlyPlanForm';
import {
  CheckCircle,
  Clock,
  Eye,
  Video,
  Layers,
  ExternalLink,
  FileText,
  Plus,
  Lightbulb,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import { ScriptReviewItem, ContentItemModel, PublicationItemModel, KocItem, BookingDealItem, InputPlanBreakdownState } from '../../lib/types';
import { INITIAL_SCRIPTS, INITIAL_CONTENT_ITEMS, INITIAL_PUBLICATIONS, INITIAL_DEALS } from '../../lib/mockData';
import {
  DEFAULT_KL67_MANDATORY_SHOTS,
  DEFAULT_KL67_RIGHTS_GUARDRAILS,
  formatBriefCode,
  isBriefReady,
  isVettingGuardrailRow,
  resolveBriefMode,
  slotKocHandles,
  type ContentBriefMode,
  type ContentPlanData,
} from '../../lib/contentPlanRules';
import { syncDealSummaryFields, type DealBoardData } from '../../lib/dealBoardRules';
import { generateAiAngleSuggestions } from '../../lib/contentAngleData';
import { analyzeScriptWithAi } from '../../lib/aiScriptAnalyzer';
import { executeOperationalReport } from '../../lib/operationalReportService';
import { brandProfileToKnowledgeBase, findBrandProfile, useBrandProfiles } from '../../lib/brands/useBrandProfiles';
import { ScriptReviewModal } from '../ScriptReviewModal';
import { OperationalReportDrawer } from '../OperationalReportDrawer';
import { TikTokVideoInspectorModal } from '../koc/TikTokVideoInspectorModal';
import { ContentCopilotModal } from '../content/ContentCopilotModal';

interface ContentViewProps {
  onScriptApprovedNotification?: (dealCode: string) => void;
  onNavigateToAngles?: () => void;
  kocs?: KocItem[];
  deals?: BookingDealItem[];
  currentUserName?: string;
  currentUserRole?: string;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

type ContentSubTab = 'BRAND_PLAN' | 'CONTENT_PLAN' | 'SELF_CHANNEL_BOARD' | 'CONTENT_ITEMS' | 'SCRIPTS' | 'DRAFT_VIDEOS' | 'PUBLICATIONS';

const PILLAR_OPTIONS = [
  'Nỗi đau - Giải pháp',
  'Review trực tiếp',
  'Mở hộp & trải nghiệm',
  'So sánh trước / sau',
  'Chia sẻ kinh nghiệm đời sống',
];

const FORMAT_OPTIONS = [
  'Talking Head + B-roll',
  'Voiceover B-roll',
  'POV Tình huống trước/sau',
  'Mở hộp âm thanh thực',
];

export const ContentView: React.FC<ContentViewProps> = ({
  onScriptApprovedNotification,
  onNavigateToAngles,
  currentUserName,
  currentUserRole,
  onNotify,
  kocs,
  deals,
}) => {
  const { profiles } = useBrandProfiles();
  const [scripts, setScripts] = useState<ScriptReviewItem[]>(INITIAL_SCRIPTS);
  const [contentItems, setContentItems] = useState<ContentItemModel[]>(INITIAL_CONTENT_ITEMS);
  const [publications, setPublications] = useState<PublicationItemModel[]>(INITIAL_PUBLICATIONS);
  const [selectedScript, setSelectedScript] = useState<ScriptReviewItem | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<ContentSubTab>('BRAND_PLAN');
  const [approvingDraftVideo, setApprovingDraftVideo] = useState<string | null>(null);
  const [approvedDraftVideos, setApprovedDraftVideos] = useState<Set<string>>(new Set());
  const [isScriptReportOpen, setIsScriptReportOpen] = useState(false);
  const [isVideoInspectorOpen, setIsVideoInspectorOpen] = useState(false);
  const [inspectInitialUrl, setInspectInitialUrl] = useState<string>('');
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [filterBrand, setFilterBrand] = useState<string>('ALL');
  const [filterProduct, setFilterProduct] = useState<string>('');
  const [isSyncingPlans, setIsSyncingPlans] = useState<boolean>(false);

  const handleSyncFromContentPlans = async () => {
    setIsSyncingPlans(true);
    try {
      const res = await fetch('/api/monthly-plans', { cache: 'no-store' });
      const body = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(body?.plans)) {
        onNotify?.('Không tải được danh sách kế hoạch để đồng bộ.', 'error');
        return;
      }
      const allPlans = (body.plans as { plan: InputPlanBreakdownState }[]).map(p => p.plan);
      const targetPlans = filterBrand !== 'ALL' ? allPlans.filter(p => p.brandName === filterBrand) : allPlans.slice(0, 8);
      const addedItems: ContentItemModel[] = [];
      const addedScripts: ScriptReviewItem[] = [];
      const addedPublications: PublicationItemModel[] = [];
      const existingContentIds = new Set(contentItems.map(c => c.id));
      const existingScriptIds = new Set(scripts.map(s => s.id));
      const existingPubIds = new Set(publications.map(pb => pb.id));

      for (const p of targetPlans) {
        const [cpRes, dbRes] = await Promise.all([
          fetch(`/api/content-plan?planId=${encodeURIComponent(p.id)}`, { cache: 'no-store' }),
          fetch(`/api/deal-board?planId=${encodeURIComponent(p.id)}`, { cache: 'no-store' }),
        ]);
        const cpBody = await cpRes.json().catch(() => null);
        const dbBody = await dbRes.json().catch(() => null);
        const cpData = (cpBody?.data as ContentPlanData) || { slots: [] };
        const dbData = (dbBody?.data as DealBoardData) || { frameworks: {}, deals: [] };

        // 1. Đọc từ DealJob (Thực thể Bài làm của từng KOC — Single Source of Truth)
        for (const deal of dbData.deals || []) {
          for (const job of deal.jobs || []) {
            const jobCntId = `cnt-job-${p.id}__${deal.id}__${job.id}`;
            const jobScrId = `scr-job-${p.id}__${deal.id}__${job.id}`;
            const jobPubId = `pub-job-${p.id}__${deal.id}__${job.id}`;
            const effMode: ContentBriefMode =
              job.briefMode || (isVettingGuardrailRow(String(deal.grade)) ? 'VETTING_GUARDRAILS' : 'DIRECTIVE');
            const isVetting = effMode === 'VETTING_GUARDRAILS';
            const prodLabel = job.productName || job.productGroupName || 'Sản phẩm đẩy';
            const campTitle = `${p.brandName} (${p.storeName || p.title}) — ${prodLabel}`;
            const mappedScriptStatus =
              job.script.status === 'APPROVED'
                ? 'APPROVED'
                : job.script.status === 'CHANGES' || job.script.internalScriptAuditStatus === 'CHANGES'
                  ? 'REVISION_REQUESTED'
                  : 'PENDING';

            if (!existingContentIds.has(jobCntId)) {
              existingContentIds.add(jobCntId);
              addedItems.push({
                id: jobCntId,
                contentCode: job.code,
                bookingDealId: deal.id,
                dealCode: job.code,
                campaignTitle: campTitle,
                creatorName: `@${deal.kocHandle} (${deal.kocName || deal.kocHandle})`,
                pillar: job.pillar || 'Theo kế hoạch',
                angle: isVetting
                  ? job.angle || 'KOL tự đề xuất kịch bản theo chất kênh (Kiểm duyệt theo khung tham số)'
                  : job.angle || prodLabel,
                format: job.isLivestreamJob ? 'LIVESTREAM_SESSION' : 'VIDEO_SHORT_60S',
                channel: 'TIKTOK',
                scriptHook: isVetting
                  ? job.hook || 'KOL tự do sáng tạo mở đầu (Không áp đặt Hook mẫu)'
                  : job.hook || `Mở đầu 3s cho ${prodLabel}`,
                scriptPainPoint: job.forbiddenClaims ? `Tránh từ cấm: ${job.forbiddenClaims}` : 'Tình huống thực tế khách hàng',
                scriptUsp: job.usp || prodLabel,
                scriptCta: job.cta || (job.cartUrl ? `Bấm giỏ hàng chính hãng (${job.cartUrl})` : 'Nhấn vào giỏ hàng góc trái'),
                scriptStatus: mappedScriptStatus,
                revisionCount: mappedScriptStatus === 'REVISION_REQUESTED' ? 1 : 0,
                demoVideoUrl: job.script.demoUrl || undefined,
                demoStatus:
                  job.script.demoStatus === 'APPROVED'
                    ? 'APPROVED'
                    : job.script.demoStatus === 'CHANGES'
                      ? 'REJECTED'
                      : job.script.demoUrl
                        ? 'SUBMITTED'
                        : 'NOT_SUBMITTED',
                qcStatus: job.acceptance.status === 'PASSED' ? 'PASS' : job.acceptance.status === 'FAILED' ? 'REVISION_REQUIRED' : 'PENDING',
                reviewMode: effMode,
                klCode: deal.grade,
                mandatoryShots: job.mandatoryShots,
                forbiddenClaims: job.forbiddenClaims,
                rightsGuardrails: job.rightsGuardrails,
                qcChecklistNotes: [
                  job.briefCode ? `Đề bài: ${job.briefCode}` : '',
                  job.productName ? `SKU: ${job.productName}` : '',
                  typeof job.commissionPct === 'number' ? `Hoa hồng: ${job.commissionPct}%` : '',
                ]
                  .filter(Boolean)
                  .join(' · ') || undefined,
              });
            }

            if (!existingScriptIds.has(jobScrId)) {
              existingScriptIds.add(jobScrId);
              addedScripts.push({
                id: jobScrId,
                dealCode: job.code,
                kocId: deal.kocHandle,
                kocName: `@${deal.kocHandle}`,
                kocTier: deal.grade === 'KL7' ? 'TIER_1_CELEB' : deal.grade === 'KL6' ? 'TIER_2_MACRO' : 'TIER_3_MICRO',
                campaignTitle: campTitle,
                pillar: job.pillar || 'Theo kế hoạch',
                videoDuration: '45s - 60s',
                hook: isVetting ? job.hook || 'KOL tự đề xuất mở đầu theo phong cách kênh' : job.hook || job.angle || prodLabel,
                painPoint: job.forbiddenClaims ? `Từ cấm & Ranh giới Brand: ${job.forbiddenClaims}` : 'Tình huống khách hàng mục tiêu',
                solutionAndUsp: job.usp || prodLabel,
                callToAction: job.cta || 'Nhấn vào giỏ hàng góc trái mua chính hãng',
                status: mappedScriptStatus,
                remainingHours: mappedScriptStatus === 'APPROVED' ? 0 : 24,
                submittedBy: job.pic || deal.pic || currentUserName || 'Booking PIC',
                submittedAt: job.script.at || `Job ${job.code}`,
                feedbackNotes: job.script.note || undefined,
                reviewMode: effMode,
                klCode: deal.grade,
                mandatoryShots: job.mandatoryShots,
                forbiddenClaims: job.forbiddenClaims,
                rightsGuardrails: job.rightsGuardrails,
              });
            }

            if (job.airLink.trim() && !existingPubIds.has(jobPubId)) {
              existingPubIds.add(jobPubId);
              const views = job.acceptance.views ?? job.performance.d14.views ?? 0;
              const gmv = job.performance.d14.gmv ?? 0;
              const cost = job.videoFee > 0 ? job.videoFee : deal.fee || 0;
              addedPublications.push({
                id: jobPubId,
                publicationCode: `PUB-${job.code}`,
                contentItemId: jobCntId,
                contentCode: job.code,
                dealCode: job.code,
                creatorName: `@${deal.kocHandle}`,
                platform: 'TIKTOK',
                platformPostUrl: job.airLink,
                publishedAt: job.airedAt || 'Đã lên sóng',
                sparkAdsCode: job.sparkAdsCode || undefined,
                sparkAdsExpiryDays: job.sparkAdsCode ? 30 : undefined,
                isMediaHandedOff: Boolean(job.sparkAdsCode),
                viewsCount: views,
                likesCount: Math.round(views * 0.045),
                affiliateGmv: gmv,
                itemsSold: job.performance.d14.orders ?? 0,
                costAttributed: cost,
                roi: cost > 0 ? Number((gmv / cost).toFixed(1)) : 0,
                verificationStatus: job.acceptance.status === 'PASSED' ? 'VERIFIED' : 'PENDING_AUDIT',
              });
            }
          }
        }

        // 2. Đọc các Đề bài gốc ContentSlot (BR-xx) chưa sinh DealJob hoặc đã gán KOC dự kiến
        for (const s of cpData.slots || []) {
          const handles = slotKocHandles(s);
          if (!isBriefReady(s) && handles.length === 0) continue;
          const code = formatBriefCode(s);
          const effMode = resolveBriefMode(s);
          const isVetting = effMode === 'VETTING_GUARDRAILS';
          const cntId = `cnt-plan-${p.id}-${s.id}`;
          const creatorLabel = handles.length > 0 ? handles.map(h => `@${h}`).join(', ') : s.pic || p.pic || 'Đề bài chưa gán KOC';
          const campTitle = `${p.brandName} (${p.storeName || p.title}) — ${s.sku || s.product || 'Sản phẩm đẩy'}`;
          if (!existingContentIds.has(cntId)) {
            existingContentIds.add(cntId);
            addedItems.push({
              id: cntId,
              contentCode: `${code}-${p.month.replace('/', '')}`,
              bookingDealId: `plan-${p.id}`,
              dealCode: `${code}_${(p.brandName || 'B2C').slice(0, 4).toUpperCase()}`,
              campaignTitle: campTitle,
              creatorName: creatorLabel,
              pillar: s.pillar,
              angle: isVetting ? (s.angle || 'KOL tự đề xuất kịch bản theo chất kênh (Kiểm duyệt theo khung tham số)') : (s.angle || s.product || s.pillar),
              format: 'VIDEO_SHORT_60S',
              channel: 'TIKTOK',
              scriptHook: isVetting ? (s.hook || 'KOL tự do sáng tạo mở đầu (Không áp đặt Hook mẫu)') : (s.hook || `Mở đầu 3s theo góc: ${s.angle || s.pillar}`),
              scriptPainPoint: s.forbiddenClaims ? `Tránh từ cấm: ${s.forbiddenClaims}` : 'Tình huống thực tế của khách hàng mục tiêu',
              scriptUsp: s.usp || s.product || 'Nêu bật USP sản phẩm chủ lực theo Guideline Brand',
              scriptCta: s.cta || (s.cartUrl ? `Bấm giỏ hàng chính hãng (${s.cartUrl})` : 'Nhấn vào giỏ hàng góc trái mua chính hãng'),
              scriptStatus: handles.length > 0 ? 'PENDING' : 'APPROVED',
              revisionCount: 0,
              demoStatus: 'NOT_SUBMITTED',
              qcStatus: isBriefReady(s) ? 'PASS' : 'PENDING',
              reviewMode: effMode,
              klCode: s.row || undefined,
              mandatoryShots: s.mandatoryShots,
              forbiddenClaims: s.forbiddenClaims,
              rightsGuardrails: s.rightsGuardrails,
              qcChecklistNotes: [
                isVetting ? 'Chế độ: Kiểm duyệt khung tham số (KL6/KL7)' : '',
                s.sku ? `SKU: ${s.sku}` : '',
                typeof s.commissionPct === 'number' ? `Hoa hồng: ${s.commissionPct}%` : '',
                s.mandatoryShots ? `Khung hình: ${s.mandatoryShots}` : '',
                s.week ? `Tuần: ${s.week.split(' ')[0]} · Bậc: ${s.row || ''}` : '',
              ].filter(Boolean).join(' · ') || undefined,
            });
          }
          if (handles.length > 0) {
            for (const h of handles) {
              const scrId = `scr-plan-${p.id}-${s.id}-${h.toLowerCase()}`;
              if (existingScriptIds.has(scrId)) continue;
              existingScriptIds.add(scrId);
              addedScripts.push({
                id: scrId,
                dealCode: `${code}_${h.toUpperCase().slice(0, 6)}`,
                kocId: `koc-${h}`,
                kocName: `@${h}`,
                kocTier: s.row === 'KL7' ? 'TIER_1_CELEB' : s.row === 'KL6' ? 'TIER_2_MACRO' : 'TIER_3_MICRO',
                campaignTitle: campTitle,
                pillar: s.pillar,
                videoDuration: '45s - 60s',
                hook: isVetting ? (s.hook || 'KOL tự đề xuất mở đầu theo phong cách kênh') : (s.hook || s.angle || `Hook 3s cho ${s.product || p.brandName}`),
                painPoint: s.forbiddenClaims ? `Từ cấm & Ranh giới Brand: ${s.forbiddenClaims}` : 'Nỗi đau khách hàng mục tiêu',
                solutionAndUsp: s.usp || s.product || 'Giải pháp & USP sản phẩm đẩy',
                callToAction: s.cta || 'Nhấn vào giỏ hàng góc trái mua chính hãng',
                status: 'PENDING',
                remainingHours: 24,
                submittedBy: s.pic || p.pic || currentUserName || 'Chuyên viên Content',
                submittedAt: `Đồng bộ từ ${code}`,
                reviewMode: effMode,
                klCode: s.row || undefined,
                mandatoryShots: s.mandatoryShots,
                forbiddenClaims: s.forbiddenClaims,
                rightsGuardrails: s.rightsGuardrails,
              });
            }
          }
        }
      }

      if (addedItems.length === 0 && addedScripts.length === 0 && addedPublications.length === 0) {
        onNotify?.('Chưa có Đề bài (BR-xx) hoặc Bài làm KOC (DealJob) mới nào cần đồng bộ thêm.', 'info');
        return;
      }
      if (addedItems.length > 0) setContentItems(prev => [...addedItems, ...prev]);
      if (addedScripts.length > 0) setScripts(prev => [...addedScripts, ...prev]);
      if (addedPublications.length > 0) setPublications(prev => [...addedPublications, ...prev]);
      onNotify?.(
        `Đã đồng bộ ${addedItems.length} hồ sơ nội dung, ${addedScripts.length} kịch bản và ${addedPublications.length} bài đăng trực tiếp từ DealJob & Kho Brief.`,
        'success',
      );
    } catch {
      onNotify?.('Lỗi khi đồng bộ từ Kế hoạch Content.', 'error');
    } finally {
      setIsSyncingPlans(false);
    }
  };

  const filteredContentItems = useMemo(() => {
    const q = filterProduct.trim().toLowerCase();
    return contentItems.filter(item => {
      if (filterBrand !== 'ALL' && !item.campaignTitle.toLowerCase().includes(filterBrand.toLowerCase())) return false;
      if (q && !`${item.campaignTitle} ${item.angle} ${item.scriptUsp} ${item.creatorName} ${item.qcChecklistNotes || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [contentItems, filterBrand, filterProduct]);

  const filteredScripts = useMemo(() => {
    const q = filterProduct.trim().toLowerCase();
    return scripts.filter(item => {
      if (filterBrand !== 'ALL' && !item.campaignTitle.toLowerCase().includes(filterBrand.toLowerCase())) return false;
      if (q && !`${item.campaignTitle} ${item.hook} ${item.solutionAndUsp} ${item.kocName}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [scripts, filterBrand, filterProduct]);

  // State tạo kịch bản / brief mới
  const [isCreateScriptOpen, setIsCreateScriptOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState<string>('Kutieskin');
  const [newProductName, setNewProductName] = useState<string>('Kem bôi dịu da Kutieskin');
  const [newDealCode, setNewDealCode] = useState<string>(INITIAL_DEALS[0]?.dealCode || 'BO26_NEW_01');
  const [newCreatorName, setNewCreatorName] = useState<string>(INITIAL_SCRIPTS[0]?.kocName || 'Chanh Beauty');
  const [newPillar, setNewPillar] = useState<string>(PILLAR_OPTIONS[0]);
  const [newFormat, setNewFormat] = useState<string>(FORMAT_OPTIONS[0]);
  const [newAngleName, setNewAngleName] = useState<string>('');
  const [newBriefMode, setNewBriefMode] = useState<ContentBriefMode>('DIRECTIVE');
  const [newMandatoryShots, setNewMandatoryShots] = useState<string>(DEFAULT_KL67_MANDATORY_SHOTS);
  const [newRightsGuardrails, setNewRightsGuardrails] = useState<string>(DEFAULT_KL67_RIGHTS_GUARDRAILS);
  const [newHook, setNewHook] = useState<string>('');
  const [newPainPoint, setNewPainPoint] = useState<string>('');
  const [newUsp, setNewUsp] = useState<string>('');
  const [newCta, setNewCta] = useState<string>('Bấm vào giỏ hàng góc trái màn hình để nhận ưu đãi chính hãng.');
  const [suggestionIdx, setSuggestionIdx] = useState<number>(0);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState<boolean>(false);

  const selectedBrandProfile = useMemo(
    () => findBrandProfile(profiles, newBrandName) || profiles[0],
    [profiles, newBrandName],
  );

  const brandProductOptions = useMemo(() => {
    if (selectedBrandProfile?.products?.length) {
      return selectedBrandProfile.products.map(p => p.name);
    }
    return ['Kem bôi dịu da Kutieskin', 'Sữa rửa mặt dịu nhẹ', 'Kem chống nắng phổ rộng'];
  }, [selectedBrandProfile]);

  const draftCompliance = useMemo(() => {
    if (!selectedBrandProfile || (!newHook.trim() && !newUsp.trim())) return null;
    const kb = brandProfileToKnowledgeBase(selectedBrandProfile);
    const fullText = `${newHook}\n${newPainPoint}\n${newUsp}\n${newCta}`;
    return analyzeScriptWithAi(fullText, kb);
  }, [selectedBrandProfile, newHook, newPainPoint, newUsp, newCta]);

  const handleOpenCreateScript = () => {
    const defaultBrand = profiles[0]?.brandName || 'Kutieskin';
    const defaultProd = profiles[0]?.products?.[0]?.name || 'Kem bôi dịu da Kutieskin';
    setNewBrandName(defaultBrand);
    setNewProductName(defaultProd);
    const suggs = generateAiAngleSuggestions(defaultProd, PILLAR_OPTIONS[0], defaultBrand);
    const first = suggs[0];
    if (first) {
      setNewAngleName(first.name);
      setNewHook(first.hookIdea);
      setNewPainPoint(first.painPoint);
      setNewUsp(first.solutionApproach);
      setNewCta(first.callToAction);
    }
    setSuggestionIdx(0);
    setIsCreateScriptOpen(true);
  };

  const handleAutoSuggestBrief = async () => {
    const suggs = generateAiAngleSuggestions(newProductName, newPillar, newBrandName);
    const nextIdx = (suggestionIdx + 1) % Math.max(1, suggs.length);
    setSuggestionIdx(nextIdx);
    const chosen = suggs[nextIdx] || suggs[0];

    const prodObj = selectedBrandProfile?.products?.find(p => p.name === newProductName);
    const bannedWords = (selectedBrandProfile?.contentRules?.banned || []).map(b => b.phrase).join(', ');
    const usps = (prodObj?.usps || []).join('; ');
    const disclaimer = selectedBrandProfile?.legal?.find(l => l.disclaimer)?.disclaimer || '';

    setIsGeneratingBrief(true);
    try {
      const res = await executeOperationalReport({
        purposeId: 'SCRIPT_REVIEW',
        moduleTitle: `Soạn kịch bản (${newBrandName} - ${newProductName})`,
        sourceTag: 'SCRIPT_REVIEW',
        inputContextText: [
          `Thương hiệu: ${newBrandName}`,
          `Sản phẩm: ${newProductName}`,
          `Trụ cột nội dung: ${newPillar} | Định dạng: ${newFormat}`,
          `KOC thực hiện: ${newCreatorName}`,
          `Điểm chính của sản phẩm: ${usps || 'Hàng chính hãng, thông tin thành phần rõ ràng'}`,
          `Từ cấm không được dùng: ${bannedWords || 'Cam kết 100%, trị dứt điểm, thuốc đặc trị'}`,
          disclaimer ? `Câu khuyến cáo pháp lý bắt buộc: ${disclaimer}` : '',
          `Định dạng trả về JSON 5 trường: {"angle": "Tên góc tiếp cận", "hook": "Câu mở đầu 3s", "painPoint": "Tình huống thực tế của khách", "usp": "Cách dùng và điểm chính của sản phẩm", "cta": "Hướng dẫn bấm giỏ hàng kèm khuyến cáo pháp lý nếu có"}`,
        ].filter(Boolean).join('\n'),
      });

      const jsonMatch = res.outputText?.match(/\{[\s\S]*\}/);
      if (res.ok && jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]) as Record<string, string>;
          if (parsed.hook && parsed.usp) {
            setNewAngleName(parsed.angle || chosen?.name || `${newPillar} - ${newProductName}`);
            setNewHook(parsed.hook);
            setNewPainPoint(parsed.painPoint || chosen?.painPoint || '');
            setNewUsp(parsed.usp);
            setNewCta(parsed.cta || (disclaimer ? `${chosen?.callToAction || ''} (${disclaimer})` : chosen?.callToAction || ''));
            setIsGeneratingBrief(false);
            return;
          }
        } catch {
          // Bỏ qua nếu chuỗi JSON không hợp lệ
        }
      }
    } catch {
      // Dùng mẫu nội bộ bên dưới nếu chưa cấu hình khóa kết nối
    } finally {
      setIsGeneratingBrief(false);
    }

    if (!chosen) return;
    const uspLine = prodObj?.usps?.length
      ? `${chosen.solutionApproach} (${prodObj.usps.slice(0, 2).join('; ')})`
      : chosen.solutionApproach;

    setNewAngleName(chosen.name);
    setNewHook(chosen.hookIdea);
    setNewPainPoint(chosen.painPoint);
    setNewUsp(uspLine);
    setNewCta(disclaimer ? `${chosen.callToAction} (${disclaimer})` : chosen.callToAction);
  };

  const handleSaveNewScript = (targetQueue: 'BOTH' | 'CONTENT_ONLY') => {
    const isVetting = newBriefMode === 'VETTING_GUARDRAILS';
    if (!newUsp.trim() && (!isVetting || !newMandatoryShots.trim())) return;
    if (!isVetting && !newHook.trim()) return;
    const nowTag = Date.now().toString().slice(-3);
    const bannedStr = (selectedBrandProfile?.contentRules?.banned || []).map(b => b.phrase).join(', ');
    const newItem: ContentItemModel = {
      id: `cnt-${Date.now()}`,
      contentCode: `CNT-26-${nowTag}`,
      bookingDealId: `deal-${nowTag}`,
      dealCode: newDealCode.trim() || `BO26_${nowTag}`,
      campaignTitle: `${newBrandName} - ${newProductName}`,
      creatorName: newCreatorName.trim() || 'KOC UpBase',
      pillar: newPillar,
      angle: isVetting
        ? (newAngleName.trim() || 'KOL tự đề xuất kịch bản theo chất kênh (Kiểm duyệt khung tham số KL6/KL7)')
        : (newAngleName.trim() || `${newPillar} - ${newProductName}`),
      format: 'VIDEO_SHORT_60S',
      channel: 'TIKTOK',
      scriptHook: isVetting ? (newHook.trim() || 'KOL tự do sáng tạo mở đầu (Không áp đặt Hook mẫu)') : newHook.trim(),
      scriptPainPoint: isVetting
        ? (newPainPoint.trim() || (bannedStr ? `Từ cấm bắt buộc tránh: ${bannedStr}` : 'Không vi phạm ranh giới hình ảnh thương hiệu'))
        : newPainPoint.trim(),
      scriptUsp: newUsp.trim(),
      scriptCta: newCta.trim(),
      scriptStatus: targetQueue === 'BOTH' ? 'PENDING' : 'APPROVED',
      revisionCount: 0,
      demoStatus: 'NOT_SUBMITTED',
      qcStatus: draftCompliance && draftCompliance.overallScore >= 80 ? 'PASS' : 'PENDING',
      reviewMode: newBriefMode,
      klCode: isVetting ? 'KL6' : undefined,
      mandatoryShots: isVetting ? newMandatoryShots.trim() : undefined,
      forbiddenClaims: isVetting ? (newPainPoint.trim() || bannedStr) : undefined,
      rightsGuardrails: isVetting ? newRightsGuardrails.trim() : undefined,
      qcChecklistNotes: isVetting
        ? `Chế độ: Kiểm duyệt khung tham số (KL6/KL7) · Khung hình: ${newMandatoryShots.trim()}`
        : draftCompliance
          ? draftCompliance.summaryVerdict
          : undefined,
    };

    setContentItems(prev => [newItem, ...prev]);

    if (targetQueue === 'BOTH') {
      const reviewItem: ScriptReviewItem = {
        id: `scr-${Date.now()}`,
        dealCode: newItem.dealCode,
        kocId: `koc-${nowTag}`,
        kocName: newItem.creatorName,
        kocTier: isVetting ? 'TIER_2_MACRO' : 'TIER_3_MICRO',
        campaignTitle: newItem.campaignTitle,
        pillar: newPillar,
        videoDuration: '45s - 60s',
        hook: newItem.scriptHook,
        painPoint: newItem.scriptPainPoint,
        solutionAndUsp: newUsp.trim(),
        callToAction: newCta.trim(),
        status: 'PENDING',
        remainingHours: 24,
        submittedBy: newItem.creatorName,
        submittedAt: 'Vừa tạo',
        reviewMode: newBriefMode,
        klCode: isVetting ? 'KL6' : undefined,
        mandatoryShots: isVetting ? newMandatoryShots.trim() : undefined,
        forbiddenClaims: isVetting ? (newPainPoint.trim() || bannedStr) : undefined,
        rightsGuardrails: isVetting ? newRightsGuardrails.trim() : undefined,
      };
      setScripts(prev => [reviewItem, ...prev]);
      setActiveSubTab('SCRIPTS');
    } else {
      setActiveSubTab('CONTENT_ITEMS');
    }

    setIsCreateScriptOpen(false);
  };

  /**
   * Ghi kết quả duyệt kịch bản vòng 1 (B2C kiểm nội bộ) vào Job trên bảng Deal.
   * Vòng 2 (Brand duyệt) ghi ở bảng Deal / kéo từ Sheet, không ghi ở đây.
   * Trả lỗi để màn hình báo, không coi là đã duyệt khi máy chủ từ chối.
   */
  const syncScriptDecisionToDealJob = async (
    scriptId: string,
    decision: 'APPROVED' | 'REVISION_REQUESTED',
    notes?: string,
  ): Promise<string> => {
    const rawKey = scriptId.slice('scr-job-'.length);
    const [planId, dealId, jobId] = rawKey.split('__');
    if (!planId || !dealId || !jobId) return 'Không xác định được Job của kịch bản.';
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const dbRes = await fetch(`/api/deal-board?planId=${encodeURIComponent(planId)}`, { cache: 'no-store' });
        const dbBody = await dbRes.json().catch(() => null);
        if (!dbRes.ok) return dbBody?.error || 'Không tải được bảng Deal.';
        const dbData = (dbBody?.data as DealBoardData) || null;
        if (!dbData || !Array.isArray(dbData.deals)) return 'Không tải được bảng Deal.';
        const todayStr = getVietnamDateYmd();
        let found = false;
        const nextDeals = dbData.deals.map(d => {
          if (d.id !== dealId) return d;
          const nextJobs = (d.jobs || []).map(j => {
            if (j.id !== jobId) return j;
            found = true;
            return {
              ...j,
              script: {
                ...j.script,
                internalScriptAuditStatus: decision === 'APPROVED' ? ('PASSED' as const) : ('CHANGES' as const),
                note: notes !== undefined ? notes : j.script.note,
              },
            };
          });
          return syncDealSummaryFields({ ...d, jobs: nextJobs, history: [...(d.history || []), { at: new Date().toISOString(), actor: 'Duyệt KB vòng 1', text: `${decision === 'APPROVED' ? 'Đạt' : 'Yêu cầu sửa'} kịch bản vòng 1 (${todayStr})` }] });
        });
        if (!found) return 'Không tìm thấy Job trên bảng Deal.';
        const putRes = await fetch('/api/deal-board', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId, revision: dbBody.revision, data: { ...dbData, deals: nextDeals } }),
        });
        if (putRes.status === 409 && attempt === 0) continue;
        if (!putRes.ok) {
          const body = await putRes.json().catch(() => null);
          return body?.error || `Lỗi ${putRes.status} khi lưu kết quả duyệt.`;
        }
        return '';
      } catch {
        return 'Mất kết nối khi lưu kết quả duyệt.';
      }
    }
    return 'Bảng Deal vừa được người khác cập nhật, thử lại.';
  };

  const handleApprove = async (scriptId: string) => {
    if (scriptId.startsWith('scr-job-')) {
      const err = await syncScriptDecisionToDealJob(scriptId, 'APPROVED');
      if (err) {
        onNotify?.(`Chưa duyệt được: ${err}`, 'error');
        return;
      }
      const cntId = `cnt-job-${scriptId.slice('scr-job-'.length)}`;
      setContentItems(prev => prev.map(c => (c.id === cntId ? { ...c, scriptStatus: 'APPROVED' } : c)));
      onNotify?.('Đã duyệt kịch bản vòng 1. Gửi Brand duyệt (vòng 2) trên bảng Deal / Google Sheet.', 'success');
    }
    setScripts(prev => prev.map(item => (item.id === scriptId ? { ...item, status: 'APPROVED', remainingHours: 0 } : item)));
    const targetScript = scripts.find(s => s.id === scriptId);
    if (onScriptApprovedNotification && targetScript) {
      onScriptApprovedNotification(targetScript.dealCode);
    }
  };

  const handleRequestRevision = async (scriptId: string, notes: string) => {
    if (scriptId.startsWith('scr-job-')) {
      const err = await syncScriptDecisionToDealJob(scriptId, 'REVISION_REQUESTED', notes);
      if (err) {
        onNotify?.(`Chưa gửi yêu cầu sửa được: ${err}`, 'error');
        return;
      }
      const cntId = `cnt-job-${scriptId.slice('scr-job-'.length)}`;
      setContentItems(prev =>
        prev.map(c => (c.id === cntId ? { ...c, scriptStatus: 'REVISION_REQUESTED', revisionCount: c.revisionCount + 1 } : c)),
      );
    }
    setScripts(prev =>
      prev.map(item =>
        item.id === scriptId
          ? {
              ...item,
              status: 'REVISION_REQUESTED',
              feedbackNotes: notes,
            }
          : item,
      ),
    );
  };

  return (
    <div className="space-y-4">
      <PageActions>
        <ActionMenu
          label="Tiện ích kịch bản"
          items={[
            { label: 'Rà soát kịch bản & từ cấm', icon: FileText, onSelect: () => setIsScriptReportOpen(true) },
            { label: 'Gợi ý & Soát xét', icon: Lightbulb, onSelect: () => setIsCopilotOpen(true) },
          ]}
        />
        <Button
          size="sm"
          variant="secondary"
          icon={Video}
          onClick={() => {
            setInspectInitialUrl('');
            setIsVideoInspectorOpen(true);
          }}
        >
          Nghiệm thu video
        </Button>
        <Button
          size="sm"
          variant="primary"
          icon={Plus}
          onClick={handleOpenCreateScript}
        >
          Tạo kịch bản / Brief
        </Button>
      </PageActions>

      <Tabs<ContentSubTab>
        value={activeSubTab}
        onChange={setActiveSubTab}
        items={[
          { key: 'BRAND_PLAN', label: 'Plan tháng của Brand' },
          { key: 'CONTENT_PLAN', label: 'Kế hoạch content' },
          { key: 'SELF_CHANNEL_BOARD', label: 'Sản xuất & Nghiệm thu Self-channel' },
          { key: 'CONTENT_ITEMS', label: 'Kho nội dung', count: contentItems.length },
          { key: 'SCRIPTS', label: 'Chờ duyệt kịch bản', count: scripts.filter(s => s.status === 'PENDING').length },
          { key: 'DRAFT_VIDEOS', label: 'Video nháp KOC' },
          { key: 'PUBLICATIONS', label: 'Đối soát bài đăng', count: publications.length },
        ]}
      />

      {activeSubTab === 'BRAND_PLAN' && (
        <BrandMonthlyPlanForm
          currentUserName={currentUserName}
          currentUserRole={currentUserRole}
          onNotify={onNotify}
        />
      )}

      {activeSubTab === 'CONTENT_PLAN' && (
        <ContentPlanBoard
          kocs={kocs}
          deals={deals}
          currentUserName={currentUserName}
          onNotify={onNotify}
        />
      )}

      {activeSubTab === 'SELF_CHANNEL_BOARD' && (
        <PlanSelfChannelBoard
          currentUserName={currentUserName}
          onNotify={onNotify}
        />
      )}

      {/* Kho nội dung */}
      {activeSubTab === 'CONTENT_ITEMS' && (
        <Panel
          flush
          title={`Kho sản phẩm nội dung — Quản trị tách biệt với booking (${filteredContentItems.length}/${contentItems.length})`}
          actions={
            <>
              <Button
                size="sm"
                variant="secondary"
                icon={RefreshCw}
                disabled={isSyncingPlans}
                onClick={() => void handleSyncFromContentPlans()}
              >
                {isSyncingPlans ? 'Đang đồng bộ...' : 'Đồng bộ từ Kế hoạch Content'}
              </Button>
              {onNavigateToAngles && (
                <Button size="sm" variant="secondary" icon={Layers} onClick={onNavigateToAngles}>
                  Hồ sơ Brand & Góc SP
                </Button>
              )}
              <Button size="sm" variant="secondary" icon={Lightbulb} onClick={() => setIsCopilotOpen(true)}>
                Gợi ý & Soát xét
              </Button>
              <Button size="sm" variant="primary" icon={Plus} onClick={handleOpenCreateScript}>
                Soạn kịch bản mới
              </Button>
            </>
          }
        >
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-sunken/30 px-4 py-2.5">
            <Select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} className="max-w-[220px]">
              <option value="ALL">Tất cả Thương hiệu (Brand)</option>
              {profiles.map(p => (
                <option key={p.key} value={p.brandName}>
                  {p.brandName}
                </option>
              ))}
            </Select>
            <Input
              value={filterProduct}
              onChange={e => setFilterProduct(e.target.value)}
              placeholder="Lọc theo Sản phẩm / SKU / Góc tiếp cận / KOC..."
              className="max-w-[320px]"
            />
          </div>
          <div className="divide-y divide-line">
            {filteredContentItems.length === 0 && (
              <div className="px-4 py-10 text-center text-xs text-ink-3">
                Không có nội dung nào khớp bộ lọc. Bấm &ldquo;Đồng bộ từ Kế hoạch Content&rdquo; hoặc &ldquo;Soạn kịch bản mới&rdquo;.
              </div>
            )}
            {filteredContentItems.map((item) => (
              <div key={item.id} className="p-4 sm:p-5 hover:bg-canvas transition space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="font-code text-accent font-semibold text-xs">{item.contentCode}</span>
                    <span className="text-ink-3 text-xs">
                      · BO: <strong className="text-ink font-code">{item.dealCode}</strong>
                    </span>
                    <span className="text-ink font-semibold text-sm">{item.creatorName}</span>
                    <span className="text-2xs text-ink-3">· {item.campaignTitle} · {item.pillar} · {item.format}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {item.reviewMode === 'VETTING_GUARDRAILS' && (
                      <span className="rounded bg-accent-soft px-2 py-0.5 text-2xs font-semibold text-accent">
                        Kiểm duyệt khung ({item.klCode || 'KL6/KL7'})
                      </span>
                    )}
                    <Status tone={item.qcStatus === 'PASS' ? 'positive' : 'warning'}>
                      QC: {item.qcStatus === 'PASS' ? 'Đạt chuẩn xuất bản' : 'Cần thẩm định'}
                    </Status>
                    <span className="text-2xs text-ink-3 tabular-nums">Sửa: {item.revisionCount}/2 lần</span>
                  </div>
                </div>

                <div className="bg-sunken/50 p-3.5 rounded-lg border border-line space-y-1.5 text-xs">
                  <div className="text-ink-2 font-medium">
                    Góc tiếp cận: <strong className="text-ink">{item.angle}</strong>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-2xs">
                    <div>
                      <span className="text-accent font-semibold">Mở đầu:</span>{' '}
                      <span className="text-ink-2">{item.scriptHook}</span>
                    </div>
                    <div>
                      <span className="text-critical font-semibold">Nỗi đau:</span>{' '}
                      <span className="text-ink-2">{item.scriptPainPoint}</span>
                    </div>
                    <div>
                      <span className="text-positive font-semibold">Giải pháp/USP:</span>{' '}
                      <span className="text-ink-2">{item.scriptUsp}</span>
                    </div>
                    <div>
                      <span className="text-ink font-semibold">CTA:</span>{' '}
                      <span className="text-ink-2">{item.scriptCta}</span>
                    </div>
                  </div>
                  {item.qcChecklistNotes && (
                    <div className="pt-2 border-t border-line text-2xs text-positive">
                      <strong>Ghi chú QC:</strong> {item.qcChecklistNotes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Chờ duyệt kịch bản */}
      {activeSubTab === 'SCRIPTS' && (
        <Panel
          flush
          title={`Hàng chờ thẩm định kịch bản KOC (${filteredScripts.length}/${scripts.length})`}
          actions={
            <>
              <Button
                size="sm"
                variant="secondary"
                icon={RefreshCw}
                disabled={isSyncingPlans}
                onClick={() => void handleSyncFromContentPlans()}
              >
                {isSyncingPlans ? 'Đang đồng bộ...' : 'Đồng bộ từ Kế hoạch Content'}
              </Button>
              <Button size="sm" variant="secondary" icon={FileText} onClick={() => setIsScriptReportOpen(true)}>
                Rà soát từ cấm hàng loạt
              </Button>
              <Button size="sm" variant="primary" icon={Plus} onClick={handleOpenCreateScript}>
                Thêm kịch bản chờ duyệt
              </Button>
            </>
          }
        >
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-sunken/30 px-4 py-2.5">
            <Select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} className="max-w-[220px]">
              <option value="ALL">Tất cả Thương hiệu (Brand)</option>
              {profiles.map(p => (
                <option key={p.key} value={p.brandName}>
                  {p.brandName}
                </option>
              ))}
            </Select>
            <Input
              value={filterProduct}
              onChange={e => setFilterProduct(e.target.value)}
              placeholder="Lọc theo Sản phẩm / SKU / Hook / KOC..."
              className="max-w-[320px]"
            />
          </div>
          <div className="divide-y divide-line">
            {filteredScripts.length === 0 && (
              <div className="px-4 py-10 text-center text-xs text-ink-3">
                Không có kịch bản nào khớp bộ lọc.
              </div>
            )}
            {filteredScripts.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedScript(item)}
                className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-canvas transition cursor-pointer group"
              >
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink text-sm group-hover:text-accent transition-colors">
                      {item.kocName}
                    </span>
                    {(item.reviewMode === 'VETTING_GUARDRAILS' || item.kocTier === 'TIER_1_CELEB' || item.kocTier === 'TIER_2_MACRO') && (
                      <span className="rounded bg-accent-soft px-2 py-0.5 text-2xs font-semibold text-accent">
                        Kiểm duyệt theo khung tham số ({item.klCode || 'KL6/KL7'})
                      </span>
                    )}
                    <span className="text-2xs text-ink-3">
                      · {item.campaignTitle} · {item.pillar} · <span className="font-code text-ink-2">{item.dealCode}</span>
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-ink">
                    Mở đầu 3s: &ldquo;{item.hook}&rdquo;
                  </div>
                  <div className="text-xs text-ink-2">
                    USP: {item.solutionAndUsp}
                  </div>
                  <div className="text-2xs text-ink-3 pt-0.5">
                    Nộp bởi: <strong className="text-ink-2">{item.submittedBy}</strong> • {item.submittedAt}
                    {item.feedbackNotes && (
                      <span className="text-warning block mt-1 font-semibold">Ghi chú sửa: {item.feedbackNotes}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {item.status === 'PENDING' ? (
                    <>
                      <Status tone="warning">
                        <Clock className="w-3.5 h-3.5 mr-1 inline" />
                        SLA còn {item.remainingHours}h
                      </Status>
                      <Button
                        size="sm"
                        variant="primary"
                        icon={Eye}
                        onClick={() => setSelectedScript(item)}
                      >
                        Thẩm định kịch bản
                      </Button>
                    </>
                  ) : item.status === 'APPROVED' ? (
                    <Status tone="positive">Đã duyệt</Status>
                  ) : (
                    <Status tone="warning">Cần sửa</Status>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Video nháp KOC */}
      {activeSubTab === 'DRAFT_VIDEOS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-line bg-surface p-4 sm:p-5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-ink text-sm">Chanh Beauty Review — Video nháp 60s UV Test</span>
              <Status tone={approvedDraftVideos.has('DF-VID-1') ? 'positive' : 'warning'}>
                {approvedDraftVideos.has('DF-VID-1') ? 'Đã duyệt lên sóng' : 'Chờ nghiệm thu'}
              </Status>
            </div>
            <div className="aspect-video bg-sunken border border-line rounded-lg flex flex-col items-center justify-center text-ink-2 text-xs p-4 text-center gap-1.5">
              <Video className="w-9 h-9 text-accent opacity-80" />
              <div className="font-semibold text-ink">Video nháp v1: Test Camera UV 8h ngoài trời</div>
              <div className="rounded bg-surface px-2.5 py-1 text-2xs text-ink-2 border border-line">
                #UpBeauty #MegaSale1010 · Đã gắn giỏ hàng
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-ink-2">
                Thời lượng: <strong className="text-ink tabular-nums">62 giây</strong>
              </span>
              {approvedDraftVideos.has('DF-VID-1') ? (
                <Status tone="positive">Đã duyệt lên sóng</Status>
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  icon={CheckCircle}
                  onClick={() => setApprovingDraftVideo('DF-VID-1')}
                >
                  Duyệt video lên sóng
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4 sm:p-5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-ink text-sm">Minh Đan Daily — Video review thu đông</span>
              <Status tone="positive">Đã lên sóng</Status>
            </div>
            <div className="aspect-video bg-sunken border border-line rounded-lg flex flex-col items-center justify-center text-ink-2 text-xs p-4 text-center gap-1.5">
              <Video className="w-9 h-9 text-positive opacity-80" />
              <div className="font-semibold text-ink">TikTok: @danxinhdaily/video/74182910293847</div>
              <div className="rounded bg-surface px-2.5 py-1 text-2xs text-positive font-medium border border-line tabular-nums">
                42.000 lượt xem · GMV: 68.000.000 ₫
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-ink-2">
                Nghiệm thu: <strong className="text-ink">Đạt chỉ tiêu</strong>
              </span>
              <span className="text-xs text-positive font-semibold">Đủ điều kiện tất toán đợt 2</span>
            </div>
          </div>
        </div>
      )}

      {/* Đối soát bài đăng */}
      {activeSubTab === 'PUBLICATIONS' && (
        <Panel
          flush
          title="Bài đăng thực tế & bàn giao mã Spark Ads"
          actions={
            <Button
              size="sm"
              variant="primary"
              icon={Video}
              onClick={() => {
                setInspectInitialUrl('');
                setIsVideoInspectorOpen(true);
              }}
            >
              Kiểm tra & Nghiệm thu link video mới
            </Button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1060px] text-left text-xs border-collapse">
              <thead className="bg-sunken text-ink-3 border-b border-line text-2xs font-medium">
                <tr>
                  <th className="p-3.5 pl-5 w-[220px] min-w-[220px]">Mã & KOC</th>
                  <th className="p-3.5 w-[200px] min-w-[200px]">Link bài đăng & kênh</th>
                  <th className="p-3.5 w-[220px] min-w-[220px]">Mã ủy quyền Spark Ads</th>
                  <th className="p-3.5 w-[140px] min-w-[140px] text-right">Lượt xem / Thích</th>
                  <th className="p-3.5 w-[160px] min-w-[160px] text-right">GMV thực nhận</th>
                  <th className="p-3.5 w-[140px] min-w-[140px] text-right">Hiệu quả</th>
                  <th className="p-3.5 pr-5 text-right w-[160px] min-w-[160px] sm:sticky sm:right-0 sm:z-10 bg-sunken border-l border-line">
                    Đối soát
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {publications.map((pub) => (
                  <tr key={pub.id} className="group hover:bg-canvas transition">
                    <td className="p-3.5 pl-5">
                      <span className="font-mono text-positive font-semibold block text-2xs">{pub.publicationCode}</span>
                      <span className="font-semibold text-ink text-xs">{pub.creatorName}</span>
                      <div className="text-2xs text-ink-3">Mã nội dung: {pub.contentCode}</div>
                    </td>
                    <td className="p-3.5">
                      <a
                        href={pub.platformPostUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-accent hover:underline inline-flex items-center gap-1 text-2xs"
                      >
                        <span>{pub.platform}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <span className="text-2xs text-ink-3 block mt-0.5">Ngày đăng: {pub.publishedAt}</span>
                    </td>
                    <td className="p-3.5 font-mono">
                      {pub.sparkAdsCode ? (
                        <div className="text-2xs font-medium text-ink">
                          {pub.sparkAdsCode} ({pub.sparkAdsExpiryDays} ngày)
                        </div>
                      ) : (
                        <span className="text-2xs text-ink-3">Chưa cấp</span>
                      )}
                      <span className="text-2xs text-ink-3 block mt-0.5">
                        {pub.isMediaHandedOff ? 'Đã bàn giao nhóm Ads' : 'Chưa bàn giao Ads'}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-right tabular-nums">
                      <div className="font-semibold text-ink">{(pub.viewsCount / 1000).toFixed(0)}k xem</div>
                      <div className="text-2xs text-ink-3">{(pub.likesCount / 1000).toFixed(1)}k thích</div>
                    </td>
                    <td className="p-3.5 font-mono text-right tabular-nums">
                      <div className="font-semibold text-positive whitespace-nowrap">
                        {formatVndShort(pub.affiliateGmv)}
                      </div>
                      <div className="text-2xs text-ink-3">{pub.itemsSold} món bán</div>
                    </td>
                    <td className="p-3.5 font-mono text-right tabular-nums">
                      <span className="text-xs font-semibold text-ink">ROI: {pub.roi}x</span>
                      <div className="text-2xs text-ink-3 mt-0.5">CP: {formatVndShort(pub.costAttributed)}</div>
                    </td>
                    <td className="p-3.5 pr-5 text-right sm:sticky sm:right-0 sm:z-10 bg-surface group-hover:bg-canvas border-l border-line">
                      <div className="flex flex-col items-end gap-1">
                        <Status tone="positive">Đã đối soát</Status>
                        <button
                          type="button"
                          onClick={() => {
                            setInspectInitialUrl(pub.platformPostUrl);
                            setIsVideoInspectorOpen(true);
                          }}
                          className="text-2xs font-semibold text-accent hover:underline cursor-pointer"
                        >
                          Kiểm tra lại link
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Script Review Modal */}
      <ScriptReviewModal
        isOpen={!!selectedScript}
        onClose={() => setSelectedScript(null)}
        script={selectedScript}
        onApproveScript={handleApprove}
        onRequestRevision={handleRequestRevision}
      />

      {/* Confirm Approve Draft Video Dialog */}
      <ConfirmDialog
        open={Boolean(approvingDraftVideo)}
        title="Xác nhận phê duyệt video nháp"
        message="Bạn có chắc chắn muốn phê duyệt video nháp này? Trạng thái sẽ được chuyển sang đội ngũ booking để kiểm tra link lên sóng và hoàn tất nghiệm thu hợp đồng."
        confirmLabel="Phê duyệt lên sóng"
        tone="default"
        onCancel={() => setApprovingDraftVideo(null)}
        onConfirm={() => {
          if (approvingDraftVideo) {
            setApprovedDraftVideos(prev => new Set([...prev, approvingDraftVideo]));
            setApprovingDraftVideo(null);
          }
        }}
      />

      <OperationalReportDrawer
        isOpen={isScriptReportOpen}
        onClose={() => setIsScriptReportOpen(false)}
        purposeId="SCRIPT_REVIEW"
        moduleTitle="Báo Cáo Rà Soát Kịch Bản, Từ Cấm Sàn & Tiến Độ Sản Xuất Video"
        contextDataText={[
          `[DỮ LIỆU PHÂN HỆ: Kho Nội Dung, Kịch Bản & Video KOC]`,
          `- Tổng số kịch bản đang theo dõi: ${scripts.length} (Chờ duyệt: ${scripts.filter(s => s.status === 'PENDING').length}, Đã duyệt: ${scripts.filter(s => s.status === 'APPROVED').length}, Yêu cầu sửa: ${scripts.filter(s => s.status === 'REVISION_REQUESTED').length})`,
          ...scripts.slice(0, 6).map(
            s => `- Kịch bản ${s.dealCode} | KOC: ${s.kocName} | Trụ cột: ${s.pillar} | Trạng thái: ${s.status} | SLA còn: ${s.remainingHours}h | Hook 3s: "${s.hook}" | USP: ${s.solutionAndUsp}`
          ),
          ...publications.slice(0, 5).map(
            p => `- Bài đăng ${p.publicationCode} (${p.contentCode}) | KOC: ${p.creatorName} | Kênh: ${p.platform} | Lượt xem: ${p.viewsCount.toLocaleString('vi-VN')} | GMV: ${formatVndShort(p.affiliateGmv)}`
          ),
        ].join('\n')}
      />

      <TikTokVideoInspectorModal
        isOpen={isVideoInspectorOpen}
        onClose={() => setIsVideoInspectorOpen(false)}
        deals={INITIAL_DEALS}
        initialUrl={inspectInitialUrl}
        onAddPublication={(newPub) => {
          setPublications((prev) => [newPub, ...prev]);
        }}
      />

      {/* Hộp thoại Tạo kịch bản / Brief nội dung mới */}
      <Modal
        open={isCreateScriptOpen}
        onClose={() => setIsCreateScriptOpen(false)}
        title="Tạo kịch bản & Brief nội dung mới"
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCreateScriptOpen(false)}>
              Đóng
            </Button>
            <Button
              variant="secondary"
              icon={isGeneratingBrief ? RefreshCw : Lightbulb}
              disabled={isGeneratingBrief}
              onClick={() => void handleAutoSuggestBrief()}
            >
              {isGeneratingBrief ? 'Đang điền mẫu...' : `Điền mẫu kịch bản (${suggestionIdx + 1}/3)`}
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleSaveNewScript('CONTENT_ONLY')}
            >
              Lưu vào Kho nội dung
            </Button>
            <Button
              variant="primary"
              icon={CheckCircle}
              onClick={() => handleSaveNewScript('BOTH')}
            >
              Tạo & đưa vào Hàng chờ duyệt
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Thương hiệu">
              <Select
                value={newBrandName}
                onChange={(e) => {
                  const nextBrand = e.target.value;
                  setNewBrandName(nextBrand);
                  const prof = findBrandProfile(profiles, nextBrand);
                  const firstObj = prof?.products?.[0];
                  const firstProd = firstObj?.name || `${nextBrand} - Sản phẩm trọng tâm`;
                  setNewProductName(firstProd);
                  if (firstObj?.usps?.length) {
                    setNewUsp(firstObj.usps.join(' · '));
                  }
                }}
              >
                {profiles.map((p) => (
                  <option key={p.key} value={p.brandName}>
                    {p.brandName} ({p.contentRules?.banned?.length || 0} từ cấm)
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Sản phẩm (SKU)">
              <Select
                value={newProductName}
                onChange={(e) => {
                  const nextProd = e.target.value;
                  setNewProductName(nextProd);
                  const prodObj = selectedBrandProfile?.products?.find(p => p.name === nextProd);
                  if (prodObj?.usps?.length) {
                    setNewUsp(prodObj.usps.join(' · '));
                  }
                }}
              >
                {brandProductOptions.map((prodName) => (
                  <option key={prodName} value={prodName}>
                    {prodName}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Trụ cột nội dung">
              <Select
                value={newPillar}
                onChange={(e) => setNewPillar(e.target.value)}
              >
                {PILLAR_OPTIONS.map((pil) => (
                  <option key={pil} value={pil}>
                    {pil}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="KOC / Creator thực hiện">
              <Input
                value={newCreatorName}
                onChange={(e) => setNewCreatorName(e.target.value)}
                placeholder="VD: Chanh Beauty, Minh Đan..."
              />
            </Field>

            <Field label="Mã Deal Booking (BO)">
              <Input
                value={newDealCode}
                onChange={(e) => setNewDealCode(e.target.value)}
                placeholder="VD: BO26_CHANH_102"
                className="font-code"
              />
            </Field>

            <Field label="Định dạng quay">
              <Select
                value={newFormat}
                onChange={(e) => setNewFormat(e.target.value)}
              >
                {FORMAT_OPTIONS.map((fmt) => (
                  <option key={fmt} value={fmt}>
                    {fmt}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Cơ chế làm việc theo phân khúc KOC (KL)">
            <Select
              value={newBriefMode}
              onChange={(e) => setNewBriefMode(e.target.value as ContentBriefMode)}
            >
              <option value="DIRECTIVE">Định hướng kịch bản chi tiết (Áp dụng: FOC, Self, KL1–KL5)</option>
              <option value="VETTING_GUARDRAILS">Chỉ giao Tham số kiểm duyệt &amp; Ranh giới Brand (Áp dụng: KL6–KL7, KOL tự lên kịch bản)</option>
            </Select>
          </Field>

          {newBriefMode === 'VETTING_GUARDRAILS' ? (
            <div className="space-y-3 rounded-lg border border-accent/40 bg-accent-soft/20 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-accent">
                  Bộ tham số kiểm duyệt KOL (KL6 / KL7 — Không bắt buộc Hook/Angle định hướng)
                </span>
                <span className="rounded bg-surface px-2 py-0.5 text-2xs font-medium text-ink-2 border border-line">
                  KOL tự sáng tạo kịch bản theo văn phong kênh
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="1. Thông điệp cốt lõi tối thiểu phải nhắc (Key USP)">
                  <Textarea
                    rows={3}
                    value={newUsp}
                    onChange={(e) => setNewUsp(e.target.value)}
                    placeholder="1-2 điểm USP cốt lõi KOL cần nhắc tự nhiên trong video..."
                  />
                </Field>
                <Field label="2. Từ cấm & Ranh giới thương hiệu bắt buộc tránh (Do & Don't)">
                  <Textarea
                    rows={3}
                    value={newPainPoint}
                    onChange={(e) => setNewPainPoint(e.target.value)}
                    placeholder="Từ cấm y tế/sàn, đối thủ cấm nhắc, trang phục/bối cảnh cần tránh..."
                  />
                </Field>
                <Field label="3. Yêu cầu khung hình & Hiện diện sản phẩm tối thiểu">
                  <Textarea
                    rows={3}
                    value={newMandatoryShots}
                    onChange={(e) => setNewMandatoryShots(e.target.value)}
                  />
                </Field>
                <Field label="4. Điều khoản gắn giỏ, Mã Spark Ads & Độc quyền">
                  <Textarea
                    rows={3}
                    value={newRightsGuardrails}
                    onChange={(e) => setNewRightsGuardrails(e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Bản nháp ý tưởng / Outline do KOL gửi (nếu đã có để thẩm định)">
                <Input
                  value={newHook}
                  onChange={(e) => setNewHook(e.target.value)}
                  placeholder="Để trống nếu mới giao khung tham số; hoặc dán Outline của KOL để quét từ cấm..."
                />
              </Field>
            </div>
          ) : (
            <>
              <Field label="Tên góc tiếp cận (Angle)">
                <Input
                  value={newAngleName}
                  onChange={(e) => setNewAngleName(e.target.value)}
                  placeholder="VD: Góc xử lý mẩn ngứa rôm sảy cho bé sau 3 ngày..."
                />
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="1. Mở đầu 3 giây (Hook)">
                  <Textarea
                    rows={3}
                    value={newHook}
                    onChange={(e) => setNewHook(e.target.value)}
                    placeholder="Câu mở đầu giữ chân người xem trong 3 giây đầu..."
                  />
                </Field>

                <Field label="2. Nỗi đau / Tình huống khách hàng">
                  <Textarea
                    rows={3}
                    value={newPainPoint}
                    onChange={(e) => setNewPainPoint(e.target.value)}
                    placeholder="Vấn đề thực tế khách hàng đang gặp phải..."
                  />
                </Field>

                <Field label="3. Giải pháp & Điểm nổi bật (USP)">
                  <Textarea
                    rows={3}
                    value={newUsp}
                    onChange={(e) => setNewUsp(e.target.value)}
                    placeholder="Thành phần, công dụng chính theo hồ sơ thương hiệu..."
                  />
                </Field>

                <Field label="4. Điều hướng giỏ hàng & Khuyến cáo (CTA)">
                  <Textarea
                    rows={3}
                    value={newCta}
                    onChange={(e) => setNewCta(e.target.value)}
                    placeholder="Kêu gọi bấm giỏ hàng kèm câu khuyến cáo pháp lý (nếu có)..."
                  />
                </Field>
              </div>
            </>
          )}

          {draftCompliance && (
            <div
              className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                draftCompliance.complianceStatus === 'FAIL'
                  ? 'bg-critical-soft/40 border-critical/40 text-critical'
                  : draftCompliance.complianceStatus === 'WARNING'
                    ? 'bg-warning-soft/40 border-warning/40 text-ink'
                    : 'bg-positive-soft/40 border-positive/40 text-positive'
              }`}
            >
              <div className="flex items-center justify-between gap-2 font-semibold">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Đối chiếu quy chuẩn {newBrandName}: {draftCompliance.overallScore}/100 điểm</span>
                </span>
                <span>{draftCompliance.complianceStatus === 'PASS' ? 'Đạt chuẩn' : 'Cần sửa'}</span>
              </div>
              <div>{draftCompliance.summaryVerdict}</div>
              {draftCompliance.issues.length > 0 && (
                <ul className="list-disc pl-4 space-y-0.5 text-2xs">
                  {draftCompliance.issues.slice(0, 3).map((iss) => (
                    <li key={iss.id}>
                      <strong>{iss.title}:</strong> {iss.rationale}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </Modal>

      <ContentCopilotModal
        open={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        brandName={newBrandName}
        productName={newProductName}
        initialPillar={newPillar}
        initialScript={`${newHook}\n${newPainPoint}\n${newUsp}\n${newCta}`.trim()}
        onApplyAngle={data => {
          setNewAngleName(data.angleName);
          setNewHook(data.hook);
          setNewPainPoint(data.painPoint);
          setNewUsp(data.usp);
          setNewCta(data.cta);
          setIsCreateScriptOpen(true);
        }}
        onNotify={onNotify}
      />
    </div>
  );
};
