'use client';

import React, { useState, useMemo } from 'react';
import { formatVndShort } from '../../lib/format';
import { Button, ConfirmDialog, Field, Input, Modal, Select, Tabs, Textarea } from '../ui';
import { ContentPlanBoard } from './ContentPlanBoard';
import { BrandMonthlyPlanForm } from './BrandMonthlyPlanForm';
import { 
  CheckCircle, 
  RotateCcw, 
  Clock, 
  Eye, 
  Video, 
  Layers, 
  Share2,
  ExternalLink,
  FileText,
  Plus,
  Lightbulb,
  ShieldAlert,
  RefreshCw
} from 'lucide-react';
import { ScriptReviewItem, ContentItemModel, PublicationItemModel, KocItem, BookingDealItem } from '../../lib/types';
import { INITIAL_SCRIPTS, INITIAL_CONTENT_ITEMS, INITIAL_PUBLICATIONS, INITIAL_DEALS } from '../../lib/mockData';
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

type ContentSubTab = 'BRAND_PLAN' | 'CONTENT_PLAN' | 'CONTENT_ITEMS' | 'SCRIPTS' | 'DRAFT_VIDEOS' | 'PUBLICATIONS';

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

export const ContentView: React.FC<ContentViewProps> = ({ onScriptApprovedNotification, onNavigateToAngles, currentUserName, currentUserRole, onNotify, kocs, deals }) => {
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

  // State tạo kịch bản / brief mới
  const [isCreateScriptOpen, setIsCreateScriptOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState<string>('Kutieskin');
  const [newProductName, setNewProductName] = useState<string>('Kem bôi dịu da Kutieskin');
  const [newDealCode, setNewDealCode] = useState<string>(INITIAL_DEALS[0]?.dealCode || 'BO26_NEW_01');
  const [newCreatorName, setNewCreatorName] = useState<string>(INITIAL_SCRIPTS[0]?.kocName || 'Chanh Beauty');
  const [newPillar, setNewPillar] = useState<string>(PILLAR_OPTIONS[0]);
  const [newFormat, setNewFormat] = useState<string>(FORMAT_OPTIONS[0]);
  const [newAngleName, setNewAngleName] = useState<string>('');
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
        customSystemInstruction:
          'Bạn là nhân sự Content B2C. Viết kịch bản TikTok 4 phần ngắn gọn, thực tế, đi thẳng vào công dụng và cách dùng sản phẩm. Cấm dùng từ sáo rỗng quảng cáo ("đột phá", "siêu phẩm", "cứu tinh", "thần thánh", "chuẩn khoa học", "chuyển hóa rõ rệt", "sai lầm nghiêm trọng"). Tránh toàn bộ từ cấm của nhãn hàng. Trả về đúng JSON 5 trường: {"angle": "Tên góc tiếp cận", "hook": "Câu mở đầu 3s", "painPoint": "Tình huống thực tế của khách", "usp": "Cách dùng và điểm chính của sản phẩm", "cta": "Hướng dẫn bấm giỏ hàng kèm khuyến cáo pháp lý nếu có"}.',
        inputContextText: [
          `Thương hiệu: ${newBrandName}`,
          `Sản phẩm: ${newProductName}`,
          `Trụ cột nội dung: ${newPillar} | Định dạng: ${newFormat}`,
          `KOC thực hiện: ${newCreatorName}`,
          `Điểm chính của sản phẩm: ${usps || 'Hàng chính hãng, thông tin thành phần rõ ràng'}`,
          `Từ cấm không được dùng: ${bannedWords || 'Cam kết 100%, trị dứt điểm, thuốc đặc trị'}`,
          disclaimer ? `Câu khuyến cáo pháp lý bắt buộc: ${disclaimer}` : '',
        ].filter(Boolean).join('\n'),
      });

      const jsonMatch = res.outputText?.match(/\{[\s\S]*\}/);
      if (res.ok && jsonMatch) {
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
    if (!newHook.trim() || !newUsp.trim()) return;
    const nowTag = Date.now().toString().slice(-3);
    const newItem: ContentItemModel = {
      id: `cnt-${Date.now()}`,
      contentCode: `CNT-26-${nowTag}`,
      bookingDealId: `deal-${nowTag}`,
      dealCode: newDealCode.trim() || `BO26_${nowTag}`,
      campaignTitle: `${newBrandName} - ${newProductName}`,
      creatorName: newCreatorName.trim() || 'KOC UpBase',
      pillar: newPillar,
      angle: newAngleName.trim() || `${newPillar} - ${newProductName}`,
      format: 'VIDEO_SHORT_60S',
      channel: 'TIKTOK',
      scriptHook: newHook.trim(),
      scriptPainPoint: newPainPoint.trim(),
      scriptUsp: newUsp.trim(),
      scriptCta: newCta.trim(),
      scriptStatus: targetQueue === 'BOTH' ? 'PENDING' : 'APPROVED',
      revisionCount: 0,
      demoStatus: 'NOT_SUBMITTED',
      qcStatus: draftCompliance && draftCompliance.overallScore >= 80 ? 'PASS' : 'PENDING',
      qcChecklistNotes: draftCompliance ? draftCompliance.summaryVerdict : undefined,
    };

    setContentItems(prev => [newItem, ...prev]);

    if (targetQueue === 'BOTH') {
      const reviewItem: ScriptReviewItem = {
        id: `scr-${Date.now()}`,
        dealCode: newItem.dealCode,
        kocId: `koc-${nowTag}`,
        kocName: newItem.creatorName,
        kocTier: 'TIER_3_MICRO',
        campaignTitle: newItem.campaignTitle,
        pillar: newPillar,
        videoDuration: '45s - 60s',
        hook: newHook.trim(),
        painPoint: newPainPoint.trim(),
        solutionAndUsp: newUsp.trim(),
        callToAction: newCta.trim(),
        status: 'PENDING',
        remainingHours: 24,
        submittedBy: newItem.creatorName,
        submittedAt: 'Vừa tạo',
      };
      setScripts(prev => [reviewItem, ...prev]);
      setActiveSubTab('SCRIPTS');
    } else {
      setActiveSubTab('CONTENT_ITEMS');
    }

    setIsCreateScriptOpen(false);
  };

  const handleApprove = (scriptId: string) => {
    setScripts(prev => prev.map(item => item.id === scriptId ? { ...item, status: 'APPROVED', remainingHours: 0 } : item));
    const targetScript = scripts.find(s => s.id === scriptId);
    if (onScriptApprovedNotification && targetScript) {
      onScriptApprovedNotification(targetScript.dealCode);
    }
  };

  const handleRequestRevision = (scriptId: string, notes: string) => {
    setScripts(prev => prev.map(item => item.id === scriptId ? {
      ...item,
      status: 'REVISION_REQUESTED',
      feedbackNotes: notes
    } : item));
  };

  return (
    <div className="space-y-4">
      {/* Thanh tab và các nút thao tác trực tiếp, không giấu vào menu 3 chấm */}
      <Tabs<ContentSubTab>
        value={activeSubTab}
        onChange={setActiveSubTab}
        items={[
          { key: 'BRAND_PLAN', label: 'Plan tháng của Brand' },
    { key: 'CONTENT_PLAN', label: 'Kế hoạch content' },
          { key: 'CONTENT_ITEMS', label: 'Kho nội dung', count: contentItems.length },
          { key: 'SCRIPTS', label: 'Chờ duyệt kịch bản', count: scripts.filter(s => s.status === 'PENDING').length },
          { key: 'DRAFT_VIDEOS', label: 'Video nháp KOC' },
          { key: 'PUBLICATIONS', label: 'Đối soát bài đăng', count: publications.length },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {onNavigateToAngles && (
              <Button
                variant="secondary"
                icon={Layers}
                onClick={onNavigateToAngles}
              >
                Góc nội dung (Hồ sơ Brand)
              </Button>
            )}
            <Button
              variant="secondary"
              icon={FileText}
              onClick={() => setIsScriptReportOpen(true)}
            >
              Rà soát kịch bản & từ cấm
            </Button>
            <Button
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
              variant="secondary"
              icon={Lightbulb}
              onClick={() => setIsCopilotOpen(true)}
            >
              Gợi ý & Soát xét
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              onClick={handleOpenCreateScript}
            >
              Tạo kịch bản / Brief
            </Button>
          </div>
        }
      />

      {activeSubTab === 'BRAND_PLAN' && <BrandMonthlyPlanForm currentUserName={currentUserName} currentUserRole={currentUserRole} onNotify={onNotify} />}
      {activeSubTab === 'CONTENT_PLAN' && <ContentPlanBoard kocs={kocs} deals={deals} currentUserName={currentUserName} onNotify={onNotify} />}

      {/* View 0: Content Items Master Grid */}
      {activeSubTab === 'CONTENT_ITEMS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="card-enterprise overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent" />
                <span>Kho sản phẩm nội dung — Quản trị tách biệt với booking</span>
              </h3>
              <div className="flex items-center gap-2">
                {onNavigateToAngles && (
                  <Button size="sm" variant="secondary" icon={Lightbulb} onClick={onNavigateToAngles}>
                    Thẻ Brief & Góc SP
                  </Button>
                )}
                <Button size="sm" variant="primary" icon={Plus} onClick={handleOpenCreateScript}>
                  Soạn kịch bản mới
                </Button>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {contentItems.map((item) => (
                <div key={item.id} className="p-5 hover:bg-slate-50/60 transition space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span className="font-code text-accent font-semibold text-xs">{item.contentCode}</span>
                      <span className="text-ink-3 text-xs">· BO: <strong className="text-ink font-code">{item.dealCode}</strong></span>
                      <span className="text-ink font-semibold text-sm">{item.creatorName}</span>
                      <span className="text-2xs text-ink-3">· {item.pillar} · {item.format}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-2xs font-semibold ${
                        item.qcStatus === 'PASS' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        QC: {item.qcStatus === 'PASS' ? 'Đạt chuẩn xuất bản' : 'Cần thẩm định'}
                      </span>
                      <span className="text-2xs text-slate-500">Sửa: {item.revisionCount}/2 lần</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                    <div className="text-slate-600 font-medium">Góc tiếp cận: <strong className="text-slate-900">{item.angle}</strong></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-2xs">
                      <div><span className="text-accent font-semibold">Mở đầu:</span> <span className="text-slate-700">{item.scriptHook}</span></div>
                      <div><span className="text-rose-700 font-semibold">Nỗi đau:</span> <span className="text-slate-700">{item.scriptPainPoint}</span></div>
                      <div><span className="text-emerald-700 font-semibold">Giải pháp/USP:</span> <span className="text-slate-700">{item.scriptUsp}</span></div>
                      <div><span className="text-blue-700 font-semibold">CTA:</span> <span className="text-slate-700">{item.scriptCta}</span></div>
                    </div>
                    {item.qcChecklistNotes && (
                      <div className="pt-2 border-t border-slate-200 text-2xs text-emerald-700">
                        <strong>Ghi chú QC:</strong> {item.qcChecklistNotes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* View 1: Scripts Review Queue */}
      {activeSubTab === 'SCRIPTS' && (
        <div className="card-enterprise overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface">
            <h3 className="text-sm font-semibold text-ink">Hàng chờ thẩm định kịch bản KOC</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" icon={FileText} onClick={() => setIsScriptReportOpen(true)}>
                Rà soát từ cấm hàng loạt
              </Button>
              <Button size="sm" variant="primary" icon={Plus} onClick={handleOpenCreateScript}>
                Thêm kịch bản chờ duyệt
              </Button>
            </div>
          </div>

          <div className="divide-y divide-slate-200">
            {scripts.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedScript(item)}
                className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50/70 transition cursor-pointer group"
              >
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink text-sm group-hover:text-accent transition-colors">
                      {item.kocName}
                    </span>
                    <span className="text-2xs text-ink-3">
                      · {item.pillar} · <span className="font-code text-ink-2">{item.dealCode}</span>
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-800">
                    Mở đầu 3s: &ldquo;{item.hook}&rdquo;
                  </div>
                  <div className="text-xs text-slate-600">
                    USP: {item.solutionAndUsp}
                  </div>
                  <div className="text-2xs text-slate-500 pt-0.5">
                    Nộp bởi: <strong className="text-slate-700">{item.submittedBy}</strong> • {item.submittedAt}
                    {item.feedbackNotes && (
                      <span className="text-amber-700 block mt-1 font-semibold">Ghi chú sửa: {item.feedbackNotes}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {item.status === 'PENDING' ? (
                    <>
                      <span className="badge-amber px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        SLA còn {item.remainingHours}h
                      </span>
                      <button
                        onClick={() => setSelectedScript(item)}
                        className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Thẩm định kịch bản
                      </button>
                    </>
                  ) : item.status === 'APPROVED' ? (
                    <span className="badge-emerald px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" />
                      Đã duyệt
                    </span>
                  ) : (
                    <span className="badge-amber px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                      <RotateCcw className="w-4 h-4" />
                      Cần sửa
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View 2: Draft Videos Review */}
      {activeSubTab === 'DRAFT_VIDEOS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card-enterprise p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900 text-sm">Chanh Beauty Review — Video nháp 60s UV Test</span>
              <span className="badge-amber px-2 py-0.5 rounded text-2xs font-semibold">Chờ nghiệm thu</span>
            </div>
            <div className="aspect-video bg-sunken border border-line rounded-xl flex flex-col items-center justify-center text-ink-2 text-xs p-4 text-center">
              <Video className="w-10 h-10 text-accent mb-2 opacity-80" />
              <p className="font-semibold text-ink">Video nháp v1: Test Camera UV 8h ngoài trời</p>
              <p className="text-2xs text-ink-3 mt-1">KOC đã gắn nhãn giỏ hàng và hashtag #UpBeauty #MegaSale1010</p>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">Thời lượng: <strong className="text-slate-900">62 giây</strong></span>
              {approvedDraftVideos.has('DF-VID-1') ? (
                <span className="badge-emerald px-3 py-1 text-xs font-semibold inline-flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Đã duyệt lên sóng</span>
                </span>
              ) : (
                <button
                  onClick={() => setApprovingDraftVideo('DF-VID-1')}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Duyệt video lên sóng</span>
                </button>
              )}
            </div>
          </div>

          <div className="card-enterprise p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900 text-sm">Minh Đan Daily — Video review thu đông</span>
              <span className="badge-emerald px-2 py-0.5 rounded text-2xs font-semibold">Đã lên sóng</span>
            </div>
            <div className="aspect-video bg-sunken border border-line rounded-xl flex flex-col items-center justify-center text-ink-2 text-xs p-4 text-center">
              <Video className="w-10 h-10 text-positive mb-2 opacity-80" />
              <p className="font-semibold text-ink">TikTok: @danxinhdaily/video/74182910293847</p>
              <p className="text-2xs text-positive mt-1">Lượt xem hiện tại: 42.000 • GMV: 68.000.000&nbsp;₫</p>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">Nghiệm thu: <strong className="text-slate-900">Đạt chỉ tiêu</strong></span>
              <span className="text-xs text-emerald-700 font-semibold">Đủ điều kiện tất toán đợt 2</span>
            </div>
          </div>
        </div>
      )}

      {/* View 4: Publications (Bài Đăng Thực Tế & Đối Soát Mã Ads) */}
      {activeSubTab === 'PUBLICATIONS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="card-enterprise overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface">
              <div>
                <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-emerald-600" />
                  <span>Bài đăng thực tế & bàn giao mã Spark Ads</span>
                </h3>
              </div>
              <button
                onClick={() => {
                  setInspectInitialUrl('');
                  setIsVideoInspectorOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Kiểm tra & Nghiệm thu link video mới</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 text-2xs font-semibold">
                  <tr>
                    <th className="p-3.5 pl-6 w-[220px] min-w-[220px]">Mã & KOC</th>
                    <th className="p-3.5 w-[200px] min-w-[200px]">Link bài đăng & kênh</th>
                    <th className="p-3.5 w-[220px] min-w-[220px]">Mã ủy quyền Spark Ads</th>
                    <th className="p-3.5 w-[140px] min-w-[140px] font-mono">Lượt xem / Thích</th>
                    <th className="p-3.5 w-[160px] min-w-[160px] font-mono">GMV thực nhận</th>
                    <th className="p-3.5 w-[140px] min-w-[140px]">Hiệu quả</th>
                    <th className="p-3.5 pr-6 text-right w-[160px] min-w-[160px] sm:sticky sm:right-0 bg-slate-50 border-l border-slate-200">Đối soát</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {publications.map((pub) => (
                    <tr key={pub.id} className="hover:bg-blue-50/30 transition">
                      <td className="p-3.5 pl-6">
                        <span className="font-mono text-emerald-700 font-semibold block text-2xs">{pub.publicationCode}</span>
                        <span className="font-semibold text-slate-900 text-xs">{pub.creatorName}</span>
                        <div className="text-2xs text-slate-500">Mã nội dung: {pub.contentCode}</div>
                      </td>
                      <td className="p-3.5">
                        <a
                          href={pub.platformPostUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 text-2xs"
                        >
                          <span>{pub.platform}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <span className="text-2xs text-slate-500 block mt-0.5">Ngày đăng: {pub.publishedAt}</span>
                      </td>
                      <td className="p-3.5 font-mono">
                        {pub.sparkAdsCode ? (
                          <div className="text-2xs font-medium text-ink">
                            {pub.sparkAdsCode} ({pub.sparkAdsExpiryDays} ngày)
                          </div>
                        ) : (
                          <span className="text-2xs text-slate-400">Chưa cấp</span>
                        )}
                        <span className="text-2xs text-slate-500 block mt-0.5">
                          {pub.isMediaHandedOff ? 'Đã bàn giao nhóm Ads' : 'Chưa bàn giao Ads'}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono">
                        <div className="font-semibold text-slate-900">{(pub.viewsCount / 1000).toFixed(0)}k xem</div>
                        <div className="text-2xs text-slate-500">{(pub.likesCount / 1000).toFixed(1)}k thích</div>
                      </td>
                      <td className="p-3.5 font-mono">
                        <div className="font-semibold text-emerald-600 whitespace-nowrap">
                          {formatVndShort(pub.affiliateGmv)}
                        </div>
                        <div className="text-2xs text-slate-500">{pub.itemsSold} món bán</div>
                      </td>
                      <td className="p-3.5 font-mono">
                        <span className="text-xs font-semibold text-ink">
                          ROI: {pub.roi}x
                        </span>
                        <div className="text-2xs text-slate-500 mt-0.5">
                          CP: {formatVndShort(pub.costAttributed)}
                        </div>
                      </td>
                      <td className="p-3.5 pr-6 text-right sm:sticky sm:right-0 bg-surface group-hover:bg-canvas border-l border-slate-200 sm:shadow-[-3px_0_6px_rgba(0,0,0,0.03)]">
                        <div className="flex flex-col items-end gap-1">
                          <span className="px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Đã đối soát
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setInspectInitialUrl(pub.platformPostUrl);
                              setIsVideoInspectorOpen(true);
                            }}
                            className="text-2xs font-semibold text-blue-600 hover:underline cursor-pointer"
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
          </div>
        </div>
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
        onOpenChange={(open) => !open && setApprovingDraftVideo(null)}
        title="Xác nhận phê duyệt video nháp"
        description="Bạn có chắc chắn muốn phê duyệt video nháp này? Trạng thái sẽ được chuyển sang đội ngũ booking để kiểm tra link lên sóng và hoàn tất nghiệm thu hợp đồng."
        confirmLabel="Phê duyệt lên sóng"
        cancelLabel="Hủy"
        variant="primary"
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
        customSystemPrompt="Rà soát toàn bộ kịch bản chờ duyệt để phát hiện từ ngữ nhạy cảm/vi phạm chính sách sàn (cam kết 100%, trị dứt điểm, thuốc đặc trị, trắng tức thì...), kiểm tra kịch bản sắp trễ SLA 24h, và đánh giá chất lượng mở đầu (Hook 3s) kèm khuyến nghị chỉnh sửa cụ thể cho từng KOC."
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
                  const firstProd = prof?.products?.[0]?.name || `${nextBrand} - Sản phẩm trọng tâm`;
                  setNewProductName(firstProd);
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
                onChange={(e) => setNewProductName(e.target.value)}
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

          {draftCompliance && (
            <div
              className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                draftCompliance.complianceStatus === 'FAIL'
                  ? 'bg-rose-50/80 border-rose-200 text-rose-800'
                  : draftCompliance.complianceStatus === 'WARNING'
                    ? 'bg-amber-50/80 border-amber-200 text-amber-800'
                    : 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
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
