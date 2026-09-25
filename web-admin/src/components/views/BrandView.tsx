'use client';

import React, { useState } from 'react';
import {
  Target,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Send,
  DollarSign,
  TrendingUp,
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
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
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Building,
  Layers,
  HelpCircle,
  BarChart3,
  Flame,
  Award,
  BookOpen,
  Filter,
  X,
  RefreshCw,
  Video,
  Info
} from 'lucide-react';
import {
  CampaignItem,
  BrandGuidelineAsset,
  BrandApprovalQueueItem,
  BrandRetainerHealth,
  BlacklistKeyword,
  BlacklistSeverity,
  HeroSkuItem,
  SalaryGrade
} from '../../lib/types';
import {
  INITIAL_CAMPAIGNS,
  INITIAL_BRAND_GUIDELINES,
  INITIAL_BRAND_APPROVAL_QUEUE,
  INITIAL_BRAND_RETAINER_HEALTH
} from '../../lib/mockData';
import { CampaignCreateModal } from '../CampaignCreateModal';

interface BrandViewProps {
  onCampaignCreatedNotification?: (campaign: CampaignItem) => void;
  onTriggerHandoffNotification?: (campaignTitle: string) => void;
}

type BrandViewTab = 'BRIEF_STUDIO' | 'GUIDELINE_HUB' | 'APPROVAL_GATE' | 'RETAINER_HEALTH';

export const BrandView: React.FC<BrandViewProps> = ({
  onCampaignCreatedNotification,
  onTriggerHandoffNotification,
}) => {
  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<BrandViewTab>('BRIEF_STUDIO');

  // Tab 1: Brief Studio State
  const [campaigns, setCampaigns] = useState<CampaignItem[]>(INITIAL_CAMPAIGNS);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'ACTIVE' | 'UPCOMING' | 'DRAFT'>('ALL');
  const [searchCampaign, setSearchCampaign] = useState('');
  const [handoffSuccessModal, setHandoffSuccessModal] = useState<CampaignItem | null>(null);

  // Tab 2: Brand Guideline & Asset Hub State
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

  // Tab 3: Brand Approval Gatekeeper State
  const [approvalQueue, setApprovalQueue] = useState<BrandApprovalQueueItem[]>(INITIAL_BRAND_APPROVAL_QUEUE);
  const [approvalSubTab, setApprovalSubTab] = useState<'ROUND_1_KOC' | 'ROUND_2_SCRIPT'>('ROUND_1_KOC');
  const [rejectModalItem, setRejectModalItem] = useState<BrandApprovalQueueItem | null>(null);
  const [rejectReasonSelection, setRejectReasonSelection] = useState<string>('Lệch định vị phong cách thương hiệu');
  const [rejectCustomNote, setRejectCustomNote] = useState('');

  // Tab 4: Retainer Health State
  const [retainerHealthList] = useState<BrandRetainerHealth[]>(INITIAL_BRAND_RETAINER_HEALTH);

  // Active Selected Guideline
  const currentGuideline = guidelines.find(g => g.brandName === selectedBrandName) || guidelines[0];

  // ----------------------------------------------------
  // HANDLERS FOR BRIEF STUDIO
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
      contentPic: c.contentPic || 'Quỳnh Như (Content Lead)'
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
      addedBy: 'Brand Manager',
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
  // CALCULATIONS & METRICS
  // ----------------------------------------------------
  const filteredCampaigns = campaigns.filter(c => {
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

  const totalCampaignBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
  const totalCampaignGmv = campaigns.reduce((sum, c) => sum + (c.currentGmv || 0), 0);
  const activeCampaignsCount = campaigns.filter(c => c.status === 'ACTIVE').length;

  const filteredKeywords = (currentGuideline?.blacklistKeywords || []).filter(k => {
    const matchSeverity = severityFilter === 'ALL' || k.severity === severityFilter;
    const matchSearch = !keywordSearch.trim()
      || k.keyword.toLowerCase().includes(keywordSearch.toLowerCase())
      || k.rationale.toLowerCase().includes(keywordSearch.toLowerCase())
      || (k.alternativeSuggestion && k.alternativeSuggestion.toLowerCase().includes(keywordSearch.toLowerCase()));
    return matchSeverity && matchSearch;
  });

  const pendingApprovals = approvalQueue.filter(i => i.status === 'PENDING');
  const pendingKocCount = pendingApprovals.filter(i => i.submissionRound === 'ROUND_1_KOC').length;
  const pendingScriptCount = pendingApprovals.filter(i => i.submissionRound === 'ROUND_2_SCRIPT').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 🌟 TOP WORKSPACE NAVIGATION TABS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('BRIEF_STUDIO')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'BRIEF_STUDIO'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Studio Soạn Thảo & Handoff Brief</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'BRIEF_STUDIO' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {campaigns.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('GUIDELINE_HUB')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'GUIDELINE_HUB'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Brand Guideline & Blacklist Hub</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'GUIDELINE_HUB' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {guidelines.length} Nhãn
            </span>
          </button>

          <button
            onClick={() => setActiveTab('APPROVAL_GATE')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'APPROVAL_GATE'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Cổng Thẩm Định KOC & Kịch Bản</span>
            {pendingApprovals.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-500 text-white animate-pulse">
                {pendingApprovals.length} chờ
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('RETAINER_HEALTH')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'RETAINER_HEALTH'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Sức Khỏe Hợp Đồng & Retainer P&L</span>
          </button>
        </div>

        {activeTab === 'BRIEF_STUDIO' && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-md shadow-sm transition flex items-center gap-2 self-start md:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Soạn Thảo Brief Mới</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: STUDIO SOẠN THẢO & BÀN GIAO BRIEF                                  */}
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
                <p className="text-[11px] text-slate-500 font-medium">Chiến Dịch Đang Chạy</p>
                <p className="text-lg font-bold text-slate-900">{activeCampaignsCount} / {campaigns.length}</p>
              </div>
            </div>

            <div className="card-enterprise p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-medium">Ngân Sách Triển Khai</p>
                <p className="text-lg font-bold text-slate-900">{(totalCampaignBudget / 1000000).toFixed(0)}M đ</p>
              </div>
            </div>

            <div className="card-enterprise p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-medium">GMV Đã Ghi Nhận</p>
                <p className="text-lg font-bold text-purple-700">{(totalCampaignGmv / 1000000).toFixed(0)}M đ</p>
              </div>
            </div>

            <div className="card-enterprise p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-medium">SLA Bàn Giao Content</p>
                <p className="text-lg font-bold text-slate-900">24h Cam Kết</p>
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-md border border-slate-200">
            <div className="flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-slate-400 text-xs flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Lọc:
              </span>
              {[
                { key: 'ALL', label: 'Tất cả' },
                { key: 'ACTIVE', label: 'Đang Thực Thi' },
                { key: 'UPCOMING', label: 'Kế Hoạch Sắp Chạy' },
                { key: 'DRAFT', label: 'Brief Chờ Bàn Giao' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedFilter(tab.key as any)}
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

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm mã code, chiến dịch, brand..."
                value={searchCampaign}
                onChange={(e) => setSearchCampaign(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
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
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {c.code}
                        </span>
                        <span className="text-xs font-semibold text-slate-900">{c.brand}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        c.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {c.status === 'ACTIVE' ? 'Đang Thực Thi' : 'Kế Hoạch'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 tracking-tight">{c.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Thời gian: <span className="font-medium text-slate-700">{c.startDate} ➔ {c.endDate}</span>
                      </p>
                    </div>

                    {/* Big Idea & Strategy Box */}
                    <div className="card-inner-box p-3 space-y-2 text-xs">
                      <div>
                        <span className="text-slate-500 font-semibold">💡 Big Idea:</span>{' '}
                        <span className="text-slate-800 font-medium italic">&ldquo;{c.bigIdea}&rdquo;</span>
                      </div>
                      {c.keyMessage && (
                        <div>
                          <span className="text-slate-500 font-semibold">📢 Key Message:</span>{' '}
                          <span className="text-slate-800 font-medium">{c.keyMessage}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-500 font-semibold">🎯 Target Persona:</span>{' '}
                        <span className="text-slate-700">{c.targetAudience}</span>
                      </div>
                      {c.heroSkus && c.heroSkus.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-slate-500 font-semibold">🏷️ Hero SKUs:</span>
                          {c.heroSkus.map((sku, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-700 font-medium">
                              {sku}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* CIR & Financials */}
                    <div className="space-y-2 pt-1 text-xs">
                      {c.targetCir && (
                        <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-100">
                          <span className="text-slate-500">Mục tiêu CIR (Chi phí / Doanh thu):</span>
                          <span className="font-bold text-blue-700">{c.targetCir}%</span>
                        </div>
                      )}

                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-500">
                            Ngân sách: <strong className="text-slate-800">{c.spentBudget.toLocaleString('vi-VN')} đ</strong> / {c.budget.toLocaleString('vi-VN')} đ
                          </span>
                          <span className="font-bold text-blue-600">{budgetPercent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${budgetPercent}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-500">
                            GMV Đạt: <strong className="text-emerald-700">{c.currentGmv.toLocaleString('vi-VN')} đ</strong> / {c.targetGmv.toLocaleString('vi-VN')} đ
                          </span>
                          <span className="font-bold text-emerald-600">{gmvPercent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${gmvPercent}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Handoff Status & SLA Action */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200 mt-2">
                    <div className="text-xs flex items-center gap-1.5">
                      {c.briefStatus === 'HANDED_OFF_TO_CONTENT' || c.briefStatus === 'IN_PRODUCTION' ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="text-slate-700 font-medium">
                            Đã giao Content ({c.contentPic || 'Quỳnh Như'})
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
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
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded shadow-sm flex items-center gap-1.5 transition"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Bàn Giao Content (SLA 24h)</span>
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded text-[11px] font-semibold flex items-center gap-1">
                        <span>Đang Thực Thi</span>
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
      {/* TAB 2: BRAND GUIDELINE & ASSET HUB                                        */}
      {/* ========================================================================= */}
      {activeTab === 'GUIDELINE_HUB' && (
        <div className="space-y-6">
          {/* Brand Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1 mr-1">
              <Building className="w-3.5 h-3.5" /> Chọn Nhãn Hàng:
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
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedBrandName === g.brandName ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {g.blacklistKeywords.length} cấm
                </span>
              </button>
            ))}
          </div>

          {/* Active Brand Profile Header */}
          <div className="card-enterprise p-5 bg-gradient-to-r from-blue-50/50 to-slate-50 border-blue-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">{currentGuideline.brandName}</h2>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                    {currentGuideline.category}
                  </span>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
                    {currentGuideline.toneTag.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 max-w-3xl">
                  <strong>Giọng văn & Phong cách (Tone of Voice):</strong> {currentGuideline.toneOfVoice}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  <strong>Quy tắc Logo & Bộ nhận diện:</strong> {currentGuideline.logoRules}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto">
                <button
                  onClick={() => setIsAddKeywordModalOpen(true)}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded shadow-sm flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Từ Khóa Blacklist</span>
                </button>
              </div>
            </div>
          </div>

          {/* SECTION A: BLACKLIST KEYWORD MANAGER */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Bộ Lọc Từ Khóa Cấm & Nhạy Cảm (Blacklist Keywords Vault)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Hệ thống tự động quét kịch bản KOC theo danh mục này trước khi gửi duyệt
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded p-1 text-xs">
                  <span className="text-[11px] text-slate-400 pl-1">Mức độ:</span>
                  {(['ALL', 'CRITICAL_BANNED', 'COMPETITOR_WARNING', 'SENSITIVE_POLICY'] as const).map(sev => (
                    <button
                      key={sev}
                      onClick={() => setSeverityFilter(sev)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                        severityFilter === sev
                          ? 'bg-slate-900 text-white font-semibold'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {sev === 'ALL' ? 'Tất cả' :
                       sev === 'CRITICAL_BANNED' ? 'Nghiêm Cấm' :
                       sev === 'COMPETITOR_WARNING' ? 'Đối Thủ' : 'Chính Sách'}
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
                    <th className="py-2.5 px-4">Từ Khóa Bị Chặn</th>
                    <th className="py-2.5 px-3">Mức Độ & Phân Loại</th>
                    <th className="py-2.5 px-4">Lý Do Cấm (Pháp Lý / Định Vị)</th>
                    <th className="py-2.5 px-4">Đề Xuất Thay Thế An Toàn</th>
                    <th className="py-2.5 px-3 text-right">Thao Tác</th>
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
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <span className="bg-rose-50 text-rose-800 px-2 py-0.5 rounded border border-rose-200">
                            &ldquo;{kw.keyword}&rdquo;
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {kw.severity === 'CRITICAL_BANNED' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1 w-fit">
                              <AlertOctagon className="w-3 h-3 text-red-700" /> Cấm Tuyệt Đối
                            </span>
                          )}
                          {kw.severity === 'COMPETITOR_WARNING' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 w-fit">
                              <AlertTriangle className="w-3 h-3 text-amber-700" /> Tránh Đối Thủ
                            </span>
                          )}
                          {kw.severity === 'SENSITIVE_POLICY' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1 w-fit">
                              <ShieldAlert className="w-3 h-3 text-purple-700" /> Nhạy Cảm Nền Tảng
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Quy Chuẩn Hình Ảnh Khuyến Khích (Visual Do&apos;s)</span>
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Điều Cấm Kỵ Trong Video / Hình Ảnh (Visual Don&apos;ts)</span>
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
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>Kho Tri Thức Sản Phẩm Chủ Lực (Hero SKUs & Stock Hub)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Tài liệu bằng chứng lâm sàng và tồn kho hàng mẫu dành cho KOC nhận booking
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentGuideline.heroSkus.map((sku) => (
                <div key={sku.id} className="card-enterprise p-4 space-y-3 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {sku.skuCode}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {sku.priceVnd.toLocaleString('vi-VN')} đ
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{sku.name}</h4>
                    <span className="text-[11px] text-slate-500 font-medium">Danh mục: {sku.category}</span>
                  </div>

                  {sku.clinicalClaims && (
                    <div className="p-2.5 rounded bg-blue-50/60 border border-blue-100 text-xs text-blue-900">
                      <span className="font-semibold">🔬 Bằng chứng lâm sàng:</span> {sku.clinicalClaims}
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-slate-600">Đặc tính nổi bật (USPs):</p>
                    <ul className="space-y-1 text-xs text-slate-700">
                      {sku.uspBulletPoints.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-blue-500 font-bold">•</span>
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
                      <span>Xem Gian Hàng</span>
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
      {/* TAB 3: CỔNG THẨM ĐỊNH KOC & KỊCH BẢN CUỐI (GATEKEEPER)                     */}
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
                <span>Vòng 1: Phê Duyệt Danh Sách KOC</span>
                {pendingKocCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-500 text-white">
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
                <span>Vòng 2: Phê Duyệt Kịch Bản & Góc Máy</span>
                {pendingScriptCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-500 text-white">
                    {pendingScriptCount}
                  </span>
                )}
              </button>
            </div>

            <div className="text-xs text-slate-500">
              SLA phản hồi Brand: <strong className="text-blue-700">24h - 48h</strong>
            </div>
          </div>

          {/* VÒNG 1: PHÊ DUYỆT DANH SÁCH KOC */}
          {approvalSubTab === 'ROUND_1_KOC' && (
            <div className="space-y-4">
              <div className="card-enterprise overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="py-2.5 px-4">KOC & Kênh</th>
                      <th className="py-2.5 px-3">Nhãn Hàng & Mã Deal</th>
                      <th className="py-2.5 px-3">Khung Lương (Tier KL)</th>
                      <th className="py-2.5 px-3">Giá Net Booking</th>
                      <th className="py-2.5 px-3">Tệp Kênh</th>
                      <th className="py-2.5 px-3">SLA Còn Lại</th>
                      <th className="py-2.5 px-3">Trạng Thái</th>
                      <th className="py-2.5 px-4 text-right">Quyết Định Brand</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {approvalQueue
                      .filter(i => i.submissionRound === 'ROUND_1_KOC')
                      .map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={item.avatarUrl}
                                alt={item.kocName}
                                className="w-8 h-8 rounded-full object-cover border border-slate-200"
                              />
                              <div>
                                <p className="font-bold text-slate-900">{item.kocName}</p>
                                <a
                                  href={`https://tiktok.com/${item.kocChannel}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  <span>{item.kocChannel}</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-semibold text-slate-900">{item.brandName}</p>
                            <p className="font-mono text-[10px] text-slate-500">{item.dealCode}</p>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono px-2 py-0.5 rounded font-bold text-xs bg-purple-50 text-purple-700 border border-purple-200">
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
                            <span className="flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded w-fit border border-amber-200">
                              <Clock className="w-3 h-3" /> Còn {item.remainingSlaHours}h
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {item.status === 'PENDING' && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                Chờ Brand Duyệt
                              </span>
                            )}
                            {item.status === 'APPROVED' && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3" /> Đã Phê Duyệt
                              </span>
                            )}
                            {item.status === 'REJECTED' && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                                Đã Từ Chối
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
                                  <span>Từ Chối</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Đã xử lý</span>
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
                        <img
                          src={item.avatarUrl}
                          alt={item.kocName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">{item.kocName}</h4>
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              {item.salaryGrade}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">Nhãn: {item.brandName}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Mã Deal: <span className="font-mono text-slate-700 font-semibold">{item.dealCode}</span> | Người nộp:{' '}
                            <span className="font-medium text-slate-700">{item.submittedBy}</span> lúc {item.submittedAt}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                          <Clock className="w-3.5 h-3.5" /> SLA Còn {item.remainingSlaHours}h
                        </span>
                        {item.status === 'PENDING' ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleApproveItem(item.id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-xs transition flex items-center gap-1.5 shadow-sm"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Duyệt Kịch Bản</span>
                            </button>
                            <button
                              onClick={() => setRejectModalItem(item)}
                              className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-300 rounded font-semibold text-xs transition flex items-center gap-1.5"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Yêu Cầu Sửa / Từ Chối</span>
                            </button>
                          </div>
                        ) : item.status === 'APPROVED' ? (
                          <span className="px-3 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Kịch Bản Đã Duyệt Cho Quay Demo
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                            Đã Từ Chối / Yêu Cầu Chỉnh Sửa
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 4-Part Script Structure */}
                    {item.scriptContent && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">Cấu Trúc Kịch Bản 4 Phần (Script Breakdown):</span>
                          <span>Thời lượng ước tính: <strong>{item.scriptContent.durationSeconds} giây</strong></span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                          {/* Part 1: Hook */}
                          <div className="p-3 rounded border border-blue-200 bg-blue-50/40 space-y-1">
                            <div className="flex items-center gap-1.5 text-blue-800 font-bold">
                              <span>🎣 1. Hook (3 Giây Đầu)</span>
                            </div>
                            <p className="text-slate-800 leading-relaxed font-medium">
                              &ldquo;{item.scriptContent.hook}&rdquo;
                            </p>
                          </div>

                          {/* Part 2: Pain Point */}
                          <div className="p-3 rounded border border-amber-200 bg-amber-50/40 space-y-1">
                            <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                              <span>⚡ 2. Nỗi Đau Khách Hàng</span>
                            </div>
                            <p className="text-slate-700 leading-relaxed">
                              {item.scriptContent.pain}
                            </p>
                          </div>

                          {/* Part 3: Solution & USP */}
                          <div className="p-3 rounded border border-emerald-200 bg-emerald-50/40 space-y-1">
                            <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                              <span>🌟 3. Giải Pháp & USPs</span>
                            </div>
                            <p className="text-slate-700 leading-relaxed font-medium">
                              {item.scriptContent.usp}
                            </p>
                          </div>

                          {/* Part 4: CTA */}
                          <div className="p-3 rounded border border-purple-200 bg-purple-50/40 space-y-1">
                            <div className="flex items-center gap-1.5 text-purple-800 font-bold">
                              <span>🛒 4. CTA Giỏ Hàng</span>
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
                        <strong>Lý do từ chối từ Brand:</strong> {item.rejectReason}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SỨC KHỎE HỢP ĐỒNG & HIỆU QUẢ NHÃN HÀNG (RETAINER P&L)               */}
      {/* ========================================================================= */}
      {activeTab === 'RETAINER_HEALTH' && (
        <div className="space-y-6">
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card-enterprise p-4">
              <p className="text-[11px] text-slate-500 font-medium">Tổng Ngân Sách Gói Retainer</p>
              <p className="text-xl font-bold text-slate-900 mt-1">1,320M đ</p>
              <p className="text-[11px] text-emerald-600 mt-1 font-semibold">Giải ngân 81.4%</p>
            </div>

            <div className="card-enterprise p-4">
              <p className="text-[11px] text-slate-500 font-medium">Tổng GMV Toàn Nhãn</p>
              <p className="text-xl font-bold text-purple-700 mt-1">8,980M đ</p>
              <p className="text-[11px] text-purple-600 mt-1 font-semibold">Đạt 92.6% chỉ tiêu</p>
            </div>

            <div className="card-enterprise p-4">
              <p className="text-[11px] text-slate-500 font-medium">ROI Danh Mục Trung Bình</p>
              <p className="text-xl font-bold text-emerald-700 mt-1">6.81x</p>
              <p className="text-[11px] text-slate-500 mt-1">Mục tiêu toàn sàn &gt; 5.0x</p>
            </div>

            <div className="card-enterprise p-4">
              <p className="text-[11px] text-slate-500 font-medium">Tỷ Lệ KOC Bị Brand Từ Chối</p>
              <p className="text-xl font-bold text-amber-700 mt-1">10.3%</p>
              <p className="text-[11px] text-slate-500 mt-1">Chuẩn an toàn &lt; 15%</p>
            </div>
          </div>

          {/* Retainer Health Master Table */}
          <div className="card-enterprise overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Bảng Quản Trị Sức Khỏe Hợp Đồng Brand (Retainer Health Matrix)</h3>
                <p className="text-xs text-slate-500">Đánh giá tiến độ ngân sách, doanh số GMV thực tế và rủi ro từ chối KOC</p>
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="py-2.5 px-4">Brand / Nhãn Hàng</th>
                  <th className="py-2.5 px-3">Phụ Trách (Account / Growth)</th>
                  <th className="py-2.5 px-4">Tiến Độ Ngân Sách</th>
                  <th className="py-2.5 px-4">Tiến Độ GMV</th>
                  <th className="py-2.5 px-3">ROI</th>
                  <th className="py-2.5 px-3">Tỷ Lệ Từ Chối KOC</th>
                  <th className="py-2.5 px-3">Trạng Thái Sức Khỏe</th>
                  <th className="py-2.5 px-4">Đánh Giá & Nhận Định</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {retainerHealthList.map((item) => {
                  const budgetPct = Math.min(100, Math.round((item.spentBudget / item.allocatedBudget) * 100));
                  const gmvPct = Math.min(100, Math.round((item.actualGmv / item.targetGmv) * 100));

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {item.brandName}
                      </td>
                      <td className="py-3 px-3">
                        <p className="text-slate-800 font-medium">{item.accountLead}</p>
                        <p className="text-[11px] text-slate-500">{item.growthLead}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-600 font-medium">
                              {(item.spentBudget / 1000000).toFixed(0)}M / {(item.allocatedBudget / 1000000).toFixed(0)}M
                            </span>
                            <span className="font-bold text-blue-600">{budgetPct}%</span>
                          </div>
                          <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${budgetPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-600 font-medium">
                              {(item.actualGmv / 1000000).toFixed(0)}M / {(item.targetGmv / 1000000).toFixed(0)}M
                            </span>
                            <span className="font-bold text-emerald-600">{gmvPct}%</span>
                          </div>
                          <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${gmvPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-700">
                        {item.roi.toFixed(2)}x
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                          item.rejectionRate > 15
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {item.rejectionRate}% ({item.rejectedKocsCount}/{item.activeKocsCount})
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {item.healthStatus === 'HEALTHY' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Khỏe Mạnh
                          </span>
                        )}
                        {item.healthStatus === 'WARNING' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Cần Tối Ưu
                          </span>
                        )}
                        {item.healthStatus === 'CRITICAL' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            Rủi Ro Cao
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px] max-w-sm">
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
      {isAddKeywordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Thêm Từ Khóa Bị Chặn ({selectedBrandName})
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
                  Từ Khóa Cần Chặn (Keyword) *
                </label>
                <input
                  type="text"
                  placeholder="VD: Trị dứt điểm mụn / 100% không kích ứng..."
                  value={newKeywordText}
                  onChange={(e) => setNewKeywordText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mức Độ Chặn *
                  </label>
                  <select
                    value={newKeywordSeverity}
                    onChange={(e) => setNewKeywordSeverity(e.target.value as BlacklistSeverity)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="CRITICAL_BANNED">Cấm Tuyệt Đối (Vi phạm y tế/pháp lý)</option>
                    <option value="COMPETITOR_WARNING">Tránh Đối Thủ (Cạnh tranh)</option>
                    <option value="SENSITIVE_POLICY">Nhạy Cảm Nền Tảng (Policy)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phân Loại *
                  </label>
                  <select
                    value={newKeywordCategory}
                    onChange={(e) => setNewKeywordCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="LEGAL_MEDICAL">Y Tế & Luật Quảng Cáo</option>
                    <option value="COMPETITOR">Tên Đối Thủ Cạnh Tranh</option>
                    <option value="SENSITIVE_POLICY">Chính Sách TikTok Shop</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Lý Do Cấm (Rationale) *
                </label>
                <textarea
                  rows={2}
                  placeholder="VD: Vi phạm quy định Bộ Y Tế cấm cam kết dứt điểm trong mỹ phẩm..."
                  value={newKeywordRationale}
                  onChange={(e) => setNewKeywordRationale(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Gợi Ý Từ Thay Thế Hợp Chuẩn (Alternative Suggestion)
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition"
                >
                  Lưu Từ Khóa Vào Blacklist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TỪ CHỐI KOC HOẶC KỊCH BẢN (REJECT MODAL)                           */}
      {/* ========================================================================= */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-rose-50/50">
              <div className="flex items-center gap-2">
                <X className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Từ Chối {rejectModalItem.submissionRound === 'ROUND_1_KOC' ? 'KOC Đề Xuất' : 'Kịch Bản KOC'}
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
                <p><strong>Brand:</strong> {rejectModalItem.brandName} | <strong>Deal:</strong> {rejectModalItem.dealCode}</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Chọn Lý Do Chuẩn Hóa *
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
                  Ghi Chú Chi Tiết Cho Booking / Content Team
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi rõ góp ý cụ thể để team đổi KOC khác hoặc sửa lại kịch bản..."
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
                  Xác Nhận Từ Chối
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: THÔNG BÁO BÀN GIAO THÀNH CÔNG                                      */}
      {/* ========================================================================= */}
      {handoffSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-sm shadow-2xl p-5 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Bàn Giao Brief Thành Công!</h3>
              <p className="text-xs text-slate-600 mt-1">
                Chiến dịch <strong>{handoffSuccessModal.title}</strong> đã được chuyển giao sang Content Studio.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-left space-y-1">
              <p>⏱️ <strong>SLA Phản hồi:</strong> 24 giờ</p>
              <p>👤 <strong>Content PIC:</strong> Quỳnh Như (Content Lead)</p>
              <p>🎯 <strong>Bước kế tiếp:</strong> Lập 4 góc máy &amp; tuyển chọn danh sách KOC</p>
            </div>
            <button
              onClick={() => setHandoffSuccessModal(null)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded transition"
            >
              Đã Hiểu & Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
