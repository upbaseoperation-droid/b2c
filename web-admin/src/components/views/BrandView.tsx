'use client';

import React, { useState, useMemo } from 'react';
import { formatVndShort } from '../../lib/format';
import { Tabs, PageActions, Button, Presence, BrandAvatar, Modal, SearchInput, Segmented } from '../ui';
import {
  Target,
  ArrowRight,
  CheckCircle2,
  Send,
  DollarSign,
  TrendingUp,
  Users,
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  FileText,
  Search,
  Plus,
  Trash2,
  Copy,
  Check,
  Clock,
  ExternalLink,
  Building,
  Flame,
  X,
  Video,
  FolderOpen,
  Calendar,
  Layers,
  Palette,
  Edit3,
  Table as TableIcon,
  LayoutGrid,
  Eye,
} from 'lucide-react';
import {
  CampaignItem,
  BrandGuidelineAsset,
  BrandApprovalQueueItem,
  BrandRetainerHealth,
  BlacklistKeyword,
  BlacklistSeverity,
  AiScriptAnalysisResult,
  getCoveredMonthsFromRange,
  isCampaignActiveInMonth,
} from '../../lib/types';
import {
  INITIAL_CAMPAIGNS,
  INITIAL_BRAND_GUIDELINES,
  INITIAL_BRAND_APPROVAL_QUEUE,
  INITIAL_BRAND_RETAINER_HEALTH,
  INITIAL_BRAND_KNOWLEDGE_BASES
} from '../../lib/mockData';
import { analyzeScriptWithAi } from '../../lib/aiScriptAnalyzer';
import { CampaignCreateModal } from '../CampaignCreateModal';
import { REAL_B2C_42_BRANDS } from '../../lib/realB2cBrandsData';
import {
  useBrandProfiles,
  findBrandProfile,
  getBrandRatecardCeiling,
  brandProfileToKnowledgeBase,
} from '../../lib/brands/useBrandProfiles';

interface BrandViewProps {
  campaigns?: CampaignItem[];
  onCampaignsChange?: React.Dispatch<React.SetStateAction<CampaignItem[]>>;
  onCampaignCreatedNotification?: (campaign: CampaignItem) => void;
  onTriggerHandoffNotification?: (campaignTitle: string) => void;
  onNavigateToCtvHub?: () => void;
  onNavigateToBrandKnowledge?: (brandName?: string) => void;
}

type BrandViewTab = 'BRIEF_STUDIO' | 'GUIDELINE_HUB' | 'APPROVAL_GATE' | 'RETAINER_HEALTH';

export const BrandView: React.FC<BrandViewProps> = ({
  campaigns: externalCampaigns,
  onCampaignsChange,
  onCampaignCreatedNotification,
  onTriggerHandoffNotification,
  onNavigateToCtvHub,
  onNavigateToBrandKnowledge,
}) => {
  const { profiles, saveSection } = useBrandProfiles();

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<BrandViewTab>('BRIEF_STUDIO');

  // Tab 1: Campaign & Brief State (supports lifted state from page.tsx or local fallback)
  const [localCampaigns, setLocalCampaigns] = useState<CampaignItem[]>(INITIAL_CAMPAIGNS);
  const campaigns = externalCampaigns ?? localCampaigns;
  const setCampaigns: React.Dispatch<React.SetStateAction<CampaignItem[]>> =
    onCampaignsChange ?? setLocalCampaigns;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampaignItem | null>(null);
  const [defaultBrandForModal, setDefaultBrandForModal] = useState<string | undefined>(undefined);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'ACTIVE' | 'UPCOMING' | 'DRAFT'>('ALL');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<'ALL' | '2026/09' | '2026/10' | '2026/11'>('2026/10');
  const [durationFilter, setDurationFilter] = useState<'ALL' | 'SINGLE_MONTH' | 'MULTI_MONTH'>('ALL');
  const [showCoverageMatrix, setShowCoverageMatrix] = useState<boolean>(false);
  const [searchCampaign, setSearchCampaign] = useState('');
  const [handoffSuccessModal, setHandoffSuccessModal] = useState<CampaignItem | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [detailedCampaignModal, setDetailedCampaignModal] = useState<CampaignItem | null>(null);

  // Tab 2: Brand Guideline & Asset State — Synchronized with live BrandProfile API (/api/brands/profiles)
  const [localGuidelinesFallback, setLocalGuidelinesFallback] = useState<BrandGuidelineAsset[]>(INITIAL_BRAND_GUIDELINES);
  const [selectedBrandName, setSelectedBrandName] = useState<string>(
    INITIAL_BRAND_GUIDELINES[0]?.brandName || 'ClubClio'
  );
  const [brandSearchFilter, setBrandSearchFilter] = useState('');
  const [keywordSearch, setKeywordSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | BlacklistSeverity>('ALL');
  const [isAddKeywordModalOpen, setIsAddKeywordModalOpen] = useState(false);
  const [copiedKeywordId, setCopiedKeywordId] = useState<string | null>(null);

  const guidelines: BrandGuidelineAsset[] = useMemo(() => {
    if (!profiles || profiles.length === 0) return localGuidelinesFallback;
    return profiles.map((p) => {
      const realBrand = REAL_B2C_42_BRANDS.find(
        (b) => b.name.toLowerCase() === p.brandName.toLowerCase()
      );
      const staticGuide = localGuidelinesFallback.find(
        (g) => g.brandName.toLowerCase() === p.brandName.toLowerCase()
      );
      const mappedKeywords: BlacklistKeyword[] = (p.contentRules?.banned || []).map((b, idx) => ({
        id: `live-bl-${p.brandName}-${idx}`,
        keyword: b.phrase,
        category: 'LEGAL_MEDICAL',
        severity: 'CRITICAL_BANNED',
        rationale: b.reason || 'Từ ngữ bị hạn chế theo hồ sơ pháp lý thương hiệu.',
        alternativeSuggestion: b.replacement || undefined,
        addedBy: p.updatedBy || 'Phụ trách thương hiệu',
        addedAt: new Date(p.updatedAt).toLocaleDateString('vi-VN'),
      }));

      return {
        id: `guide-${p.brandName}`,
        brandName: p.brandName,
        category: realBrand?.category || staticGuide?.category || 'Chăm sóc & Làm đẹp B2C',
        colorTheme: staticGuide?.colorTheme || '#1e40af',
        toneOfVoice: p.positioning?.toneOfVoice || staticGuide?.toneOfVoice || 'Chuyên nghiệp, bám sát lợi điểm sản phẩm và trải nghiệm thực tế.',
        toneTag: staticGuide?.toneTag || 'BÁC_SĨ_CHUYÊN_GIA',
        visualDoList: (p.contentRules?.visualDo && p.contentRules.visualDo.length > 0)
          ? p.contentRules.visualDo
          : (staticGuide?.visualDoList || []),
        visualDontList: (p.contentRules?.visualDont && p.contentRules.visualDont.length > 0)
          ? p.contentRules.visualDont
          : (staticGuide?.visualDontList || []),
        logoRules: p.legal?.[0]?.disclaimer || staticGuide?.logoRules || 'Hiển thị rõ bao bì sản phẩm chính hãng, không che khuất tên thương hiệu.',
        blacklistKeywords: mappedKeywords.length > 0 ? mappedKeywords : (staticGuide?.blacklistKeywords || []),
        heroSkus: (p.products && p.products.length > 0)
          ? p.products.map((prod, idx) => ({
              id: prod.id || `sku-${p.brandName}-${idx}`,
              skuCode: prod.skuCode || `SKU-${idx + 1}`,
              name: prod.name,
              category: realBrand?.category || 'Sản phẩm chủ lực',
              priceVnd: prod.priceVnd || 0,
              uspBulletPoints: prod.usps || [],
              clinicalClaims: prod.ingredients?.join(', ') || undefined,
              sampleStockCount: 30,
              pdpUrl: prod.pdpUrl || 'https://shopee.vn',
            }))
          : (staticGuide?.heroSkus || []),
      };
    });
  }, [profiles, localGuidelinesFallback]);

  const currentProfile = useMemo(
    () => findBrandProfile(profiles, selectedBrandName),
    [profiles, selectedBrandName]
  );

  // New Keyword Form
  const [newKeywordText, setNewKeywordText] = useState('');
  const [newKeywordCategory, setNewKeywordCategory] = useState<'LEGAL_MEDICAL' | 'COMPETITOR' | 'SENSITIVE_POLICY'>('LEGAL_MEDICAL');
  const [newKeywordSeverity, setNewKeywordSeverity] = useState<BlacklistSeverity>('CRITICAL_BANNED');
  const [newKeywordRationale, setNewKeywordRationale] = useState('');
  const [newKeywordAlt, setNewKeywordAlt] = useState('');

  // Tab 3: Brand Approval State
  const [approvalQueue, setApprovalQueue] = useState<BrandApprovalQueueItem[]>(INITIAL_BRAND_APPROVAL_QUEUE);
  const [approvalSubTab, setApprovalSubTab] = useState<'ROUND_1_KOC' | 'ROUND_2_SCRIPT'>('ROUND_1_KOC');
  const [rejectModalItem, setRejectModalItem] = useState<BrandApprovalQueueItem | null>(null);
  const [rejectReasonSelection, setRejectReasonSelection] = useState<string>('Lệch định vị phong cách thương hiệu');
  const [rejectCustomNote, setRejectCustomNote] = useState('');

  // Script Check Modal in Approval Gate
  const [aiScanModalData, setAiScanModalData] = useState<{
    item: BrandApprovalQueueItem;
    result: AiScriptAnalysisResult;
  } | null>(null);

  const handleAiInspectScript = (item: BrandApprovalQueueItem) => {
    if (!item.scriptContent) return;
    const matchedProfile = findBrandProfile(profiles, item.brandName);
    const brandKb = matchedProfile
      ? brandProfileToKnowledgeBase(matchedProfile)
      : (INITIAL_BRAND_KNOWLEDGE_BASES.find(b => b.brandName.toLowerCase().includes(item.brandName.toLowerCase())) || INITIAL_BRAND_KNOWLEDGE_BASES[0]);
    const fullText = `${item.scriptContent.hook}\n${item.scriptContent.pain}\n${item.scriptContent.usp}\n${item.scriptContent.cta}`;
    const result = analyzeScriptWithAi(fullText, brandKb);
    setAiScanModalData({ item, result });
  };

  // Tab 4: Retainer Health State
  const [retainerHealthList] = useState<BrandRetainerHealth[]>(INITIAL_BRAND_RETAINER_HEALTH);

  // Active Selected Guideline
  const currentGuideline = useMemo(() => {
    return guidelines.find(g => g.brandName === selectedBrandName) || guidelines[0];
  }, [guidelines, selectedBrandName]);

  // ----------------------------------------------------
  // HANDLERS FOR CAMPAIGNS & BRIEF
  // ----------------------------------------------------
  const handleCreateCampaign = (savedCamp: CampaignItem) => {
    setCampaigns(prev => {
      const exists = prev.some(c => c.id === savedCamp.id);
      if (exists) {
        return prev.map(c => (c.id === savedCamp.id ? savedCamp : c));
      }
      return [savedCamp, ...prev];
    });
    setEditingCampaign(null);
    setDefaultBrandForModal(undefined);
    if (onCampaignCreatedNotification) onCampaignCreatedNotification(savedCamp);
  };

  const handleOpenCreateModal = (forBrandName?: string) => {
    setEditingCampaign(null);
    setDefaultBrandForModal(forBrandName);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (camp: CampaignItem) => {
    setEditingCampaign(camp);
    setDefaultBrandForModal(camp.brand);
    setIsCreateModalOpen(true);
  };

  const handleHandoff = (campId: string) => {
    setCampaigns(prev => prev.map(c => c.id === campId ? {
      ...c,
      briefStatus: 'HANDED_OFF_TO_CONTENT',
      handoffAt: new Date().toISOString(),
      handoffSlaHours: 24,
      contentPic: c.contentPic || 'Quỳnh Như'
    } : c));
    const targetCamp = campaigns.find(c => c.id === campId);
    if (targetCamp) {
      setHandoffSuccessModal(targetCamp);
      if (onTriggerHandoffNotification) {
        onTriggerHandoffNotification(targetCamp.title);
      }
    }
  };

  // ----------------------------------------------------
  // HANDLERS FOR KEYWORDS & ASSETS (Synced with /api/brands/profiles)
  // ----------------------------------------------------
  const handleCopySuggestion = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeywordId(id);
    setTimeout(() => setCopiedKeywordId(null), 2000);
  };

  const handleDeleteKeyword = async (brandId: string, keywordId: string) => {
    const targetKw = currentGuideline?.blacklistKeywords.find(k => k.id === keywordId);
    if (currentProfile && targetKw) {
      const nextBanned = (currentProfile.contentRules?.banned || []).filter(
        b => b.phrase.toLowerCase() !== targetKw.keyword.toLowerCase()
      );
      try {
        await saveSection({
          brandName: currentProfile.brandName,
          revision: currentProfile.revision,
          section: 'CONTENT_RULES',
          data: {
            ...currentProfile.contentRules,
            banned: nextBanned,
          },
        });
        return;
      } catch {
        // Fallback to local state if API save fails
      }
    }

    setLocalGuidelinesFallback(prev => prev.map(g => {
      if (g.id === brandId) {
        return {
          ...g,
          blacklistKeywords: g.blacklistKeywords.filter(k => k.id !== keywordId)
        };
      }
      return g;
    }));
  };

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeywordText.trim()) return;

    const phrase = newKeywordText.trim();
    const reason = newKeywordRationale || 'Quy chuẩn bảo vệ thương hiệu nội bộ Upbase.';
    const alternative = newKeywordAlt.trim() || 'Dùng từ mô tả trải nghiệm thực tế, không cam kết tuyệt đối';

    if (currentProfile) {
      try {
        await saveSection({
          brandName: currentProfile.brandName,
          revision: currentProfile.revision,
          section: 'CONTENT_RULES',
          data: {
            ...currentProfile.contentRules,
            banned: [
              { id: `bl-${Date.now()}`, phrase, reason, replacement: alternative },
              ...(currentProfile.contentRules?.banned || []),
            ],
          },
        });
      } catch {
        // Fallback to local state if API fails
      }
    } else {
      const newKw: BlacklistKeyword = {
        id: `bl-custom-${Date.now()}`,
        keyword: phrase,
        category: newKeywordCategory,
        severity: newKeywordSeverity,
        rationale: reason,
        alternativeSuggestion: alternative,
        addedBy: 'Phụ trách thương hiệu',
        addedAt: new Date().toLocaleDateString('vi-VN')
      };

      setLocalGuidelinesFallback(prev => prev.map(g => {
        if (g.brandName === selectedBrandName) {
          return {
            ...g,
            blacklistKeywords: [newKw, ...g.blacklistKeywords]
          };
        }
        return g;
      }));
    }

    // Reset Form
    setNewKeywordText('');
    setNewKeywordRationale('');
    setNewKeywordAlt('');
    setIsAddKeywordModalOpen(false);
  };

  // ----------------------------------------------------
  // HANDLERS FOR APPROVAL GATE
  // ----------------------------------------------------
  const handleApproveItem = (itemId: string) => {
    setApprovalQueue(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, status: 'APPROVED' };
      }
      return item;
    }));
  };

  const handleConfirmReject = () => {
    if (!rejectModalItem) return;
    const finalReason = rejectCustomNote.trim()
      ? `${rejectReasonSelection}: ${rejectCustomNote.trim()}`
      : rejectReasonSelection;

    setApprovalQueue(prev => prev.map(item => {
      if (item.id === rejectModalItem.id) {
        return {
          ...item,
          status: 'REJECTED',
          rejectReason: finalReason
        };
      }
      return item;
    }));

    setRejectModalItem(null);
    setRejectCustomNote('');
  };

  // ----------------------------------------------------
  // CALCULATIONS & METRICS (Memoized for high performance)
  // ----------------------------------------------------
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      const matchStatus = selectedFilter === 'ALL'
        || (selectedFilter === 'ACTIVE' && c.status === 'ACTIVE')
        || (selectedFilter === 'UPCOMING' && c.status === 'UPCOMING')
        || (selectedFilter === 'DRAFT' && c.briefStatus === 'DRAFT');

      const matchMonth = selectedMonthFilter === 'ALL' || isCampaignActiveInMonth(c, selectedMonthFilter);

      const covered = c.coveredMonths && c.coveredMonths.length > 0
        ? c.coveredMonths
        : getCoveredMonthsFromRange(c.startDate, c.endDate);
      const matchDuration =
        durationFilter === 'ALL' ||
        (durationFilter === 'SINGLE_MONTH' && covered.length <= 1) ||
        (durationFilter === 'MULTI_MONTH' && covered.length >= 2);

      const matchSearch = !searchCampaign.trim()
        || c.title.toLowerCase().includes(searchCampaign.toLowerCase())
        || c.code.toLowerCase().includes(searchCampaign.toLowerCase())
        || c.brand.toLowerCase().includes(searchCampaign.toLowerCase());

      return matchStatus && matchMonth && matchDuration && matchSearch;
    });
  }, [campaigns, selectedFilter, selectedMonthFilter, durationFilter, searchCampaign]);

  const multiMonthCampaignsCount = useMemo(
    () =>
      campaigns.filter(c => {
        const covered = c.coveredMonths && c.coveredMonths.length > 0
          ? c.coveredMonths
          : getCoveredMonthsFromRange(c.startDate, c.endDate);
        return covered.length >= 2;
      }).length,
    [campaigns]
  );

  // Đối soát Brand CÓ Campaign vs Brand KHÔNG có Campaign (Duy trì / Always-on) trong tháng đang chọn
  const brandCoverageForMonth = useMemo(() => {
    const targetMonth = selectedMonthFilter === 'ALL' ? '2026/10' : selectedMonthFilter;
    const withCampaign: { brandName: string; campaign: CampaignItem }[] = [];
    const withoutCampaign: string[] = [];

    const allBrands = Array.from(
      new Set([
        ...campaigns.map(c => c.brand),
        ...REAL_B2C_42_BRANDS.slice(0, 18).map(b => b.name),
      ])
    );

    for (const brandName of allBrands) {
      const normB = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const activeCamp = campaigns.find(c => {
        const normC = c.brand.toLowerCase().replace(/[^a-z0-9]/g, '');
        const matchB = normB === normC || normB.includes(normC) || normC.includes(normB);
        return matchB && isCampaignActiveInMonth(c, targetMonth);
      });
      if (activeCamp) {
        withCampaign.push({ brandName, campaign: activeCamp });
      } else {
        withoutCampaign.push(brandName);
      }
    }

    return { targetMonth, withCampaign, withoutCampaign };
  }, [campaigns, selectedMonthFilter]);

  const totalCampaignBudget = useMemo(() => filteredCampaigns.reduce((sum, c) => sum + (c.budget || 0), 0), [filteredCampaigns]);
  const totalCampaignGmv = useMemo(() => filteredCampaigns.reduce((sum, c) => sum + (c.currentGmv || 0), 0), [filteredCampaigns]);
  const activeCampaignsCount = useMemo(() => campaigns.filter(c => c.status === 'ACTIVE').length, [campaigns]);

  const filteredKeywords = useMemo(() => {
    return (currentGuideline?.blacklistKeywords || []).filter(k => {
      const matchSeverity = severityFilter === 'ALL' || k.severity === severityFilter;
      const matchSearch = !keywordSearch.trim()
        || k.keyword.toLowerCase().includes(keywordSearch.toLowerCase())
        || k.rationale.toLowerCase().includes(keywordSearch.toLowerCase())
        || (k.alternativeSuggestion && k.alternativeSuggestion.toLowerCase().includes(keywordSearch.toLowerCase()));
      return matchSeverity && matchSearch;
    });
  }, [currentGuideline?.blacklistKeywords, severityFilter, keywordSearch]);

  const pendingApprovals = useMemo(() => approvalQueue.filter(i => i.status === 'PENDING'), [approvalQueue]);
  const pendingKocCount = useMemo(() => pendingApprovals.filter(i => i.submissionRound === 'ROUND_1_KOC').length, [pendingApprovals]);
  const pendingScriptCount = useMemo(() => pendingApprovals.filter(i => i.submissionRound === 'ROUND_2_SCRIPT').length, [pendingApprovals]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageActions>
        <Button variant="primary" icon={Plus} onClick={() => handleOpenCreateModal()}>
          Khởi tạo Chiến dịch (Campaign)
        </Button>
      </PageActions>

      {/* TOP WORKSPACE NAVIGATION TABS */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs<BrandViewTab>
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'BRIEF_STUDIO', label: 'Quản trị Chiến dịch (Campaign) & Brief', count: campaigns.length },
            { key: 'APPROVAL_GATE', label: 'Thẩm định KOC & kịch bản', count: pendingApprovals.length || undefined },
          ]}
        />

        {onNavigateToCtvHub && (
          <button
            onClick={onNavigateToCtvHub}
            className="px-3.5 py-2 text-xs font-semibold rounded-md transition flex items-center gap-1.5 whitespace-nowrap bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 shrink-0"
            title="Mở danh sách cộng tác viên sản xuất video kênh tự xây"
          >
            <Video className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cộng tác viên kênh tự xây</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: QUẢN TRỊ THỰC THỂ CHIẾN DỊCH (CAMPAIGN 1–3 THÁNG) & BRIEF         */}
      {/* ========================================================================= */}
      {activeTab === 'BRIEF_STUDIO' && (
        <div className="space-y-5">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card-enterprise p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xs text-slate-500 font-medium">Tổng số Chiến dịch (Campaign)</p>
                <p className="text-lg font-semibold text-slate-900">
                  {filteredCampaigns.length} <span className="text-xs font-normal text-slate-500">({activeCampaignsCount} đang chạy)</span>
                </p>
              </div>
            </div>

            <div className="card-enterprise p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-accent-soft text-accent flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xs text-slate-500 font-medium">Chiến dịch liên tháng (2–3 tháng)</p>
                <p className="text-lg font-semibold text-accent">
                  {multiMonthCampaignsCount} / {campaigns.length} chiến dịch
                </p>
              </div>
            </div>

            <div className="card-enterprise p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xs text-slate-500 font-medium">Tổng ngân sách Chiến dịch</p>
                <p className="text-lg font-semibold text-slate-900">{formatVndShort(totalCampaignBudget)}</p>
              </div>
            </div>

            <div className="card-enterprise p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-accent-soft text-accent flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xs text-slate-500 font-medium">GMV Chiến dịch đã ghi nhận</p>
                <p className="text-lg font-semibold text-accent">{formatVndShort(totalCampaignGmv)}</p>
              </div>
            </div>
          </div>

          {/* Unified Compact Toolbar: Search + Filters + Mode Toggle */}
          <div className="bg-surface p-3 rounded-xl border border-line flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            {/* Left controls */}
            <div className="flex flex-wrap items-center gap-2.5 min-w-0">
              <SearchInput
                value={searchCampaign}
                onChange={setSearchCampaign}
                placeholder="Tìm mã, chiến dịch, thương hiệu..."
                className="w-full sm:w-64"
              />

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-ink-3 text-2xs font-medium">Tháng:</span>
                <select
                  value={selectedMonthFilter}
                  onChange={(e) => setSelectedMonthFilter(e.target.value as 'ALL' | '2026/09' | '2026/10' | '2026/11')}
                  className="h-8 px-2 rounded-md bg-sunken border border-line text-xs font-medium text-ink focus:outline-none focus:border-accent"
                >
                  <option value="ALL">Tất cả các tháng</option>
                  <option value="2026/09">Tháng 09/2026</option>
                  <option value="2026/10">Tháng 10/2026 (Hiện tại)</option>
                  <option value="2026/11">Tháng 11/2026</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-ink-3 text-2xs font-medium">Quy mô:</span>
                <select
                  value={durationFilter}
                  onChange={(e) => setDurationFilter(e.target.value as 'ALL' | 'SINGLE_MONTH' | 'MULTI_MONTH')}
                  className="h-8 px-2 rounded-md bg-sunken border border-line text-xs font-medium text-ink focus:outline-none focus:border-accent"
                >
                  <option value="ALL">Tất cả quy mô</option>
                  <option value="SINGLE_MONTH">1 Tháng (Ngắn hạn)</option>
                  <option value="MULTI_MONTH">Liên tháng (2–3 tháng)</option>
                </select>
              </div>

              <Segmented
                items={[
                  { key: 'ALL', label: 'Tất cả' },
                  { key: 'ACTIVE', label: 'Đang chạy' },
                  { key: 'UPCOMING', label: 'Kế hoạch' },
                  { key: 'DRAFT', label: 'Brief nháp' },
                ]}
                value={selectedFilter}
                onChange={(k) => setSelectedFilter(k as 'ALL' | 'ACTIVE' | 'UPCOMING' | 'DRAFT')}
              />
            </div>

            {/* Right controls: Coverage Matrix toggle + View Mode toggle */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowCoverageMatrix(v => !v)}
                className={`h-8 px-2.5 rounded-md text-xs font-medium border transition cursor-pointer flex items-center gap-1.5 ${
                  showCoverageMatrix
                    ? 'bg-accent-soft text-accent border-accent/30 font-semibold'
                    : 'bg-surface text-ink-2 border-line hover:text-ink hover:bg-sunken'
                }`}
                title="Bật/tắt đối soát thương hiệu có hoặc không có chiến dịch"
              >
                <Building className="w-3.5 h-3.5" />
                <span>Đối soát Brand</span>
                <span className="text-2xs px-1.5 py-0.5 rounded-full bg-sunken text-ink font-semibold">
                  {brandCoverageForMonth.withCampaign.length}/{brandCoverageForMonth.withCampaign.length + brandCoverageForMonth.withoutCampaign.length}
                </span>
              </button>

              <div className="flex items-center p-0.5 rounded-md bg-sunken border border-line">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded transition ${
                    viewMode === 'table' ? 'bg-surface text-ink shadow-2xs font-semibold' : 'text-ink-3 hover:text-ink'
                  }`}
                  title="Xem dạng Bảng"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded transition ${
                    viewMode === 'grid' ? 'bg-surface text-ink shadow-2xs font-semibold' : 'text-ink-3 hover:text-ink'
                  }`}
                  title="Xem dạng Lưới"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Bảng Đối Soát Thương Hiệu Có Campaign vs Không Có Campaign (Mặc định ẩn) */}
          {showCoverageMatrix && (
            <div className="p-4 rounded-xl border border-line bg-sunken/40 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between gap-2 border-b border-line pb-2">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-accent" />
                  <h4 className="text-xs font-semibold text-ink">
                    Đối soát trạng thái Chiến dịch theo Thương hiệu — Chu kỳ {brandCoverageForMonth.targetMonth}
                  </h4>
                  <span className="text-2xs font-medium text-positive">
                    ({brandCoverageForMonth.withCampaign.length} Brand CÓ Chiến dịch
                  </span>
                  <span className="text-2xs font-medium text-ink-3">
                    · {brandCoverageForMonth.withoutCampaign.length} Brand Duy trì)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCoverageMatrix(false)}
                  className="text-ink-3 hover:text-ink p-1 rounded transition cursor-pointer"
                  title="Đóng bảng đối soát"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Cột 1: Brand CÓ Campaign trong tháng */}
                <div className="p-3 bg-surface rounded-lg border border-line space-y-2">
                  <div className="flex items-center justify-between border-b border-line pb-1.5">
                    <span className="font-semibold text-positive text-2xs">
                      Đang có chiến dịch ({brandCoverageForMonth.withCampaign.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {brandCoverageForMonth.withCampaign.map(({ brandName, campaign }) => {
                      const covered = campaign.coveredMonths || getCoveredMonthsFromRange(campaign.startDate, campaign.endDate);
                      return (
                        <button
                          key={brandName}
                          type="button"
                          onClick={() => setDetailedCampaignModal(campaign)}
                          className="px-2 py-1 rounded bg-positive-soft/50 hover:bg-positive-soft border border-positive/30 text-ink font-medium text-2xs flex items-center gap-1.5 transition cursor-pointer"
                          title={`Xem chi tiết ${campaign.title}`}
                        >
                          <BrandAvatar name={brandName} size={14} rounded="sm" />
                          <span>{brandName}</span>
                          <span className="text-ink-3 font-code text-3xs">
                            · {campaign.code} ({covered.length}T)
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cột 2: Brand KHÔNG CÓ Campaign trong tháng */}
                <div className="p-3 bg-surface rounded-lg border border-line space-y-2">
                  <div className="flex items-center justify-between border-b border-line pb-1.5">
                    <span className="font-semibold text-ink-2 text-2xs">
                      Duy trì thường nhật ({brandCoverageForMonth.withoutCampaign.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {brandCoverageForMonth.withoutCampaign.map(brandName => (
                      <button
                        key={brandName}
                        type="button"
                        onClick={() => handleOpenCreateModal(brandName)}
                        className="px-2 py-1 rounded bg-sunken hover:bg-accent-soft hover:text-accent border border-line text-ink-2 text-2xs flex items-center gap-1 transition cursor-pointer"
                        title="Bấm để khởi tạo chiến dịch mới cho brand này"
                      >
                        <BrandAvatar name={brandName} size={14} rounded="sm" />
                        <span>{brandName}</span>
                        <span className="text-3xs text-ink-3">+ Tạo</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CHẾ ĐỘ XEM: BẢNG (TABLE VIEW) */}
          {viewMode === 'table' ? (
            <div className="bg-surface rounded-xl border border-line overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-sunken/40 border-b border-line text-ink-3 font-semibold text-2xs">
                      <th className="py-2.5 px-3">Mã & Chiến dịch</th>
                      <th className="py-2.5 px-3">Thương hiệu</th>
                      <th className="py-2.5 px-3">Thời gian</th>
                      <th className="py-2.5 px-3">Ngân sách</th>
                      <th className="py-2.5 px-3">Mục tiêu GMV</th>
                      <th className="py-2.5 px-3">CIR</th>
                      <th className="py-2.5 px-3">Trạng thái</th>
                      <th className="py-2.5 px-3">Bàn giao nội dung</th>
                      <th className="py-2.5 px-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredCampaigns.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-ink-3">
                          Không tìm thấy chiến dịch nào phù hợp với bộ lọc.
                        </td>
                      </tr>
                    ) : (
                      filteredCampaigns.map((c) => {
                        const budgetPercent = Math.min(100, Math.round((c.spentBudget / (c.budget || 1)) * 100));
                        const gmvPercent = Math.min(100, Math.round((c.currentGmv / (c.targetGmv || 1)) * 100));
                        const coveredMonths = c.coveredMonths && c.coveredMonths.length > 0
                          ? c.coveredMonths
                          : getCoveredMonthsFromRange(c.startDate, c.endDate);
                        const isMultiMonth = coveredMonths.length >= 2;

                        return (
                          <tr key={c.id} className="hover:bg-canvas transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="font-code font-semibold text-accent text-2xs">{c.code}</div>
                              <div className="font-medium text-ink max-w-[220px] truncate" title={c.title}>
                                {c.title}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 font-medium text-ink">
                                <BrandAvatar name={c.brand} size={18} rounded="sm" />
                                <span>{c.brand}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div className="text-2xs text-ink-2 font-medium">{c.startDate} → {c.endDate}</div>
                              <span className={`inline-block text-3xs px-1.5 py-0.5 rounded font-medium mt-0.5 ${
                                isMultiMonth ? 'bg-accent-soft text-accent' : 'bg-sunken text-ink-3'
                              }`}>
                                {isMultiMonth ? `Liên tháng (${coveredMonths.length}T)` : '1 tháng'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap min-w-[130px]">
                              <div className="flex items-center justify-between text-2xs mb-1">
                                <span className="font-medium text-ink">{formatVndShort(c.spentBudget)}</span>
                                <span className="text-ink-3 text-3xs">/ {formatVndShort(c.budget)} ({budgetPercent}%)</span>
                              </div>
                              <div className="w-full h-1.5 bg-sunken rounded-full overflow-hidden">
                                <div className="h-full bg-accent rounded-full" style={{ width: `${budgetPercent}%` }} />
                              </div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap min-w-[130px]">
                              <div className="flex items-center justify-between text-2xs mb-1">
                                <span className="font-medium text-positive">{formatVndShort(c.currentGmv)}</span>
                                <span className="text-ink-3 text-3xs">/ {formatVndShort(c.targetGmv)} ({gmvPercent}%)</span>
                              </div>
                              <div className="w-full h-1.5 bg-sunken rounded-full overflow-hidden">
                                <div className="h-full bg-positive rounded-full" style={{ width: `${gmvPercent}%` }} />
                              </div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="font-semibold text-accent text-xs">
                                {c.targetCir ? `${c.targetCir}%` : '—'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold ${
                                c.status === 'ACTIVE'
                                  ? 'bg-positive-soft text-positive'
                                  : c.status === 'COMPLETED'
                                    ? 'bg-sunken text-ink-2'
                                    : 'bg-warning-soft text-warning'
                              }`}>
                                {c.status === 'ACTIVE' ? 'Đang chạy' : c.status === 'COMPLETED' ? 'Hoàn thành' : 'Kế hoạch'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {c.briefStatus === 'HANDED_OFF_TO_CONTENT' || c.briefStatus === 'IN_PRODUCTION' || c.briefStatus === 'COMPLETED' ? (
                                <span className="inline-flex items-center gap-1 text-2xs text-positive font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Đã giao ({c.contentPic || 'Quỳnh Như'})</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleHandoff(c.id)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-2xs font-semibold bg-primary hover:bg-primary-hover text-white transition cursor-pointer"
                                  title="Bàn giao nội dung sang nhóm kịch bản"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Bàn giao</span>
                                </button>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setDetailedCampaignModal(c)}
                                  className="px-2 py-1 rounded text-2xs font-medium text-ink-2 hover:text-ink hover:bg-sunken border border-line transition cursor-pointer flex items-center gap-1"
                                  title="Xem chi tiết chiến dịch"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Chi tiết</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(c)}
                                  className="p-1 rounded text-ink-3 hover:text-ink hover:bg-sunken transition cursor-pointer"
                                  title="Sửa / Phân kỳ"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* CHẾ ĐỘ XEM: LƯỚI THẺ (GRID VIEW) TINH GỌN */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCampaigns.map((c) => {
                const budgetPercent = Math.min(100, Math.round((c.spentBudget / (c.budget || 1)) * 100));
                const gmvPercent = Math.min(100, Math.round((c.currentGmv / (c.targetGmv || 1)) * 100));
                const coveredMonths = c.coveredMonths && c.coveredMonths.length > 0
                  ? c.coveredMonths
                  : getCoveredMonthsFromRange(c.startDate, c.endDate);
                const isMultiMonth = coveredMonths.length >= 2;

                return (
                  <div key={c.id} className="bg-surface rounded-xl border border-line p-4 space-y-3 flex flex-col justify-between hover:border-line-strong transition shadow-2xs">
                    <div className="space-y-2.5">
                      {/* Card Header */}
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <BrandAvatar name={c.brand} size={18} rounded="sm" />
                          <span className="font-semibold text-ink text-xs truncate">{c.brand}</span>
                          <span className="text-3xs font-code text-accent font-semibold">{c.code}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-3xs font-semibold shrink-0 ${
                          c.status === 'ACTIVE'
                            ? 'bg-positive-soft text-positive'
                            : c.status === 'COMPLETED'
                              ? 'bg-sunken text-ink-2'
                              : 'bg-warning-soft text-warning'
                        }`}>
                          {c.status === 'ACTIVE' ? 'Đang chạy' : c.status === 'COMPLETED' ? 'Hoàn thành' : 'Kế hoạch'}
                        </span>
                      </div>

                      {/* Title & Dates */}
                      <div>
                        <h3 className="text-xs font-semibold text-ink line-clamp-1" title={c.title}>
                          {c.title}
                        </h3>
                        <div className="flex items-center justify-between text-3xs text-ink-3 mt-1">
                          <span>{c.startDate} → {c.endDate}</span>
                          <span className={isMultiMonth ? 'text-accent font-medium' : ''}>
                            {isMultiMonth ? `Liên tháng (${coveredMonths.length}T)` : '1 tháng'}
                          </span>
                        </div>
                      </div>

                      {/* Big Idea Preview */}
                      {c.bigIdea && (
                        <div className="px-2.5 py-1.5 rounded-md bg-sunken/60 text-2xs text-ink-2 italic line-clamp-2">
                          &ldquo;{c.bigIdea}&rdquo;
                        </div>
                      )}

                      {/* Progress Bars */}
                      <div className="space-y-2 pt-1 border-t border-line text-2xs">
                        <div>
                          <div className="flex justify-between text-3xs mb-0.5">
                            <span className="text-ink-3">Ngân sách:</span>
                            <span className="font-medium text-ink">{formatVndShort(c.spentBudget)} / {formatVndShort(c.budget)} ({budgetPercent}%)</span>
                          </div>
                          <div className="w-full h-1 bg-sunken rounded-full overflow-hidden">
                            <div className="h-full bg-accent rounded-full" style={{ width: `${budgetPercent}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-3xs mb-0.5">
                            <span className="text-ink-3">GMV:</span>
                            <span className="font-medium text-positive">{formatVndShort(c.currentGmv)} / {formatVndShort(c.targetGmv)} ({gmvPercent}%)</span>
                          </div>
                          <div className="w-full h-1 bg-sunken rounded-full overflow-hidden">
                            <div className="h-full bg-positive rounded-full" style={{ width: `${gmvPercent}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-line mt-1">
                      <div className="text-2xs">
                        {c.briefStatus === 'HANDED_OFF_TO_CONTENT' || c.briefStatus === 'IN_PRODUCTION' || c.briefStatus === 'COMPLETED' ? (
                          <span className="text-positive font-medium flex items-center gap-1 text-3xs">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Đã giao ({c.contentPic || 'Quỳnh Như'})</span>
                          </span>
                        ) : (
                          <span className="text-ink-3 text-3xs font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-warning" />
                            <span>Brief nháp</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailedCampaignModal(c)}
                          className="px-2 py-1 rounded text-2xs font-medium text-ink-2 hover:text-ink hover:bg-sunken border border-line transition cursor-pointer"
                        >
                          Xem chi tiết
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(c)}
                          className="p-1 rounded text-ink-3 hover:text-ink hover:bg-sunken transition cursor-pointer"
                          title="Sửa / Phân kỳ"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: QUY CHUẨN THƯƠNG HIỆU & TỪ KHÓA CẤM                               */}
      {/* ========================================================================= */}
      {activeTab === 'GUIDELINE_HUB' && (
        <div className="space-y-6">
          {/* Brand Selector Pills + Search across 42 B2C Brands */}
          <div className="bg-white p-3.5 rounded-md border border-slate-200 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-blue-600" />
                <span>Chọn thương hiệu ({guidelines.length} nhãn hàng):</span>
              </span>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm tên thương hiệu, ngành hàng..."
                  value={brandSearchFilter}
                  onChange={(e) => setBrandSearchFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded pl-8 pr-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 max-w-full">
              {guidelines
                .filter((g) =>
                  !brandSearchFilter.trim() ||
                  g.brandName.toLowerCase().includes(brandSearchFilter.toLowerCase()) ||
                  g.category.toLowerCase().includes(brandSearchFilter.toLowerCase())
                )
                .map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedBrandName(g.brandName)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-2 shrink-0 ${
                      selectedBrandName === g.brandName
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <BrandAvatar name={g.brandName} size={18} rounded="sm" />
                    <span>{g.brandName}</span>
                    <span className={`text-2xs ${
                      selectedBrandName === g.brandName ? 'text-blue-100' : 'text-slate-500'
                    }`}>
                      ({g.blacklistKeywords.length})
                    </span>
                  </button>
                ))}
            </div>
          </div>

          {/* Active Brand Profile Header */}
          <div className="card-enterprise p-5 bg-blue-50/50 border-blue-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <BrandAvatar name={currentGuideline.brandName} size={48} rounded="lg" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-semibold text-slate-900">{currentGuideline.brandName}</h2>
                    <span className="text-xs font-medium text-blue-700">
                      · {currentGuideline.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-3xl">
                    <strong>Định vị &amp; giọng văn:</strong> {currentGuideline.toneOfVoice}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    <strong>Khuyến cáo pháp lý / Nhận diện:</strong> {currentGuideline.logoRules}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                {onNavigateToBrandKnowledge && (
                  <button
                    onClick={() => onNavigateToBrandKnowledge(currentGuideline.brandName)}
                    className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded border border-slate-300 shadow-2xs flex items-center gap-1.5 transition"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span>Xem hồ sơ &amp; tài liệu ({currentProfile?.documents?.length || 0})</span>
                  </button>
                )}
                <button
                  onClick={() => setIsAddKeywordModalOpen(true)}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded shadow-sm flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm từ khóa cấm</span>
                </button>
              </div>
            </div>

            {/* Ratecard KL1-KL7 & Documents Quick Strip */}
            {currentProfile && (
              <div className="mt-4 pt-3 border-t border-blue-200/70 grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-2xs font-semibold text-slate-600 mb-1.5">
                    Định mức trần thù lao theo khung lương (KL1 – KL7):
                  </p>
                  <div className="flex items-center gap-2 flex-wrap text-2xs font-medium text-slate-700">
                    {(['KL1', 'KL2', 'KL3', 'KL4', 'KL5', 'KL6', 'KL7'] as const).map((tier, idx) => {
                      const val = currentProfile.ratecard?.find((r) => r.grade === tier)?.maxBudget || 0;
                      return (
                        <span key={tier}>
                          {idx > 0 && <span className="text-slate-300 mr-2">·</span>}
                          <strong className="text-blue-700 font-code">{tier}:</strong> {formatVndShort(val)}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-2xs font-semibold text-slate-600 mb-1.5">
                    Tài liệu đính kèm ({currentProfile.documents?.length || 0} tệp):
                  </p>
                  {currentProfile.documents && currentProfile.documents.length > 0 ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {currentProfile.documents.slice(0, 3).map((doc) => (
                        <a
                          key={doc.id}
                          href={doc.url || (doc.fileKey ? `/api/brands/files?key=${encodeURIComponent(doc.fileKey)}` : '#')}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 rounded bg-white border border-slate-200 hover:border-blue-400 text-2xs text-blue-700 font-medium flex items-center gap-1 transition"
                        >
                          <FileText className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[160px]">{doc.title}</span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-2xs text-slate-500">
                      Chưa có tệp đính kèm — bấm &ldquo;Xem hồ sơ &amp; tài liệu&rdquo; để tải tệp lên.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SECTION A: BLACKLIST KEYWORD MANAGER */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Danh mục từ khóa cấm &amp; nhạy cảm</span>
                </h3>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded p-1 text-xs">
                  <span className="text-2xs text-slate-400 pl-1">Mức độ:</span>
                  {(['ALL', 'CRITICAL_BANNED', 'COMPETITOR_WARNING', 'SENSITIVE_POLICY'] as const).map(sev => (
                    <button
                      key={sev}
                      onClick={() => setSeverityFilter(sev)}
                      className={`px-2 py-0.5 rounded text-2xs font-medium transition ${
                        severityFilter === sev
                          ? 'bg-slate-900 text-white font-semibold'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {sev === 'ALL' ? 'Tất cả' :
                       sev === 'CRITICAL_BANNED' ? 'Nghiêm cấm' :
                       sev === 'COMPETITOR_WARNING' ? 'Đối thủ' : 'Chính sách'}
                    </button>
                  ))}
                </div>

                <div className="relative w-48">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm từ khóa..."
                    value={keywordSearch}
                    onChange={(e) => setKeywordSearch(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded pl-7 pr-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Keywords Table */}
            <div className="card-enterprise overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                    <th className="py-2.5 px-4">Từ khóa bị chặn</th>
                    <th className="py-2.5 px-3">Mức độ &amp; phân loại</th>
                    <th className="py-2.5 px-4">Lý do cấm (pháp lý / định vị)</th>
                    <th className="py-2.5 px-4">Cách diễn đạt thay thế</th>
                    <th className="py-2.5 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredKeywords.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Không có từ khóa nào khớp với tiêu chí tìm kiếm.
                      </td>
                    </tr>
                  ) : (
                    filteredKeywords.map((kw) => (
                      <tr key={kw.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-semibold text-rose-800">
                          &ldquo;{kw.keyword}&rdquo;
                        </td>
                        <td className="py-3 px-3">
                          {kw.severity === 'CRITICAL_BANNED' && (
                            <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1 w-fit">
                              <AlertOctagon className="w-3 h-3 text-red-700" /> Cấm tuyệt đối
                            </span>
                          )}
                          {kw.severity === 'COMPETITOR_WARNING' && (
                            <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 w-fit">
                              <AlertTriangle className="w-3 h-3 text-amber-700" /> Tránh đối thủ
                            </span>
                          )}
                          {kw.severity === 'SENSITIVE_POLICY' && (
                            <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-accent-soft text-accent border border-line flex items-center gap-1 w-fit">
                              <ShieldAlert className="w-3 h-3 text-accent" /> Nhạy cảm nền tảng
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs">
                          {kw.rationale}
                        </td>
                        <td className="py-3 px-4">
                          {kw.alternativeSuggestion ? (
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-700 font-medium">
                                {kw.alternativeSuggestion}
                              </span>
                              <button
                                onClick={() => handleCopySuggestion(kw.id, kw.alternativeSuggestion!)}
                                title="Sao chép từ thay thế"
                                className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition"
                              >
                                {copiedKeywordId === kw.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Không có đề xuất</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleDeleteKeyword(currentGuideline.id, kw.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="Xóa từ khóa khỏi danh sách"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION B: VISUAL DO'S & DON'TS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="card-enterprise p-5 border-emerald-200 bg-emerald-50/20">
              <h4 className="text-xs font-semibold text-emerald-800 flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Hình ảnh nên có trong video</span>
              </h4>
              <ul className="space-y-2 text-xs text-slate-700">
                {currentGuideline.visualDoList.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card-enterprise p-5 border-rose-200 bg-rose-50/20">
              <h4 className="text-xs font-semibold text-rose-800 flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Hình ảnh không được dùng</span>
              </h4>
              <ul className="space-y-2 text-xs text-slate-700">
                {currentGuideline.visualDontList.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <X className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* SECTION C: HERO SKUS */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>Danh mục sản phẩm chủ lực</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentGuideline.heroSkus.map((sku) => (
                <div key={sku.id} className="card-enterprise p-4 space-y-3 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="font-code text-2xs font-semibold text-accent">
                      {sku.skuCode}
                    </span>
                    <span className="text-xs font-semibold text-slate-900">
                      {sku.priceVnd.toLocaleString('vi-VN')} đ
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{sku.name}</h4>
                    <span className="text-2xs text-slate-500 font-medium">Danh mục: {sku.category}</span>
                  </div>

                  {sku.clinicalClaims && (
                    <div className="p-2.5 rounded bg-blue-50/60 border border-blue-100 text-xs text-blue-900">
                      <span className="font-semibold">Thành phần / Kiểm nghiệm:</span> {sku.clinicalClaims}
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-2xs font-semibold text-slate-600">Điểm nổi bật cần nhắc:</p>
                    <ul className="space-y-1 text-xs text-slate-700">
                      {sku.uspBulletPoints.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-blue-500 font-semibold">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500">
                      Kho hàng mẫu: <strong className="text-emerald-700">{sku.sampleStockCount} mẫu</strong>
                    </span>
                    <a
                      href={sku.pdpUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 hover:underline"
                    >
                      <span>Xem gian hàng</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: THẨM ĐỊNH KOC & KỊCH BẢN CUỐI                                      */}
      {/* ========================================================================= */}
      {activeTab === 'APPROVAL_GATE' && (
        <div className="space-y-6">
          {/* Sub-tab Navigation */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setApprovalSubTab('ROUND_1_KOC')}
                className={`px-4 py-2 text-xs font-semibold rounded-md transition flex items-center gap-2 ${
                  approvalSubTab === 'ROUND_1_KOC'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Vòng 1: Phê duyệt danh sách KOC</span>
                {pendingKocCount > 0 && (
                  <span className="text-2xs px-1.5 py-0.5 rounded-full font-semibold bg-amber-500 text-white">
                    {pendingKocCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setApprovalSubTab('ROUND_2_SCRIPT')}
                className={`px-4 py-2 text-xs font-semibold rounded-md transition flex items-center gap-2 ${
                  approvalSubTab === 'ROUND_2_SCRIPT'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Vòng 2: Phê duyệt kịch bản &amp; góc máy</span>
                {pendingScriptCount > 0 && (
                  <span className="text-2xs px-1.5 py-0.5 rounded-full font-semibold bg-amber-500 text-white">
                    {pendingScriptCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* VÒNG 1: PHÊ DUYỆT DANH SÁCH KOC */}
          {approvalSubTab === 'ROUND_1_KOC' && (
            <div className="space-y-4">
              <div className="card-enterprise overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="py-2.5 px-4">KOC &amp; kênh</th>
                      <th className="py-2.5 px-3">Nhãn hàng &amp; mã deal</th>
                      <th className="py-2.5 px-3">Khung lương</th>
                      <th className="py-2.5 px-3">Giá net &amp; định mức trần</th>
                      <th className="py-2.5 px-3">Tệp kênh</th>
                      <th className="py-2.5 px-3">SLA còn lại</th>
                      <th className="py-2.5 px-3">Trạng thái</th>
                      <th className="py-2.5 px-4 text-right">Quyết định</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {approvalQueue
                      .filter(i => i.submissionRound === 'ROUND_1_KOC')
                      .map((item) => {
                        const matchedProf = findBrandProfile(profiles, item.brandName);
                        const rateCeiling = getBrandRatecardCeiling(matchedProf, item.salaryGrade);
                        const isOverCeiling = rateCeiling !== undefined && rateCeiling > 0 && item.quoteNet > rateCeiling;

                        return (
                        <tr key={item.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.avatarUrl}
                                alt={item.kocName}
                                className="w-8 h-8 rounded-full object-cover border border-slate-200"
                              />
                              <div>
                                <p className="font-semibold text-slate-900">{item.kocName}</p>
                                <a
                                  href={`https://tiktok.com/${item.kocChannel}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-2xs text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  <span>{item.kocChannel}</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-semibold text-slate-900">{item.brandName}</p>
                            <p className="font-code text-2xs text-slate-500">{item.dealCode}</p>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-code font-semibold text-xs text-ink">
                              {item.salaryGrade}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800">
                              {item.quoteNet.toLocaleString('vi-VN')} đ
                            </div>
                            {rateCeiling !== undefined && rateCeiling > 0 && (
                              <div className={`text-2xs font-medium mt-0.5 ${isOverCeiling ? 'text-rose-600' : 'text-emerald-700'}`}>
                                {isOverCeiling
                                  ? `Vượt trần ${item.salaryGrade} (+${(item.quoteNet - rateCeiling).toLocaleString('vi-VN')}đ / Trần ${rateCeiling.toLocaleString('vi-VN')}đ)`
                                  : `Đúng trần ${item.salaryGrade} (≤ ${rateCeiling.toLocaleString('vi-VN')}đ)`}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {item.tepKenh}
                          </td>
                          <td className="py-3 px-3">
                            <span className="flex items-center gap-1 text-2xs font-medium text-amber-700">
                              <Clock className="w-3 h-3" /> Còn {item.remainingSlaHours}h
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {item.status === 'PENDING' && (
                              <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                Chờ duyệt
                              </span>
                            )}
                            {item.status === 'APPROVED' && (
                              <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3" /> Đã duyệt
                              </span>
                            )}
                            {item.status === 'REJECTED' && (
                              <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                                Đã từ chối
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {item.status === 'PENDING' ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleApproveItem(item.id)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-xs transition flex items-center gap-1 shadow-sm"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Duyệt</span>
                                </button>
                                <button
                                  onClick={() => setRejectModalItem(item)}
                                  className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-300 rounded font-semibold text-xs transition flex items-center gap-1"
                                >
                                  <X className="w-3 h-3" />
                                  <span>Từ chối</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-2xs">Đã xử lý</span>
                            )}
                          </td>
                        </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VÒNG 2: PHÊ DUYỆT KỊCH BẢN & GÓC MÁY */}
          {approvalSubTab === 'ROUND_2_SCRIPT' && (
            <div className="space-y-4">
              {approvalQueue
                .filter(i => i.submissionRound === 'ROUND_2_SCRIPT')
                .map((item) => (
                  <div key={item.id} className="card-enterprise p-5 space-y-4 bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.avatarUrl}
                          alt={item.kocName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-slate-900">{item.kocName}</h4>
                            <span className="font-code text-xs font-semibold text-blue-700">
                              · {item.salaryGrade}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">· Nhãn: {item.brandName}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Mã deal: <span className="font-code text-slate-700 font-semibold">{item.dealCode}</span> | Người nộp:{' '}
                            <span className="font-medium text-slate-700">{item.submittedBy}</span> lúc {item.submittedAt}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs font-semibold text-amber-700">
                          <Clock className="w-3.5 h-3.5" /> SLA còn {item.remainingSlaHours}h
                        </span>
                        {item.status === 'PENDING' ? (
                          <div className="flex items-center gap-1.5">
                            {item.scriptContent && (
                              <button
                                onClick={() => handleAiInspectScript(item)}
                                className="px-2.5 py-1.5 bg-accent-soft hover:bg-sunken text-accent border border-line rounded font-semibold text-xs transition flex items-center gap-1.5"
                                title="Kiểm tra kịch bản theo quy chuẩn thương hiệu"
                              >
                                <FileText className="w-3.5 h-3.5 text-accent" />
                                <span>Kiểm tra kịch bản</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleApproveItem(item.id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-xs transition flex items-center gap-1.5 shadow-sm"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Duyệt kịch bản</span>
                            </button>
                            <button
                              onClick={() => setRejectModalItem(item)}
                              className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-300 rounded font-semibold text-xs transition flex items-center gap-1.5"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Cần sửa / từ chối</span>
                            </button>
                          </div>
                        ) : item.status === 'APPROVED' ? (
                          <span className="px-3 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đã duyệt kịch bản
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                            Cần sửa / đã từ chối
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 4-Part Script Structure */}
                    {item.scriptContent && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">Cấu trúc kịch bản 4 phần:</span>
                          <span>Thời lượng ước tính: <strong>{item.scriptContent.durationSeconds} giây</strong></span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                          {/* Part 1: Hook */}
                          <div className="p-3 rounded border border-blue-200 bg-blue-50/40 space-y-1">
                            <div className="flex items-center gap-1.5 text-blue-800 font-semibold">
                              <span>Mở đầu (3 giây đầu)</span>
                            </div>
                            <p className="text-slate-800 leading-relaxed font-medium">
                              &ldquo;{item.scriptContent.hook}&rdquo;
                            </p>
                          </div>

                          {/* Part 2: Pain Point */}
                          <div className="p-3 rounded border border-amber-200 bg-amber-50/40 space-y-1">
                            <div className="flex items-center gap-1.5 text-amber-800 font-semibold">
                              <span>Nỗi đau khách hàng</span>
                            </div>
                            <p className="text-slate-700 leading-relaxed">
                              {item.scriptContent.pain}
                            </p>
                          </div>

                          {/* Part 3: Solution & USP */}
                          <div className="p-3 rounded border border-emerald-200 bg-emerald-50/40 space-y-1">
                            <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                              <span>Giải pháp &amp; lợi điểm</span>
                            </div>
                            <p className="text-slate-700 leading-relaxed font-medium">
                              {item.scriptContent.usp}
                            </p>
                          </div>

                          {/* Part 4: CTA */}
                          <div className="p-3 rounded border border-line bg-accent-soft space-y-1">
                            <div className="flex items-center gap-1.5 text-accent font-semibold">
                              <span>Kêu gọi hành động</span>
                            </div>
                            <p className="text-slate-800 leading-relaxed font-semibold">
                              {item.scriptContent.cta}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {item.rejectReason && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">
                        <strong>Lý do từ chối:</strong> {item.rejectReason}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: HỢP ĐỒNG & HIỆU QUẢ NHÃN HÀNG                                      */}
      {/* ========================================================================= */}
      {activeTab === 'RETAINER_HEALTH' && (
        <div className="space-y-6">
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card-enterprise p-4">
              <p className="text-2xs text-slate-500 font-medium">Tổng ngân sách hợp đồng</p>
              <p className="text-xl font-semibold text-slate-900 mt-1">{formatVndShort(1320000000)}</p>
              <p className="text-2xs text-emerald-600 mt-1 font-semibold">Giải ngân 81,4%</p>
            </div>

            <div className="card-enterprise p-4">
              <p className="text-2xs text-slate-500 font-medium">Tổng GMV toàn nhãn</p>
              <p className="text-xl font-semibold text-accent mt-1">{formatVndShort(8980000000)}</p>
              <p className="text-2xs text-accent mt-1 font-semibold">Đạt 92,6% chỉ tiêu</p>
            </div>

            <div className="card-enterprise p-4">
              <p className="text-2xs text-slate-500 font-medium">ROI danh mục trung bình</p>
              <p className="text-xl font-semibold text-emerald-700 mt-1">6.81x</p>
              <p className="text-2xs text-slate-500 mt-1">Mục tiêu toàn sàn &gt; 5.0x</p>
            </div>

            <div className="card-enterprise p-4">
              <p className="text-2xs text-slate-500 font-medium">Tỷ lệ KOC bị từ chối</p>
              <p className="text-xl font-semibold text-amber-700 mt-1">10.3%</p>
              <p className="text-2xs text-slate-500 mt-1">Chuẩn an toàn &lt; 15%</p>
            </div>
          </div>

          {/* Retainer Health Master Table */}
          <div className="card-enterprise overflow-x-auto">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Bảng theo dõi hợp đồng thương hiệu</h3>
              </div>
            </div>

            <table className="w-full min-w-[640px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="py-2.5 px-4">Thương hiệu</th>
                  <th className="py-2.5 px-3">Phụ trách</th>
                  <th className="py-2.5 px-4">Tiến độ ngân sách</th>
                  <th className="py-2.5 px-4">Tiến độ GMV</th>
                  <th className="py-2.5 px-3">ROI</th>
                  <th className="py-2.5 px-3">Tỷ lệ từ chối KOC</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                  <th className="py-2.5 px-4">Đánh giá &amp; nhận định</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {retainerHealthList.map((item) => {
                  const budgetPct = Math.min(100, Math.round((item.spentBudget / item.allocatedBudget) * 100));
                  const gmvPct = Math.min(100, Math.round((item.actualGmv / item.targetGmv) * 100));

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {item.brandName}
                      </td>
                      <td className="py-3 px-3">
                        <p className="text-slate-800 font-medium">{item.accountLead}</p>
                        <p className="text-2xs text-slate-500">{item.growthLead}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-2xs">
                            <span className="text-slate-600 font-medium">
                              {formatVndShort(item.spentBudget)} / {formatVndShort(item.allocatedBudget)}
                            </span>
                            <span className="font-semibold text-blue-600">{budgetPct}%</span>
                          </div>
                          <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="data-bar h-full bg-blue-600 rounded-full" style={{ width: `${budgetPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-2xs">
                            <span className="text-slate-600 font-medium">
                              {formatVndShort(item.actualGmv)} / {formatVndShort(item.targetGmv)}
                            </span>
                            <span className="font-semibold text-emerald-600">{gmvPct}%</span>
                          </div>
                          <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="data-bar h-full bg-emerald-500 rounded-full" style={{ width: `${gmvPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-emerald-700">
                        {item.roi.toFixed(2)}x
                      </td>
                      <td className="py-3 px-3">
                        <span className={`font-semibold text-2xs ${
                          item.rejectionRate > 15
                            ? 'text-rose-700'
                            : 'text-slate-700'
                        }`}>
                          {item.rejectionRate}% ({item.rejectedKocsCount}/{item.activeKocsCount})
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {item.healthStatus === 'HEALTHY' && (
                          <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Ổn định
                          </span>
                        )}
                        {item.healthStatus === 'WARNING' && (
                          <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            Cần tối ưu
                          </span>
                        )}
                        {item.healthStatus === 'CRITICAL' && (
                          <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                            Rủi ro cao
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-2xs max-w-sm">
                        {item.statusNotes}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TẠO CHIẾN DỊCH / BRIEF MỚI                                         */}
      {/* ========================================================================= */}
      <CampaignCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingCampaign(null);
          setDefaultBrandForModal(undefined);
        }}
        onCampaignCreated={handleCreateCampaign}
        initialCampaign={editingCampaign}
        defaultBrand={defaultBrandForModal}
      />

      {/* ========================================================================= */}
      {/* MODAL: THÊM TỪ KHÓA BLACKLIST                                             */}
      {/* ========================================================================= */}
      <Modal
        open={isAddKeywordModalOpen}
        onClose={() => setIsAddKeywordModalOpen(false)}
        title={`Thêm từ khóa bị chặn (${selectedBrandName})`}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="ghost"
              onClick={() => setIsAddKeywordModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={(e) => handleAddKeyword(e as any)}
            >
              Lưu từ khóa
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddKeyword} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Từ khóa cần chặn *
            </label>
            <input
              type="text"
              placeholder="VD: Trị dứt điểm mụn..."
              value={newKeywordText}
              onChange={(e) => setNewKeywordText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Mức độ chặn *
              </label>
              <select
                value={newKeywordSeverity}
                onChange={(e) => setNewKeywordSeverity(e.target.value as BlacklistSeverity)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="CRITICAL_BANNED">Cấm tuyệt đối (vi phạm y tế/pháp lý)</option>
                <option value="COMPETITOR_WARNING">Tránh đối thủ (cạnh tranh)</option>
                <option value="SENSITIVE_POLICY">Nhạy cảm nền tảng</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Phân loại *
              </label>
              <select
                value={newKeywordCategory}
                onChange={(e) => setNewKeywordCategory(e.target.value as 'LEGAL_MEDICAL' | 'COMPETITOR' | 'SENSITIVE_POLICY')}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="LEGAL_MEDICAL">Y tế &amp; luật quảng cáo</option>
                <option value="COMPETITOR">Tên đối thủ cạnh tranh</option>
                <option value="SENSITIVE_POLICY">Chính sách TikTok Shop</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Lý do cấm *
            </label>
            <textarea
              rows={2}
              placeholder="VD: Vi phạm quy định Bộ Y tế cấm cam kết dứt điểm trong mỹ phẩm..."
              value={newKeywordRationale}
              onChange={(e) => setNewKeywordRationale(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Gợi ý từ thay thế hợp chuẩn
            </label>
            <input
              type="text"
              placeholder="VD: Hỗ trợ làm sạch bã nhờn, giúp ngừa mụn quay trở lại..."
              value={newKeywordAlt}
              onChange={(e) => setNewKeywordAlt(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: TỪ CHỐI KOC HOẶC KỊCH BẢN (REJECT MODAL)                           */}
      {/* ========================================================================= */}
      <Modal
        open={Boolean(rejectModalItem)}
        onClose={() => setRejectModalItem(null)}
        title={rejectModalItem ? `Từ chối ${rejectModalItem.submissionRound === 'ROUND_1_KOC' ? 'KOC đề xuất' : 'kịch bản KOC'}` : 'Từ chối'}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="ghost"
              onClick={() => setRejectModalItem(null)}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmReject}
            >
              Xác nhận từ chối
            </Button>
          </div>
        }
      >
        {rejectModalItem && (
          <div className="space-y-3.5 text-xs">
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <p><strong>KOC:</strong> {rejectModalItem.kocName} ({rejectModalItem.kocChannel})</p>
              <p><strong>Thương hiệu:</strong> {rejectModalItem.brandName} | <strong>Deal:</strong> {rejectModalItem.dealCode}</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Chọn lý do chuẩn hóa *
              </label>
              <select
                value={rejectReasonSelection}
                onChange={(e) => setRejectReasonSelection(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
              >
                <option value="Lệch định vị phong cách thương hiệu">Lệch định vị phong cách thương hiệu</option>
                <option value="Từng nhận booking từ đối thủ cạnh tranh trực tiếp">Từng nhận booking từ đối thủ cạnh tranh trực tiếp</option>
                <option value="Kênh KOC có rủi ro scandal / tương tác ảo">Kênh KOC có rủi ro scandal / tương tác ảo</option>
                <option value="Thiếu kiến thức chuyên môn da liễu / y tế bắt buộc">Thiếu kiến thức chuyên môn da liễu / y tế bắt buộc</option>
                <option value="Kịch bản vi phạm từ khóa cấm hoặc cam kết sai sự thật">Kịch bản vi phạm từ khóa cấm hoặc cam kết sai sự thật</option>
                <option value="Góc quay và chất lượng hình ảnh chưa đạt tiêu chuẩn nhãn">Góc quay và chất lượng hình ảnh chưa đạt tiêu chuẩn nhãn</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Ghi chú chi tiết cho nhóm booking / nội dung
              </label>
              <textarea
                rows={2}
                placeholder="Ghi rõ góp ý cụ thể để đổi KOC khác hoặc sửa lại kịch bản..."
                value={rejectCustomNote}
                onChange={(e) => setRejectCustomNote(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-rose-500 focus:bg-white"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: THÔNG BÁO BÀN GIAO THÀNH CÔNG                                      */}
      {/* ========================================================================= */}
      {handoffSuccessModal && (
        <Modal
          open={!!handoffSuccessModal}
          onClose={() => setHandoffSuccessModal(null)}
          title="Bàn giao brief thành công"
          size="sm"
          footer={
            <div className="flex justify-end w-full">
              <Button variant="primary" onClick={() => setHandoffSuccessModal(null)}>
                Đóng
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-center text-xs">
            <div className="w-10 h-10 rounded-full bg-positive-soft text-positive flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-ink">
              Chiến dịch <strong>{handoffSuccessModal.title}</strong> đã được bàn giao sang nhóm nội dung.
            </p>
            <div className="p-3 bg-sunken rounded border border-line text-left space-y-1 text-2xs">
              <p><strong>SLA phản hồi:</strong> 24 giờ</p>
              <p><strong>Phụ trách nội dung:</strong> Quỳnh Như</p>
              <p><strong>Bước kế tiếp:</strong> Lập góc tiếp cận &amp; chọn danh sách KOC</p>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CHI TIẾT CHIẾN DỊCH (CAMPAIGN DETAIL MODAL)                        */}
      {/* ========================================================================= */}
      {detailedCampaignModal && (
        <Modal
          open={!!detailedCampaignModal}
          onClose={() => setDetailedCampaignModal(null)}
          title={`Chi tiết chiến dịch ${detailedCampaignModal.title} (${detailedCampaignModal.code})`}
          size="xl"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="secondary" onClick={() => setDetailedCampaignModal(null)}>
                Đóng
              </Button>
              {detailedCampaignModal.briefStatus === 'DRAFT' && (
                <Button
                  variant="primary"
                  icon={Send}
                  onClick={() => {
                    const cid = detailedCampaignModal.id;
                    setDetailedCampaignModal(null);
                    handleHandoff(cid);
                  }}
                >
                  Bàn giao nội dung
                </Button>
              )}
              <Button
                variant="secondary"
                icon={Edit3}
                onClick={() => {
                  const camp = detailedCampaignModal;
                  setDetailedCampaignModal(null);
                  handleOpenEditModal(camp);
                }}
              >
                Sửa / Phân kỳ
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Header Overview Strip */}
            <div className="p-3 rounded-lg bg-sunken border border-line flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <BrandAvatar name={detailedCampaignModal.brand} size={28} rounded="md" />
                <div>
                  <div className="font-semibold text-ink text-sm flex items-center gap-2">
                    <span>{detailedCampaignModal.brand}</span>
                    <span className="text-2xs font-code font-normal text-ink-3">· {detailedCampaignModal.code}</span>
                  </div>
                  <div className="text-2xs text-ink-3">
                    Thời gian: {detailedCampaignModal.startDate} → {detailedCampaignModal.endDate}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                  detailedCampaignModal.status === 'ACTIVE'
                    ? 'bg-positive-soft text-positive'
                    : detailedCampaignModal.status === 'COMPLETED'
                      ? 'bg-sunken text-ink-2'
                      : 'bg-warning-soft text-warning'
                }`}>
                  {detailedCampaignModal.status === 'ACTIVE' ? 'Đang chạy' : detailedCampaignModal.status === 'COMPLETED' ? 'Hoàn thành' : 'Kế hoạch'}
                </span>
                <span className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                  detailedCampaignModal.briefStatus === 'HANDED_OFF_TO_CONTENT' || detailedCampaignModal.briefStatus === 'IN_PRODUCTION' || detailedCampaignModal.briefStatus === 'COMPLETED'
                    ? 'bg-positive-soft text-positive'
                    : 'bg-sunken text-ink-3'
                }`}>
                  {detailedCampaignModal.briefStatus === 'HANDED_OFF_TO_CONTENT' || detailedCampaignModal.briefStatus === 'IN_PRODUCTION' || detailedCampaignModal.briefStatus === 'COMPLETED'
                    ? `Đã giao (${detailedCampaignModal.contentPic || 'Quỳnh Như'})`
                    : 'Brief nháp'}
                </span>
              </div>
            </div>

            {/* Strategic Overview & Content Rules */}
            <div className="p-4 rounded-lg bg-surface border border-line space-y-2.5">
              <h4 className="font-semibold text-ink text-xs flex items-center gap-1.5">
                <Target className="w-4 h-4 text-accent" />
                <span>Định hướng chiến lược &amp; Nội dung</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-ink-3 block text-2xs">Big Idea / Chủ đề:</span>
                  <span className="font-semibold text-ink italic">&ldquo;{detailedCampaignModal.bigIdea}&rdquo;</span>
                </div>
                {detailedCampaignModal.keyMessage && (
                  <div>
                    <span className="text-ink-3 block text-2xs">Thông điệp trọng tâm:</span>
                    <span className="text-ink">{detailedCampaignModal.keyMessage}</span>
                  </div>
                )}
                {detailedCampaignModal.roleInYearPlan && (
                  <div>
                    <span className="text-ink-3 block text-2xs">Vai trò trong Plan năm:</span>
                    <span className="text-ink">{detailedCampaignModal.roleInYearPlan}</span>
                  </div>
                )}
                {detailedCampaignModal.targetAudience && (
                  <div>
                    <span className="text-ink-3 block text-2xs">Khách hàng mục tiêu:</span>
                    <span className="text-ink">{detailedCampaignModal.targetAudience}</span>
                  </div>
                )}
              </div>

              {detailedCampaignModal.comboPromoOffer && (
                <div className="p-2.5 rounded bg-warning-soft border border-warning/30 text-ink">
                  <span className="font-semibold">CTKM / Combo / Quà tặng:</span>{' '}
                  <span>{detailedCampaignModal.comboPromoOffer}</span>
                </div>
              )}

              {detailedCampaignModal.heroSkus && detailedCampaignModal.heroSkus.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-ink-3 text-2xs">Hero SKU:</span>
                  <div className="flex flex-wrap gap-1">
                    {detailedCampaignModal.heroSkus.map(sku => (
                      <span key={sku} className="px-2 py-0.5 rounded bg-sunken text-ink font-code text-2xs">
                        {sku}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-line text-2xs text-ink-3">
                {detailedCampaignModal.brandStrategyPic && (
                  <span>Strategy PIC: <strong className="text-ink">{detailedCampaignModal.brandStrategyPic}</strong></span>
                )}
                {detailedCampaignModal.kvPic && (
                  <span>KV/SIS PIC: <strong className="text-ink">{detailedCampaignModal.kvPic}</strong></span>
                )}
                {detailedCampaignModal.contentPic && (
                  <span>Content PIC: <strong className="text-ink">{detailedCampaignModal.contentPic}</strong></span>
                )}
              </div>
            </div>

            {/* Key Visual Spec */}
            {detailedCampaignModal.keyVisualSpec && (
              <div className="p-4 rounded-lg bg-surface border border-line space-y-2.5">
                <h4 className="font-semibold text-ink text-xs flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-accent" />
                  <span>Quy chuẩn Key Visual (KV &amp; SIS)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-2xs">
                  <div>
                    <span className="text-ink-3 block">Chủ đề thiết kế:</span>
                    <strong className="text-ink">{detailedCampaignModal.keyVisualSpec.theme}</strong>
                  </div>
                  {detailedCampaignModal.keyVisualSpec.fonts && (
                    <div>
                      <span className="text-ink-3 block">Font chữ:</span>
                      <strong className="text-ink">{detailedCampaignModal.keyVisualSpec.fonts}</strong>
                    </div>
                  )}
                  {detailedCampaignModal.keyVisualSpec.promoTextOnKv && (
                    <div className="sm:col-span-2">
                      <span className="text-ink-3 block">Text CTKM trên KV:</span>
                      <span className="text-ink italic">&ldquo;{detailedCampaignModal.keyVisualSpec.promoTextOnKv}&rdquo;</span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-2xs">
                  <div className="bg-sunken p-2 rounded border border-line">
                    <span className="text-ink-3 block">Ngày lên Ref</span>
                    <strong className="text-ink">{detailedCampaignModal.keyVisualSpec.refDate || '—'}</strong>
                  </div>
                  <div className="bg-sunken p-2 rounded border border-line">
                    <span className="text-ink-3 block">Ngày Order KV</span>
                    <strong className="text-ink">{detailedCampaignModal.keyVisualSpec.orderDate || '—'}</strong>
                  </div>
                  <div className="bg-positive-soft p-2 rounded border border-positive/30">
                    <span className="text-positive block font-semibold">Ngày treo KV</span>
                    <strong className="text-positive font-semibold">{detailedCampaignModal.keyVisualSpec.hangDate || '—'}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Monthly Phases Breakdown */}
            {detailedCampaignModal.monthlyPhases && detailedCampaignModal.monthlyPhases.length > 0 && (
              <div className="rounded-lg border border-line overflow-hidden">
                <div className="bg-sunken/60 px-4 py-2 border-b border-line flex items-center justify-between">
                  <h4 className="font-semibold text-ink text-xs flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-accent" />
                    <span>Phân kỳ thực thi theo từng tháng ({detailedCampaignModal.monthlyPhases.length} tháng)</span>
                  </h4>
                </div>
                <div className="divide-y divide-line bg-surface">
                  {detailedCampaignModal.monthlyPhases.map(p => (
                    <div key={p.month} className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-accent font-code font-semibold text-xs">{p.month}</span>
                          <span className="font-semibold text-ink text-xs">· {p.phaseName}</span>
                        </div>
                        {p.saleMilestones && (
                          <p className="text-2xs text-ink-3 mt-0.5">Mốc sale: {p.saleMilestones}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4 shrink-0 text-2xs">
                        <div className="text-right">
                          <span className="text-ink-3 block">Ngân sách</span>
                          <strong className="text-ink">{formatVndShort(p.allocatedBudget)}</strong>
                        </div>
                        <div className="text-right">
                          <span className="text-ink-3 block">Mục tiêu GMV</span>
                          <strong className="text-positive">{formatVndShort(p.targetGmv)}</strong>
                        </div>
                        <div className="text-right">
                          <span className="text-ink-3 block">Số KOC</span>
                          <strong className="text-accent">{p.targetKocCount} KOC</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Financial Summary Strip */}
            <div className="p-3 rounded-lg bg-surface border border-line grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-ink-3 block text-2xs">Tổng ngân sách:</span>
                <strong className="text-ink text-sm">{formatVndShort(detailedCampaignModal.budget)}</strong>
                <span className="text-3xs text-ink-3 block">Đã chi: {formatVndShort(detailedCampaignModal.spentBudget)}</span>
              </div>
              <div>
                <span className="text-ink-3 block text-2xs">Mục tiêu GMV:</span>
                <strong className="text-positive text-sm">{formatVndShort(detailedCampaignModal.targetGmv)}</strong>
                <span className="text-3xs text-ink-3 block">Đạt: {formatVndShort(detailedCampaignModal.currentGmv)}</span>
              </div>
              <div>
                <span className="text-ink-3 block text-2xs">CIR mục tiêu:</span>
                <strong className="text-accent text-sm">{detailedCampaignModal.targetCir ? `${detailedCampaignModal.targetCir}%` : '—'}</strong>
              </div>
              <div>
                <span className="text-ink-3 block text-2xs">Thời lượng:</span>
                <strong className="text-ink text-sm">
                  {getCoveredMonthsFromRange(detailedCampaignModal.startDate, detailedCampaignModal.endDate).length} tháng
                </strong>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: KIỂM TRA KỊCH BẢN                                                  */}
      {/* ========================================================================= */}
      <Modal
        open={Boolean(aiScanModalData)}
        onClose={() => setAiScanModalData(null)}
        title={aiScanModalData ? `Kiểm tra kịch bản — KOC ${aiScanModalData.item.kocName}` : 'Kiểm tra kịch bản'}
        size="xl"
        footer={
          aiScanModalData ? (
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-1.5 text-2xs text-slate-500">
                <span>Đối soát bởi quy chuẩn hệ thống</span>
              </div>

              <div className="flex items-center gap-2">
                {aiScanModalData.result.issues.length > 0 && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      const notes = aiScanModalData.result.issues.map(i => `• ${i.title}: ${i.rationale}`).join('\n');
                      setRejectCustomNote(notes);
                      setRejectReasonSelection('Lệch định vị phong cách thương hiệu');
                      setRejectModalItem(aiScanModalData.item);
                      setAiScanModalData(null);
                    }}
                  >
                    Chèn nhận xét vào phiếu từ chối
                  </Button>
                )}

                <Button
                  variant="primary"
                  size="sm"
                  icon={CheckCircle2}
                  onClick={() => {
                    handleApproveItem(aiScanModalData.item.id);
                    setAiScanModalData(null);
                  }}
                >
                  Duyệt kịch bản
                </Button>
              </div>
            </div>
          ) : undefined
        }
      >
        {aiScanModalData && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-2 flex-wrap text-2xs text-ink-3 pb-2 border-b border-line">
              <span>Đối soát theo quy chuẩn nhãn hàng: <strong className="text-ink">{aiScanModalData.item.brandName}</strong></span>
              <span>·</span>
              <span>Mã deal: <strong className="font-code text-ink">{aiScanModalData.item.dealCode}</strong></span>
            </div>

            {/* Verdict Strip */}
            <div className={`p-4 rounded-lg border-l-4 flex items-center justify-between gap-4 ${
              aiScanModalData.result.complianceStatus === 'PASS'
                ? 'border-l-emerald-500 bg-emerald-50/50 border border-emerald-200'
                : aiScanModalData.result.complianceStatus === 'WARNING'
                ? 'border-l-amber-500 bg-amber-50/50 border border-amber-200'
                : 'border-l-rose-500 bg-rose-50/50 border border-rose-200'
            }`}>
              <div className="space-y-1">
                <span className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                  aiScanModalData.result.complianceStatus === 'PASS'
                    ? 'bg-emerald-100 text-emerald-800'
                    : aiScanModalData.result.complianceStatus === 'WARNING'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {aiScanModalData.result.complianceStatus === 'PASS' && 'Đạt chuẩn'}
                  {aiScanModalData.result.complianceStatus === 'WARNING' && 'Cảnh báo — Cần sửa đổi'}
                  {aiScanModalData.result.complianceStatus === 'FAIL' && 'Không đạt — Từ chối duyệt'}
                </span>
                <p className="text-slate-700 font-medium leading-relaxed">
                  {aiScanModalData.result.summaryVerdict}
                </p>
              </div>

              <div className="text-center shrink-0">
                <span className="text-2xl font-semibold text-slate-900 block leading-none">
                  {aiScanModalData.result.overallScore}
                </span>
                <span className="text-2xs text-slate-400 font-medium">/ 100 điểm</span>
              </div>
            </div>

            {/* Trụ Cột Đánh Giá */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
              {aiScanModalData.result.dimensions.map((dim) => (
                <div key={dim.name} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                  <span className="text-2xs text-slate-500 block truncate" title={dim.name}>{dim.name}</span>
                  <span className={`text-sm font-semibold ${
                    dim.status === 'CRITICAL'
                      ? 'text-rose-600'
                      : dim.status === 'WARNING'
                        ? 'text-amber-600'
                        : 'text-slate-900'
                  }`}>
                    {dim.score}/{dim.maxScore}
                  </span>
                </div>
              ))}
            </div>

            {/* Danh Sách Vấn Đề (Issues) */}
            {aiScanModalData.result.issues.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Các điểm phát hiện cần lưu ý ({aiScanModalData.result.issues.length})</span>
                </h4>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {aiScanModalData.result.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                        issue.severity === 'CRITICAL'
                          ? 'bg-rose-50/50 border-rose-200'
                          : issue.severity === 'WARNING'
                          ? 'bg-amber-50/50 border-amber-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{issue.title}</span>
                        <span className={`px-1.5 py-0.5 rounded text-3xs font-semibold ${
                          issue.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {issue.severity === 'CRITICAL' ? 'Nghiêm trọng' : 'Khuyến nghị'}
                        </span>
                      </div>
                      <p className="text-slate-600 text-2xs leading-relaxed">
                        {issue.rationale}
                      </p>
                      {issue.replacementSuggestion && (
                        <p className="text-2xs text-accent font-medium">
                          Gợi ý thay thế: &ldquo;{issue.replacementSuggestion}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hook & USP Preview */}
            {aiScanModalData.result.rewrittenScript && (
              <div className="space-y-2 pt-2 border-t border-slate-100 text-2xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-slate-400 font-medium block">Hook mở đầu 3 giây:</span>
                  <p className="text-slate-800 italic">&ldquo;{aiScanModalData.result.rewrittenScript.hook}&rdquo;</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-slate-400 font-medium block">Giải pháp &amp; USP trình bày:</span>
                  <p className="text-slate-800">{aiScanModalData.result.rewrittenScript.solutionAndUsp}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
