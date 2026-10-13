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
  FolderOpen
} from 'lucide-react';
import {
  CampaignItem,
  BrandGuidelineAsset,
  BrandApprovalQueueItem,
  BrandRetainerHealth,
  BlacklistKeyword,
  BlacklistSeverity,
  AiScriptAnalysisResult
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

interface BrandViewProps {
  onCampaignCreatedNotification?: (campaign: CampaignItem) => void;
  onTriggerHandoffNotification?: (campaignTitle: string) => void;
  onNavigateToCtvHub?: () => void;
  onNavigateToBrandKnowledge?: () => void;
}

type BrandViewTab = 'BRIEF_STUDIO' | 'GUIDELINE_HUB' | 'APPROVAL_GATE' | 'RETAINER_HEALTH';

export const BrandView: React.FC<BrandViewProps> = ({
  onCampaignCreatedNotification,
  onTriggerHandoffNotification,
  onNavigateToCtvHub,
  onNavigateToBrandKnowledge,
}) => {
  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<BrandViewTab>('BRIEF_STUDIO');

  // Tab 1: Brief State
  const [campaigns, setCampaigns] = useState<CampaignItem[]>(INITIAL_CAMPAIGNS);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'ACTIVE' | 'UPCOMING' | 'DRAFT'>('ALL');
  const [searchCampaign, setSearchCampaign] = useState('');
  const [handoffSuccessModal, setHandoffSuccessModal] = useState<CampaignItem | null>(null);

  // Tab 2: Brand Guideline & Asset State
  const [guidelines, setGuidelines] = useState<BrandGuidelineAsset[]>(INITIAL_BRAND_GUIDELINES);
  const [selectedBrandName, setSelectedBrandName] = useState<string>(
    INITIAL_BRAND_GUIDELINES[0]?.brandName || 'Senka'
  );
  const [keywordSearch, setKeywordSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | BlacklistSeverity>('ALL');
  const [isAddKeywordModalOpen, setIsAddKeywordModalOpen] = useState(false);
  const [copiedKeywordId, setCopiedKeywordId] = useState<string | null>(null);

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
    const brandKb = INITIAL_BRAND_KNOWLEDGE_BASES.find(b => b.brandName.toLowerCase().includes(item.brandName.toLowerCase())) || INITIAL_BRAND_KNOWLEDGE_BASES[0];
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
  // HANDLERS FOR BRIEF
  // ----------------------------------------------------
  const handleCreateCampaign = (newCamp: CampaignItem) => {
    setCampaigns(prev => [newCamp, ...prev]);
    if (onCampaignCreatedNotification) onCampaignCreatedNotification(newCamp);
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
  // HANDLERS FOR KEYWORDS & ASSETS
  // ----------------------------------------------------
  const handleCopySuggestion = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeywordId(id);
    setTimeout(() => setCopiedKeywordId(null), 2000);
  };

  const handleDeleteKeyword = (brandId: string, keywordId: string) => {
    setGuidelines(prev => prev.map(g => {
      if (g.id === brandId) {
        return {
          ...g,
          blacklistKeywords: g.blacklistKeywords.filter(k => k.id !== keywordId)
        };
      }
      return g;
    }));
  };

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeywordText.trim()) return;

    const newKw: BlacklistKeyword = {
      id: `bl-custom-${Date.now()}`,
      keyword: newKeywordText.trim(),
      category: newKeywordCategory,
      severity: newKeywordSeverity,
      rationale: newKeywordRationale || 'Quy chuẩn bảo vệ thương hiệu nội bộ Upbase.',
      alternativeSuggestion: newKeywordAlt.trim() || undefined,
      addedBy: 'Phụ trách thương hiệu',
      addedAt: new Date().toLocaleDateString('vi-VN')
    };

    setGuidelines(prev => prev.map(g => {
      if (g.brandName === selectedBrandName) {
        return {
          ...g,
          blacklistKeywords: [newKw, ...g.blacklistKeywords]
        };
      }
      return g;
    }));

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

      const matchSearch = !searchCampaign.trim()
        || c.title.toLowerCase().includes(searchCampaign.toLowerCase())
        || c.code.toLowerCase().includes(searchCampaign.toLowerCase())
        || c.brand.toLowerCase().includes(searchCampaign.toLowerCase());

      return matchStatus && matchSearch;
    });
  }, [campaigns, selectedFilter, searchCampaign]);

  const totalCampaignBudget = useMemo(() => campaigns.reduce((sum, c) => sum + (c.budget || 0), 0), [campaigns]);
  const totalCampaignGmv = useMemo(() => campaigns.reduce((sum, c) => sum + (c.currentGmv || 0), 0), [campaigns]);
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
        <Button variant="primary" icon={Plus} onClick={() => setIsCreateModalOpen(true)}>
          Soạn brief mới
        </Button>
      </PageActions>

      {/* TOP WORKSPACE NAVIGATION TABS */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs<BrandViewTab>
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'BRIEF_STUDIO', label: 'Soạn & bàn giao brief', count: campaigns.length },
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
      {/* TAB 1: SOẠN THẢO & BÀN GIAO BRIEF                                         */}
      {/* ========================================================================= */}
      {activeTab === 'BRIEF_STUDIO' && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card-enterprise p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xs text-slate-500 font-medium">Chiến dịch đang chạy</p>
                <p className="text-lg font-semibold text-slate-900">{activeCampaignsCount} / {campaigns.length}</p>
              </div>
            </div>

            <div className="card-enterprise p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xs text-slate-500 font-medium">Ngân sách triển khai</p>
                <p className="text-lg font-semibold text-slate-900">{formatVndShort(totalCampaignBudget)}</p>
              </div>
            </div>

            <div className="card-enterprise p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-accent-soft text-accent flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xs text-slate-500 font-medium">GMV đã ghi nhận</p>
                <p className="text-lg font-semibold text-accent">{formatVndShort(totalCampaignGmv)}</p>
              </div>
            </div>

            <div className="card-enterprise p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xs text-slate-500 font-medium">SLA bàn giao nội dung</p>
                <p className="text-lg font-semibold text-slate-900">24h cam kết</p>
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-md border border-slate-200">
            <div className="flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-slate-400 text-xs flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Lọc:
              </span>
              {([
                { key: 'ALL', label: 'Tất cả' },
                { key: 'ACTIVE', label: 'Đang chạy' },
                { key: 'UPCOMING', label: 'Kế hoạch sắp chạy' },
                { key: 'DRAFT', label: 'Brief chờ bàn giao' },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedFilter(tab.key)}
                  className={`px-3 py-1 rounded-md font-medium transition ${
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

          {/* Campaign Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredCampaigns.map((c) => {
              const budgetPercent = Math.min(100, Math.round((c.spentBudget / (c.budget || 1)) * 100));
              const gmvPercent = Math.min(100, Math.round((c.currentGmv / (c.targetGmv || 1)) * 100));

              return (
                <div key={c.id} className="card-enterprise p-5 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {c.code}
                        </span>
                        <span className="text-xs font-semibold text-slate-900">{c.brand}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                        c.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {c.status === 'ACTIVE' ? 'Đang chạy' : 'Kế hoạch'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 tracking-tight">{c.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Thời gian: <span className="font-medium text-slate-700">{c.startDate} → {c.endDate}</span>
                      </p>
                    </div>

                    {/* Big Idea & Strategy Box */}
                    <div className="card-inner-box p-3 space-y-2 text-xs">
                      <div>
                        <span className="text-slate-500 font-semibold">Ý tưởng chủ đạo:</span>{' '}
                        <span className="text-slate-800 font-medium italic">&ldquo;{c.bigIdea}&rdquo;</span>
                      </div>
                      {c.keyMessage && (
                        <div>
                          <span className="text-slate-500 font-semibold">Thông điệp chính:</span>{' '}
                          <span className="text-slate-800 font-medium">{c.keyMessage}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-500 font-semibold">Khách hàng mục tiêu:</span>{' '}
                        <span className="text-slate-700">{c.targetAudience}</span>
                      </div>
                      {c.heroSkus && c.heroSkus.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-slate-500 font-semibold">Sản phẩm chủ lực:</span>
                          {c.heroSkus.map((sku, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-2xs text-slate-700 font-medium">
                              {sku}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* CIR & Financials */}
                    <div className="space-y-2 pt-1 text-xs">
                      {c.targetCir && (
                        <div className="flex items-center justify-between text-2xs pb-1 border-b border-slate-100">
                          <span className="text-slate-500">Mục tiêu CIR (chi phí / doanh thu):</span>
                          <span className="font-semibold text-blue-700">{c.targetCir}%</span>
                        </div>
                      )}

                      <div>
                        <div className="flex justify-between text-2xs mb-1">
                          <span className="text-slate-500">
                            Ngân sách: <strong className="text-slate-800">{formatVndShort(c.spentBudget)}</strong> / {formatVndShort(c.budget)}
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
                            GMV đạt: <strong className="text-emerald-700">{formatVndShort(c.currentGmv)}</strong> / {formatVndShort(c.targetGmv)}
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
                      {c.briefStatus === 'HANDED_OFF_TO_CONTENT' || c.briefStatus === 'IN_PRODUCTION' ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="text-slate-700 font-medium">
                            Đã bàn giao nội dung ({c.contentPic || 'Quỳnh Như'})
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-2xs font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Còn 18h SLA
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
                        <span>Đang chạy</span>
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
          {/* Brand Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1 mr-1">
              <Building className="w-3.5 h-3.5" /> Chọn nhãn hàng:
            </span>
            {guidelines.map(g => (
              <button
                key={g.id}
                onClick={() => setSelectedBrandName(g.brandName)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-2 ${
                  selectedBrandName === g.brandName
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{g.brandName}</span>
                <span className={`text-2xs px-1.5 py-0.5 rounded-full ${
                  selectedBrandName === g.brandName ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {g.blacklistKeywords.length} cấm
                </span>
              </button>
            ))}
          </div>

          {/* Active Brand Profile Header */}
          <div className="card-enterprise p-5 bg-blue-50/50 border-blue-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">{currentGuideline.brandName}</h2>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                    {currentGuideline.category}
                  </span>
                  <span className="px-2 py-0.5 bg-accent-soft text-accent rounded text-xs font-semibold">
                    {currentGuideline.toneTag.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 max-w-3xl">
                  <strong>Giọng văn &amp; phong cách:</strong> {currentGuideline.toneOfVoice}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  <strong>Quy tắc logo &amp; bộ nhận diện:</strong> {currentGuideline.logoRules}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto">
                {onNavigateToBrandKnowledge && (
                  <button
                    onClick={onNavigateToBrandKnowledge}
                    className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded border border-slate-300 shadow-2xs flex items-center gap-1.5 transition"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span>Kho tài liệu &amp; đọc tệp</span>
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
          </div>

          {/* SECTION A: BLACKLIST KEYWORD MANAGER */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Bộ lọc từ khóa cấm &amp; nhạy cảm</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Hệ thống đối chiếu kịch bản KOC theo danh mục này trước khi gửi duyệt
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
                    <th className="py-2.5 px-4">Đề xuất thay thế an toàn</th>
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
                <span>Quy chuẩn hình ảnh khuyến khích</span>
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
                <span>Điều cấm kỵ trong video / hình ảnh</span>
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

          {/* SECTION C: HERO SKUS KNOWLEDGE BASE */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>Kho tri thức sản phẩm chủ lực</span>
              </h3>
              <p className="text-xs text-slate-500">
                Tài liệu bằng chứng lâm sàng và tồn kho hàng mẫu dành cho KOC nhận booking
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
                      <span className="font-semibold">Bằng chứng lâm sàng:</span> {sku.clinicalClaims}
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-2xs font-semibold text-slate-600">Đặc tính nổi bật:</p>
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
                      <th className="py-2.5 px-3">Giá net booking</th>
                      <th className="py-2.5 px-3">Tệp kênh</th>
                      <th className="py-2.5 px-3">SLA còn lại</th>
                      <th className="py-2.5 px-3">Trạng thái</th>
                      <th className="py-2.5 px-4 text-right">Quyết định</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {approvalQueue
                      .filter(i => i.submissionRound === 'ROUND_1_KOC')
                      .map((item) => (
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
                          <td className="py-3 px-3 font-semibold text-slate-800">
                            {item.quoteNet.toLocaleString('vi-VN')} đ
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
                      ))}
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
              <p className="text-2xs text-slate-500 font-medium">Tổng ngân sách gói Retainer</p>
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
        onClose={() => setIsCreateModalOpen(false)}
        onCampaignCreated={handleCreateCampaign}
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

              {/* 5 Dimensions breakdown */}
              <div className="space-y-2">
                <h5 className="font-semibold text-slate-900 text-2xs">
                  5 trục đánh giá tuân thủ:
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
                    <span>Lỗi &amp; rủi ro phát hiện ({aiScanModalData.result.issues.length}):</span>
                  </h5>
                  <div className="space-y-2">
                    {aiScanModalData.result.issues.map((issue) => (
                      <div key={issue.id} className="p-3 bg-rose-50/60 rounded border border-rose-200 space-y-1">
                        <div className="flex items-center justify-between font-semibold text-rose-900">
                          <span>{issue.title}</span>
                          <span className="text-2xs px-1.5 py-0.5 rounded bg-rose-200 text-rose-800">
                            {issue.severity}
                          </span>
                        </div>
                        <p className="text-slate-700 text-2xs">{issue.rationale}</p>
                        {issue.replacementSuggestion && (
                          <p className="text-emerald-700 text-2xs font-semibold">
                            Đề xuất thay thế: &ldquo;{issue.replacementSuggestion}&rdquo;
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
                  Gợi ý kịch bản sửa:
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
