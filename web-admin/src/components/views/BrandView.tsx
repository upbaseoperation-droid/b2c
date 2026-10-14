'use client';

import React, { useState, useMemo } from 'react';
import { formatVndShort } from '../../lib/format';
import { Tabs, PageActions, Button, Presence } from '../ui';
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
  Filter,
  X,
  Video,
  FolderOpen,
  Calendar,
  Layers,
  Palette,
  Edit3
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
  const [showCoverageMatrix, setShowCoverageMatrix] = useState<boolean>(true);
  const [searchCampaign, setSearchCampaign] = useState('');
  const [handoffSuccessModal, setHandoffSuccessModal] = useState<CampaignItem | null>(null);

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
            { key: 'GUIDELINE_HUB', label: 'Quy chuẩn & từ khóa cấm', count: guidelines.length },
            { key: 'APPROVAL_GATE', label: 'Thẩm định KOC & kịch bản', count: pendingApprovals.length || undefined },
            { key: 'RETAINER_HEALTH', label: 'Hợp đồng & hiệu quả nhãn hàng' },
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
              <div className="w-10 h-10 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xs text-slate-500 font-medium">Chiến dịch liên tháng (2–3 tháng)</p>
                <p className="text-lg font-semibold text-indigo-700">
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

          {/* Filter Bar: Month + Duration + Status + Search */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Month Filter */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-slate-500 font-semibold flex items-center gap-1 mr-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Chu kỳ tháng:
                </span>
                {([
                  { key: 'ALL', label: 'Tất cả các tháng' },
                  { key: '2026/09', label: 'Tháng 09/2026' },
                  { key: '2026/10', label: 'Tháng 10/2026 (Hiện tại)' },
                  { key: '2026/11', label: 'Tháng 11/2026' },
                ] as const).map(m => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setSelectedMonthFilter(m.key)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                      selectedMonthFilter === m.key
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Duration Filter */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-slate-500 font-semibold mr-1">Quy mô thời gian:</span>
                {([
                  { key: 'ALL', label: 'Tất cả' },
                  { key: 'SINGLE_MONTH', label: '1 Tháng (Ngắn hạn)' },
                  { key: 'MULTI_MONTH', label: 'Liên tháng (2–3 tháng)' },
                ] as const).map(d => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setDurationFilter(d.key)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                      durationFilter === d.key
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 overflow-x-auto text-xs">
                <span className="text-slate-400 text-xs flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Trạng thái:
                </span>
                {([
                  { key: 'ALL', label: 'Tất cả' },
                  { key: 'ACTIVE', label: 'Đang chạy' },
                  { key: 'UPCOMING', label: 'Kế hoạch sắp chạy' },
                  { key: 'DRAFT', label: 'Brief chờ bàn giao' },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSelectedFilter(tab.key)}
                    className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                      selectedFilter === tab.key
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowCoverageMatrix(v => !v)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition cursor-pointer whitespace-nowrap"
                >
                  {showCoverageMatrix ? 'Ẩn đối soát Brand Có/Không Campaign' : 'Xem đối soát Brand Có/Không Campaign'}
                </button>
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm mã chiến dịch, thương hiệu..."
                    value={searchCampaign}
                    onChange={(e) => setSearchCampaign(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bảng Đối Soát Thương Hiệu Có Campaign vs Không Có Campaign (Duy trì Always-on) trong tháng */}
          {showCoverageMatrix && (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span>Đối soát trạng thái Chiến dịch theo Thương hiệu — Chu kỳ {brandCoverageForMonth.targetMonth}</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                      {brandCoverageForMonth.withCampaign.length} Brand CÓ Campaign
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700">
                      {brandCoverageForMonth.withoutCampaign.length} Brand KHÔNG có Campaign (Chạy duy trì tháng)
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Một thương hiệu trong tháng có thể có Chiến dịch (kéo dài 1–3 tháng) hoặc không có Chiến dịch (chỉ chạy kế hoạch duy trì Always-on tại gian hàng).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Cột 1: Brand CÓ Campaign trong tháng */}
                <div className="p-3 bg-white rounded-lg border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="font-bold text-emerald-800">
                      Thương hiệu ĐANG CÓ Campaign ({brandCoverageForMonth.targetMonth})
                    </span>
                    <span className="text-[11px] text-emerald-600 font-semibold">
                      Đồng bộ KV &amp; Mốc Sale xuống Gian hàng
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {brandCoverageForMonth.withCampaign.map(({ brandName, campaign }) => {
                      const covered = campaign.coveredMonths || getCoveredMonthsFromRange(campaign.startDate, campaign.endDate);
                      return (
                        <button
                          key={brandName}
                          type="button"
                          onClick={() => handleOpenEditModal(campaign)}
                          title={`Nhấn để xem/cập nhật ${campaign.title}`}
                          className="px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 font-semibold text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <span>{brandName}</span>
                          <span className="px-1.5 py-0.2 rounded bg-white text-indigo-700 font-mono text-[10px] border border-emerald-200">
                            {campaign.code} ({covered.length}T)
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cột 2: Brand KHÔNG CÓ Campaign trong tháng */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="font-bold text-slate-700">
                      Thương hiệu KHÔNG có Campaign ({brandCoverageForMonth.targetMonth}) — Duy trì Always-on
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Nhấn vào Brand để khởi tạo Campaign mới
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {brandCoverageForMonth.withoutCampaign.map(brandName => (
                      <button
                        key={brandName}
                        type="button"
                        onClick={() => handleOpenCreateModal(brandName)}
                        className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 border border-slate-200 text-slate-700 font-medium text-[11px] flex items-center gap-1 transition cursor-pointer"
                      >
                        <span>{brandName}</span>
                        <span className="text-[10px] text-slate-400">(Duy trì • + Tạo Campaign)</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Campaign Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredCampaigns.map((c) => {
              const budgetPercent = Math.min(100, Math.round((c.spentBudget / (c.budget || 1)) * 100));
              const gmvPercent = Math.min(100, Math.round((c.currentGmv / (c.targetGmv || 1)) * 100));
              const coveredMonths = c.coveredMonths && c.coveredMonths.length > 0
                ? c.coveredMonths
                : getCoveredMonthsFromRange(c.startDate, c.endDate);
              const isMultiMonth = coveredMonths.length >= 2;

              return (
                <div key={c.id} className="card-enterprise p-5 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-2xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {c.code}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{c.brand}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                            isMultiMonth
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {isMultiMonth
                            ? `Liên tháng • ${coveredMonths.length} tháng (${coveredMonths.join(' → ')})`
                            : `1 tháng (${coveredMonths[0] || '2026/10'})`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(c)}
                          className="px-2.5 py-1 rounded text-2xs font-semibold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 flex items-center gap-1 transition cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Sửa / Phân kỳ</span>
                        </button>
                        <span className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                          c.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : c.status === 'COMPLETED'
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {c.status === 'ACTIVE' ? 'Đang chạy' : c.status === 'COMPLETED' ? 'Đã hoàn thành' : 'Kế hoạch'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 tracking-tight">{c.title}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                        <span>
                          Khung ngày: <strong className="text-slate-700">{c.startDate} → {c.endDate}</strong>
                        </span>
                        {c.brandStrategyPic && (
                          <span>
                            Strategy PIC: <strong className="text-slate-700">{c.brandStrategyPic}</strong>
                          </span>
                        )}
                        {c.kvPic && (
                          <span>
                            KV/SIS PIC: <strong className="text-slate-700">{c.kvPic}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Big Idea, Strategy & CTKM Box */}
                    <div className="card-inner-box p-3 space-y-1.5 text-xs">
                      <div>
                        <span className="text-slate-500 font-semibold">Big Idea / Chủ đề:</span>{' '}
                        <span className="text-slate-900 font-semibold italic">&ldquo;{c.bigIdea}&rdquo;</span>
                      </div>
                      {c.keyMessage && (
                        <div>
                          <span className="text-slate-500 font-semibold">Thông điệp trọng tâm:</span>{' '}
                          <span className="text-slate-800">{c.keyMessage}</span>
                        </div>
                      )}
                      {c.roleInYearPlan && (
                        <div>
                          <span className="text-slate-500 font-semibold">Vai trò trong Plan năm:</span>{' '}
                          <span className="text-slate-700">{c.roleInYearPlan}</span>
                        </div>
                      )}
                      {c.comboPromoOffer && (
                        <div className="p-2 rounded bg-amber-50/80 border border-amber-200 text-amber-950">
                          <span className="font-bold">CTKM / Combo / Quà tặng:</span> {c.comboPromoOffer}
                        </div>
                      )}
                      <div>
                        <span className="text-slate-500 font-semibold">Khách hàng mục tiêu:</span>{' '}
                        <span className="text-slate-700">{c.targetAudience}</span>
                      </div>
                      {c.heroSkus && c.heroSkus.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-slate-500 font-semibold">Hero SKU:</span>
                          {c.heroSkus.map((sku, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-2xs text-slate-700 font-mono font-semibold">
                              {sku}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Key Visual Spec Box (Section 03 Template 1 Sheet) */}
                    {c.keyVisualSpec && (
                      <div className="p-3 rounded-lg bg-purple-50/50 border border-purple-200 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-purple-900 flex items-center gap-1.5">
                            <Palette className="w-3.5 h-3.5 text-purple-600" />
                            <span>Key Visual Chiến dịch: {c.keyVisualSpec.theme}</span>
                          </span>
                          {c.keyVisualSpec.fonts && (
                            <span className="text-[11px] text-purple-700 font-medium">
                              Font: {c.keyVisualSpec.fonts}
                            </span>
                          )}
                        </div>
                        {c.keyVisualSpec.promoTextOnKv && (
                          <div className="text-[11px] text-purple-900">
                            <span className="font-semibold">Text CTKM trên KV:</span> &ldquo;{c.keyVisualSpec.promoTextOnKv}&rdquo;
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                          <div className="bg-white px-2 py-1 rounded border border-purple-100">
                            <span className="text-slate-500 block">Ngày lên Ref</span>
                            <strong className="text-slate-800">{c.keyVisualSpec.refDate || '—'}</strong>
                          </div>
                          <div className="bg-white px-2 py-1 rounded border border-purple-100">
                            <span className="text-slate-500 block">Ngày Order KV</span>
                            <strong className="text-slate-800">{c.keyVisualSpec.orderDate || '—'}</strong>
                          </div>
                          <div className="bg-white px-2 py-1 rounded border border-emerald-200">
                            <span className="text-emerald-700 block font-semibold">Ngày treo KV</span>
                            <strong className="text-emerald-800">{c.keyVisualSpec.hangDate || '—'}</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bảng Phân kỳ theo từng tháng (Monthly Phases Breakdown) */}
                    {c.monthlyPhases && c.monthlyPhases.length > 0 && (
                      <div className="rounded-lg border border-indigo-200 overflow-hidden text-xs">
                        <div className="bg-indigo-50/80 px-3 py-1.5 border-b border-indigo-200 flex items-center justify-between">
                          <span className="font-bold text-indigo-950 text-[11px]">
                            Phân kỳ triển khai theo từng tháng ({c.monthlyPhases.length} tháng)
                          </span>
                          <span className="text-[10px] text-indigo-700 font-semibold">
                            Tự động đồng bộ vào Kế hoạch tháng của Gian hàng
                          </span>
                        </div>
                        <div className="divide-y divide-slate-100 bg-white">
                          {c.monthlyPhases.map(p => {
                            const isSelectedMonth = selectedMonthFilter !== 'ALL' && p.month === selectedMonthFilter;
                            return (
                              <div
                                key={p.month}
                                className={`px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                                  isSelectedMonth ? 'bg-indigo-50/50' : ''
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white font-mono font-bold text-[10px]">
                                      {p.month}
                                    </span>
                                    <span className="font-semibold text-slate-900 text-xs">{p.phaseName}</span>
                                  </div>
                                  {p.saleMilestones && (
                                    <p className="text-[11px] text-slate-500">Mốc sale: {p.saleMilestones}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 shrink-0 text-[11px]">
                                  <div className="text-right">
                                    <span className="text-slate-400 block">Ngân sách tháng</span>
                                    <strong className="text-slate-900">{formatVndShort(p.allocatedBudget)}</strong>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-slate-400 block">Mục tiêu GMV</span>
                                    <strong className="text-emerald-700">{formatVndShort(p.targetGmv)}</strong>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-slate-400 block">Số KOC</span>
                                    <strong className="text-blue-700">{p.targetKocCount} KOC</strong>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* CIR & Financials */}
                    <div className="space-y-2 pt-1 text-xs">
                      {c.targetCir && (
                        <div className="flex items-center justify-between text-2xs pb-1 border-b border-slate-100">
                          <span className="text-slate-500">Mục tiêu CIR tổng chiến dịch (Chi phí / Doanh thu):</span>
                          <span className="font-semibold text-blue-700">{c.targetCir}%</span>
                        </div>
                      )}

                      <div>
                        <div className="flex justify-between text-2xs mb-1">
                          <span className="text-slate-500">
                            Tổng ngân sách Chiến dịch: <strong className="text-slate-800">{formatVndShort(c.spentBudget)}</strong> / {formatVndShort(c.budget)}
                          </span>
                          <span className="font-semibold text-blue-600">{budgetPercent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="data-bar h-full bg-blue-600 rounded-full" style={{ width: `${budgetPercent}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-2xs mb-1">
                          <span className="text-slate-500">
                            Tổng GMV đạt: <strong className="text-emerald-700">{formatVndShort(c.currentGmv)}</strong> / {formatVndShort(c.targetGmv)}
                          </span>
                          <span className="font-semibold text-emerald-600">{gmvPercent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="data-bar h-full bg-emerald-500 rounded-full" style={{ width: `${gmvPercent}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status & SLA Action */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200 mt-2">
                    <div className="text-xs flex items-center gap-1.5">
                      {c.briefStatus === 'HANDED_OFF_TO_CONTENT' || c.briefStatus === 'IN_PRODUCTION' || c.briefStatus === 'COMPLETED' ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="text-slate-700 font-medium">
                            Đã bàn giao nội dung ({c.contentPic || 'Quỳnh Như'})
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-2xs font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Đúng cam kết 24h
                          </span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-amber-500" />
                          <span className="text-slate-500 font-medium">Brief nháp — Chưa bàn giao</span>
                        </>
                      )}
                    </div>

                    {c.briefStatus === 'DRAFT' ? (
                      <button
                        onClick={() => handleHandoff(c.id)}
                        className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded shadow-sm flex items-center gap-1.5 transition"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Bàn giao nội dung</span>
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded text-2xs font-semibold flex items-center gap-1">
                        <span>Đang đồng bộ {coveredMonths.length} tháng</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
                      selectedBrandName === g.brandName
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span>{g.brandName}</span>
                    <span className={`text-2xs px-1.5 py-0.5 rounded-full ${
                      selectedBrandName === g.brandName ? 'bg-blue-700 text-white' : 'bg-white text-slate-500 border border-slate-200'
                    }`}>
                      {g.blacklistKeywords.length} cấm
                    </span>
                  </button>
                ))}
            </div>
          </div>

          {/* Active Brand Profile Header */}
          <div className="card-enterprise p-5 bg-blue-50/50 border-blue-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold text-slate-900">{currentGuideline.brandName}</h2>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                    {currentGuideline.category}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 max-w-3xl">
                  <strong>Định vị &amp; giọng văn:</strong> {currentGuideline.toneOfVoice}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  <strong>Khuyến cáo pháp lý / Nhận diện:</strong> {currentGuideline.logoRules}
                </p>
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
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(['KL1', 'KL2', 'KL3', 'KL4', 'KL5', 'KL6', 'KL7'] as const).map((tier) => {
                      const val = currentProfile.ratecard?.find((r) => r.grade === tier)?.maxBudget || 0;
                      return (
                        <span
                          key={tier}
                          className="px-2 py-0.5 rounded bg-white border border-blue-200 text-2xs font-medium text-slate-700"
                        >
                          <strong className="text-blue-700 font-mono">{tier}:</strong> {formatVndShort(val)}
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
                <p className="text-xs text-slate-500">
                  Dùng để kiểm tra kịch bản KOC trước khi gửi nhãn hàng duyệt
                </p>
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
            <div className="card-enterprise overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
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
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <span className="bg-rose-50 text-rose-800 px-2 py-0.5 rounded border border-rose-200">
                            &ldquo;{kw.keyword}&rdquo;
                          </span>
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
                              <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
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
              <p className="text-xs text-slate-500">
                Thông tin thành phần, công dụng và số lượng mẫu gửi KOC
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentGuideline.heroSkus.map((sku) => (
                <div key={sku.id} className="card-enterprise p-4 space-y-3 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-2xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
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

            <div className="text-xs text-slate-500">
              SLA phản hồi nhãn hàng: <strong className="text-blue-700">24h – 48h</strong>
            </div>
          </div>

          {/* VÒNG 1: PHÊ DUYỆT DANH SÁCH KOC */}
          {approvalSubTab === 'ROUND_1_KOC' && (
            <div className="space-y-4">
              <div className="card-enterprise overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
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
                            <p className="font-mono text-2xs text-slate-500">{item.dealCode}</p>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono px-2 py-0.5 rounded font-semibold text-xs bg-accent-soft text-accent border border-line">
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
                            <span className="flex items-center gap-1 text-2xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded w-fit border border-amber-200">
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
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              {item.salaryGrade}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">Nhãn: {item.brandName}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Mã deal: <span className="font-mono text-slate-700 font-semibold">{item.dealCode}</span> | Người nộp:{' '}
                            <span className="font-medium text-slate-700">{item.submittedBy}</span> lúc {item.submittedAt}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
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
          <div className="card-enterprise overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Bảng theo dõi hợp đồng thương hiệu</h3>
                <p className="text-xs text-slate-500">Đánh giá tiến độ ngân sách, doanh số GMV thực tế và tỷ lệ từ chối KOC</p>
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse">
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
                        <span className={`px-2 py-0.5 rounded font-semibold text-2xs ${
                          item.rejectionRate > 15
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-slate-100 text-slate-700'
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
      <Presence show={!!isAddKeywordModalOpen}>
      {isAddKeywordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white border border-slate-200 rounded-lg w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Thêm từ khóa bị chặn ({selectedBrandName})
                </h3>
              </div>
              <button
                onClick={() => setIsAddKeywordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddKeyword} className="p-5 space-y-3.5 text-xs">
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

              <div className="grid grid-cols-2 gap-3">
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

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddKeywordModalOpen(false)}
                  className="px-3 py-2 border border-slate-200 rounded font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded font-semibold transition"
                >
                  Lưu từ khóa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </Presence>

      {/* ========================================================================= */}
      {/* MODAL: TỪ CHỐI KOC HOẶC KỊCH BẢN (REJECT MODAL)                           */}
      {/* ========================================================================= */}
      <Presence show={!!rejectModalItem}>
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white border border-slate-200 rounded-lg w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-rose-50/50">
              <div className="flex items-center gap-2">
                <X className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Từ chối {rejectModalItem.submissionRound === 'ROUND_1_KOC' ? 'KOC đề xuất' : 'kịch bản KOC'}
                </h3>
              </div>
              <button
                onClick={() => setRejectModalItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
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

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectModalItem(null)}
                  className="px-3 py-2 border border-slate-200 rounded font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded font-semibold transition"
                >
                  Xác nhận từ chối
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </Presence>

      {/* ========================================================================= */}
      {/* MODAL: THÔNG BÁO BÀN GIAO THÀNH CÔNG                                      */}
      {/* ========================================================================= */}
      <Presence show={!!handoffSuccessModal}>
      {handoffSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white border border-slate-200 rounded-lg w-full max-w-sm shadow-2xl p-5 space-y-4 text-center animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Đã bàn giao brief</h3>
              <p className="text-xs text-slate-600 mt-1">
                Chiến dịch <strong>{handoffSuccessModal.title}</strong> đã được bàn giao sang nhóm nội dung.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-left space-y-1">
              <p><strong>SLA phản hồi:</strong> 24 giờ</p>
              <p><strong>Phụ trách nội dung:</strong> Quỳnh Như</p>
              <p><strong>Bước kế tiếp:</strong> Lập góc tiếp cận &amp; chọn danh sách KOC</p>
            </div>
            <button
              onClick={() => setHandoffSuccessModal(null)}
              className="w-full py-2 bg-primary hover:bg-primary-hover text-white font-semibold text-xs rounded transition"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
      </Presence>

      {/* ========================================================================= */}
      {/* MODAL: KIỂM TRA KỊCH BẢN                                                  */}
      {/* ========================================================================= */}
      <Presence show={!!aiScanModalData}>
      {aiScanModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white border border-slate-200 rounded-lg w-full max-w-2xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Kiểm tra kịch bản — KOC {aiScanModalData.item.kocName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Đối soát theo quy chuẩn nhãn hàng: <strong>{aiScanModalData.item.brandName}</strong> (Mã deal: {aiScanModalData.item.dealCode})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setAiScanModalData(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
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
                  <span className="text-2xs text-slate-500 font-medium">/ 100 điểm</span>
                </div>
              </div>

              {/* Dimensions breakdown */}
              <div className="space-y-2">
                <h5 className="font-semibold text-slate-900 text-2xs">
                  Chi tiết kiểm tra theo từng mục:
                </h5>
                <div className="grid grid-cols-1 gap-2">
                  {aiScanModalData.result.dimensions.map((dim, idx) => (
                    <div key={idx} className="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                      <div>
                        <span className="font-semibold text-slate-800">{dim.name}</span>
                        <p className="text-2xs text-slate-500">{dim.feedback}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-semibold text-slate-900">{dim.score}/{dim.maxScore}đ</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detected Issues */}
              {aiScanModalData.result.issues.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-semibold text-rose-900 text-2xs flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Các điểm cần chỉnh sửa ({aiScanModalData.result.issues.length}):</span>
                  </h5>
                  <div className="space-y-2">
                    {aiScanModalData.result.issues.map((issue) => (
                      <div key={issue.id} className="p-3 bg-rose-50/60 rounded border border-rose-200 space-y-1">
                        <div className="flex items-center justify-between font-semibold text-rose-900">
                          <span>{issue.title}</span>
                          <span className="text-2xs px-1.5 py-0.5 rounded bg-rose-200 text-rose-800">
                            {issue.severity === 'CRITICAL' ? 'Cần sửa ngay' : issue.severity === 'WARNING' ? 'Lưu ý' : 'Gợi ý'}
                          </span>
                        </div>
                        <p className="text-slate-700 text-2xs">{issue.rationale}</p>
                        {issue.replacementSuggestion && (
                          <p className="text-emerald-700 text-2xs font-semibold">
                            Cách viết thay thế: &ldquo;{issue.replacementSuggestion}&rdquo;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Rewritten Script */}
              <div className="p-3 bg-accent-soft rounded-md border border-line space-y-1.5 font-mono text-2xs">
                <span className="font-semibold text-ink font-sans block">
                  Nội dung kịch bản sau khi thay từ bị hạn chế:
                </span>
                <p className="whitespace-pre-line text-slate-800 bg-white p-2.5 rounded border border-line">
                  {aiScanModalData.result.rewrittenScript.fullText}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setAiScanModalData(null)}
                className="px-4 py-2 border border-slate-200 rounded font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Đóng
              </button>

              <div className="flex items-center gap-2">
                {aiScanModalData.result.issues.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const notes = aiScanModalData.result.issues.map(i => `• ${i.title}: ${i.rationale}`).join('\n');
                      setRejectCustomNote(notes);
                      setRejectReasonSelection('Lệch định vị phong cách thương hiệu');
                      setRejectModalItem(aiScanModalData.item);
                      setAiScanModalData(null);
                    }}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-semibold text-xs transition flex items-center gap-1.5"
                  >
                    <span>Chèn nhận xét vào phiếu từ chối</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    handleApproveItem(aiScanModalData.item.id);
                    setAiScanModalData(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-xs transition flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Duyệt kịch bản</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </Presence>
    </div>
  );
};
