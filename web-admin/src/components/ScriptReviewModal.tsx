'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Presence } from './ui';
import {
  X,
  CheckCircle,
  RotateCcw,
  Clock,
  FileText,
  CheckSquare,
  MessageSquare,
  ShieldAlert,
  AlertTriangle,
  Sliders,
  Save,
  RefreshCw,
} from 'lucide-react';
import { ScriptReviewItem } from '../lib/types';
import { analyzeScriptWithAi } from '../lib/aiScriptAnalyzer';
import {
  brandProfileToKnowledgeBase,
  findBrandProfile,
  useBrandProfiles,
} from '../lib/brands/useBrandProfiles';
import {
  loadApiWorkspaceConfig,
  getEffectiveConfigForPurpose,
} from '../lib/apiKeyConfig';
import { executeOperationalReport, OperationalReportResult } from '../lib/operationalReportService';
import { InlinePurposeApiSetup } from './InlinePurposeApiSetup';

interface ScriptReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  script: ScriptReviewItem | null;
  onApproveScript: (scriptId: string) => void;
  onRequestRevision: (scriptId: string, notes: string) => void;
}

export const ScriptReviewModal: React.FC<ScriptReviewModalProps> = ({
  isOpen,
  onClose,
  script,
  onApproveScript,
  onRequestRevision,
}) => {
  const { profiles } = useBrandProfiles();
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [isRevisionMode, setIsRevisionMode] = useState(false);
  const [revisionRound, setRevisionRound] = useState<number>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedBrandName, setSelectedBrandName] = useState<string>('');

  // Thiết lập câu lệnh (Prompt) & Nhận xét kịch bản (SCRIPT_REVIEW)
  const [showPromptEditor, setShowPromptEditor] = useState<boolean>(false);
  const [scriptPrompt, setScriptPrompt] = useState<string>(() => {
    const cfg = loadApiWorkspaceConfig();
    return getEffectiveConfigForPurpose('SCRIPT_REVIEW', cfg).purpose.systemInstruction;
  });
  const [promptToast, setPromptToast] = useState<string | null>(null);
  const [isRunningLlmReview, setIsRunningLlmReview] = useState<boolean>(false);
  const [llmReviewResult, setLlmReviewResult] = useState<OperationalReportResult | null>(null);

  // Checklists
  const [checkUsp, setCheckUsp] = useState(true);
  const [checkNoBannedKeywords, setCheckNoBannedKeywords] = useState(true);
  const [checkCallToAction, setCheckCallToAction] = useState(true);
  const [checkDuration, setCheckDuration] = useState(true);

  // Tự động nhận diện thương hiệu từ tên chiến dịch hoặc nội dung kịch bản
  const detectedBrandProfile = useMemo(() => {
    if (!script || !profiles.length) return undefined;
    if (selectedBrandName) {
      const explicit = findBrandProfile(profiles, selectedBrandName);
      if (explicit) return explicit;
    }
    const combinedText = `${script.campaignTitle} ${script.hook} ${script.solutionAndUsp}`.toLowerCase();
    return (
      profiles.find(p => combinedText.includes(p.brandName.toLowerCase())) ||
      findBrandProfile(profiles, script.campaignTitle) ||
      profiles[0]
    );
  }, [script, profiles, selectedBrandName]);

  const workflowRules = detectedBrandProfile?.workflowRules;
  const maxFreeRevisions = workflowRules?.maxFreeRevisions ?? 2;
  const isOverFreeRevisionLimit = revisionRound > maxFreeRevisions;

  // Chạy đối soát tự động với Từ cấm, Điểm nổi bật & Pháp lý trong Hồ sơ thương hiệu
  const complianceResult = useMemo(() => {
    if (!script || !detectedBrandProfile) return null;
    const kb = brandProfileToKnowledgeBase(detectedBrandProfile);
    const fullText = `${script.hook}\n${script.painPoint}\n${script.solutionAndUsp}\n${script.callToAction}`;
    return analyzeScriptWithAi(fullText, kb);
  }, [script, detectedBrandProfile]);

  const bannedIssues = useMemo(
    () => (complianceResult?.issues || []).filter(i => i.type === 'BLACKLIST_WORD' || i.type === 'MISSING_DISCLAIMER'),
    [complianceResult],
  );

  // Đồng bộ trạng thái checklist theo kết quả quét từ cấm thực tế
  useEffect(() => {
    if (!isOpen || !script) return;
    setSelectedBrandName('');
    setIsRevisionMode(false);
    setRevisionRound(1);
    setFeedbackNotes('');
    setErrorMsg(null);
    setLlmReviewResult(null);
    const cfg = loadApiWorkspaceConfig();
    setScriptPrompt(getEffectiveConfigForPurpose('SCRIPT_REVIEW', cfg).purpose.systemInstruction);
  }, [isOpen, script]);

  useEffect(() => {
    if (!complianceResult) return;
    const hasBanned = complianceResult.issues.some(i => i.type === 'BLACKLIST_WORD');
    const hasMissingUsp = complianceResult.issues.some(i => i.type === 'MISSING_USP');
    setCheckNoBannedKeywords(!hasBanned);
    setCheckUsp(!hasMissingUsp);
  }, [complianceResult]);

  // Keyboard accessibility: ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !script) return <Presence show={false} />;

  const handleApprove = () => {
    onApproveScript(script.id);
    onClose();
  };

  const handleAutoFillRevisionFromProfile = () => {
    if (!complianceResult || !detectedBrandProfile) return;
    const lines: string[] = [];
    for (const iss of complianceResult.issues) {
      if (iss.type === 'BLACKLIST_WORD') {
        lines.push(
          `- Xóa từ cấm "${iss.detectedText}" (${iss.rationale})${
            iss.replacementSuggestion ? ` → Đổi thành: "${iss.replacementSuggestion}"` : ''
          }`,
        );
      } else if (iss.type === 'MISSING_DISCLAIMER') {
        lines.push(`- Bổ sung câu cảnh báo pháp lý bắt buộc: "${iss.replacementSuggestion || ''}"`);
      } else if (iss.type === 'MISSING_USP') {
        lines.push(`- Nhấn mạnh rõ điểm nổi bật sản phẩm (${iss.replacementSuggestion || ''})`);
      }
    }
    if (detectedBrandProfile.contentRules?.mandatoryHashtags?.length) {
      lines.push(`- Gắn đủ hashtag bắt buộc: ${detectedBrandProfile.contentRules.mandatoryHashtags.join(' ')}`);
    }
    if (lines.length === 0) {
      lines.push(`- Điều chỉnh lại câu chữ bám sát định vị nhãn hàng ${detectedBrandProfile.brandName}.`);
    }
    const prefix = isOverFreeRevisionLimit
      ? `[LẦN SỬA THỨ ${revisionRound} — VƯỢT ĐỊNH MỨC ${maxFreeRevisions} LẦN MIỄN PHÍ CỦA NHÃN ${detectedBrandProfile.brandName}]\n`
      : '';
    setFeedbackNotes(
      `${prefix}Yêu cầu chỉnh sửa theo Hồ sơ thương hiệu ${detectedBrandProfile.brandName}:\n${lines.join('\n')}`,
    );
    setIsRevisionMode(true);
    setErrorMsg(null);
  };

  const handleSendRevision = () => {
    if (!feedbackNotes.trim()) {
      setErrorMsg('Vui lòng nhập ghi chú phản hồi để KOC biết cần chỉnh sửa điểm nào.');
      return;
    }
    setErrorMsg(null);
    onRequestRevision(script.id, feedbackNotes);
    setIsRevisionMode(false);
    onClose();
  };

  return (
    <Presence show>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto animate-in fade-in duration-(--motion-base)"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="script-review-title"
      >
        <div
          data-motion-panel
          className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter"
        >
          {/* Header - Enterprise Light */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 bg-slate-50/80 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent-soft border border-line text-accent flex items-center justify-center shadow-2xs shrink-0">
                <FileText className="w-5 h-5 text-accent" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 id="script-review-title" className="text-sm font-semibold text-slate-900">
                    Duyệt kịch bản KOC
                  </h3>
                  <span className="text-2xs font-mono text-ink-3">
                    {script.dealCode}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  KOC: <strong className="text-slate-900">{script.kocName}</strong> · {script.campaignTitle}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              aria-label="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {/* Metadata Bar + Brand Profile Selector */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700">
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  Phân loại: <strong className="text-accent">{script.pillar}</strong>
                </span>
                <span>
                  Thời lượng: <strong className="text-slate-900">{script.videoDuration}</strong>
                </span>
                <label className="flex items-center gap-1.5">
                  <span className="text-slate-500">Hồ sơ nhãn:</span>
                  <select
                    value={detectedBrandProfile?.brandName || ''}
                    onChange={(e) => setSelectedBrandName(e.target.value)}
                    className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-semibold text-blue-700 focus:outline-none focus:border-blue-500"
                  >
                    {profiles.map(p => (
                      <option key={p.key} value={p.brandName}>
                        {p.brandName} ({p.contentRules?.banned.length || 0} từ cấm)
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-1.5">
                  <span className="text-slate-500">Lần sửa:</span>
                  <select
                    value={revisionRound}
                    onChange={(e) => setRevisionRound(Number(e.target.value))}
                    className={`bg-white border rounded px-2 py-0.5 text-xs font-semibold focus:outline-none ${
                      isOverFreeRevisionLimit ? 'border-rose-400 text-rose-700' : 'border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value={1}>Lần 1 (Miễn phí)</option>
                    <option value={2}>Lần 2 (Miễn phí)</option>
                    <option value={3}>Lần 3 (Kiểm tra định mức)</option>
                    <option value={4}>Lần 4 (Ngoài định mức)</option>
                  </select>
                </label>
              </div>
              <span className="text-xs font-medium flex items-center gap-1.5 text-warning">
                <Clock className="w-3.5 h-3.5" />
                SLA còn {script.remainingHours > 0 ? `${script.remainingHours}h` : 'Đã nghiệm thu'}
              </span>
            </div>

            {/* Quy tắc SLA duyệt kịch bản & giới hạn chỉnh sửa từ Hồ sơ thương hiệu */}
            {workflowRules && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 text-2xs text-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <strong>Quy định phê duyệt của {detectedBrandProfile?.brandName}:</strong>{' '}
                    {workflowRules.requireScriptApproval ? 'Bắt buộc duyệt kịch bản' : 'Không bắt buộc nhãn duyệt kịch bản'}
                    {' · '}
                    {workflowRules.requireDemoApproval ? 'Có duyệt video nháp' : 'Không duyệt video nháp'}
                  </span>
                  <span className="font-semibold text-blue-700">
                    Tự động cho phép đăng sau {workflowRules.autoAirAfterHours}h · Tối đa {workflowRules.maxFreeRevisions} lần sửa miễn phí
                  </span>
                </div>
                {isOverFreeRevisionLimit && (
                  <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                    <span>
                      Cảnh báo: Yêu cầu sửa lần thứ {revisionRound} vượt định mức {workflowRules.maxFreeRevisions} lần sửa miễn phí trong Hồ sơ thương hiệu {detectedBrandProfile?.brandName}. Cần xác nhận phụ phí với nhãn hàng nếu sửa ngoài brief ban đầu.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* BẢNG ĐỐI SOÁT TỪ CẤM & PHÁP LÝ TRỰC TIẾP TỪ HỒ SƠ THƯƠNG HIỆU */}
            {complianceResult && detectedBrandProfile && (
              <div
                className={`p-4 rounded-lg border space-y-3 ${
                  bannedIssues.length > 0
                    ? 'bg-rose-50/70 border-rose-200'
                    : complianceResult.overallScore >= 80
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : 'bg-amber-50/60 border-amber-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert
                      className={`w-4 h-4 ${
                        bannedIssues.length > 0
                          ? 'text-rose-600'
                          : complianceResult.overallScore >= 80
                            ? 'text-emerald-600'
                            : 'text-amber-600'
                      }`}
                    />
                    <span className="text-xs font-semibold text-slate-900">
                      Kiểm tra từ cấm &amp; pháp lý ({detectedBrandProfile.brandName})
                    </span>
                    <span
                      className={`text-2xs font-semibold font-mono ${
                        bannedIssues.length > 0
                          ? 'text-critical'
                          : complianceResult.overallScore >= 80
                            ? 'text-positive'
                            : 'text-warning'
                      }`}
                    >
                      · Đạt {complianceResult.overallScore}/100 điểm
                    </span>
                  </div>

                  {complianceResult.issues.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAutoFillRevisionFromProfile}
                      className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-rose-700 border border-rose-300 text-2xs font-semibold transition shadow-2xs"
                    >
                      Điền nội dung yêu cầu sửa ({complianceResult.issues.length} mục)
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-700">{complianceResult.summaryVerdict}</p>

                {complianceResult.issues.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {complianceResult.issues.map(issue => (
                      <div
                        key={issue.id}
                        className="p-2.5 rounded bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                            <AlertTriangle
                              className={`w-3.5 h-3.5 shrink-0 ${
                                issue.severity === 'CRITICAL' ? 'text-rose-600' : 'text-amber-600'
                              }`}
                            />
                            <span>{issue.title}</span>
                          </div>
                          <p className="text-2xs text-slate-500">{issue.rationale}</p>
                        </div>
                        {issue.replacementSuggestion && (
                          <span className="text-positive text-2xs font-medium shrink-0">
                            Gợi ý sửa: &ldquo;{issue.replacementSuggestion}&rdquo;
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Tóm tắt danh mục từ cấm, nỗi đau khách hàng & hashtag bắt buộc của nhãn để người duyệt tra cứu nhanh */}
                <div className="pt-2 border-t border-slate-200/80 space-y-1.5 text-2xs">
                  {(detectedBrandProfile.contentRules?.banned.length || 0) > 0 && (
                    <div className="text-slate-600">
                      <span className="text-slate-500 font-medium">
                        Từ cấm trong hồ sơ {detectedBrandProfile.brandName}:{' '}
                      </span>
                      <span className="text-critical font-medium">
                        {detectedBrandProfile.contentRules!.banned.map(b => b.phrase).join(', ')}
                      </span>
                    </div>
                  )}
                  {(detectedBrandProfile.positioning?.painPoints?.length || 0) > 0 && (
                    <div className="text-slate-600">
                      <strong>Góc nỗi đau khách hàng chuẩn của nhãn:</strong>{' '}
                      {detectedBrandProfile.positioning!.painPoints!.slice(0, 2).join(' · ')}
                    </div>
                  )}
                  {(detectedBrandProfile.positioning?.barriersToTrial?.length || 0) > 0 && (
                    <div className="text-slate-600">
                      <strong>Rào cản mua hàng cần giải đáp trong clip:</strong>{' '}
                      {detectedBrandProfile.positioning!.barriersToTrial!.slice(0, 2).join(' · ')}
                    </div>
                  )}
                  {(detectedBrandProfile.contentRules?.mandatoryHashtags?.length || 0) > 0 && (
                    <div className="text-slate-600">
                      <strong>Hashtag &amp; thời lượng bắt buộc:</strong>{' '}
                      {detectedBrandProfile.contentRules!.mandatoryHashtags!.join(' ')}{' '}
                      {detectedBrandProfile.contentRules?.videoDurationRule ? `(${detectedBrandProfile.contentRules.videoDurationRule})` : ''}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4 Structural Script Sections */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-800">Nội dung kịch bản chi tiết</h4>

              {/* Section 1: Hook */}
              <div className="p-3.5 bg-blue-50/50 rounded-lg border border-blue-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-700">Đoạn mở đầu (0–3 giây đầu)</span>
                  <span className="text-2xs text-slate-500 font-medium">Tình huống mở đầu</span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed italic">&ldquo;{script.hook}&rdquo;</p>
              </div>

              {/* Section 2: Pain Point */}
              <div className="p-3.5 bg-amber-50/50 rounded-lg border border-amber-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-700">Vấn đề người dùng (3–15 giây)</span>
                  <span className="text-2xs text-slate-500 font-medium">Tình trạng thường gặp</span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed">{script.painPoint}</p>
              </div>

              {/* Section 3: Solution & USP */}
              <div className="p-3.5 bg-emerald-50/50 rounded-lg border border-emerald-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-700">
                    Giới thiệu sản phẩm (15–45 giây)
                  </span>
                  <span className="text-2xs text-slate-500 font-medium">Công dụng &amp; thành phần chính</span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed">{script.solutionAndUsp}</p>
              </div>

              {/* Section 4: CTA */}
              <div className="p-3.5 bg-accent-soft rounded-lg border border-line space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-accent">Điều hướng mua hàng (45–60 giây)</span>
                  <span className="text-2xs text-slate-500 font-medium">Gắn giỏ hàng &amp; ưu đãi</span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed">{script.callToAction}</p>
              </div>
            </div>

            {/* Quality Audit Checklist */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
              <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                Danh mục kiểm duyệt tiêu chuẩn nền tảng &amp; thương hiệu
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkUsp}
                    onChange={(e) => setCheckUsp(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Đúng thông điệp sản phẩm &amp; quy chuẩn thương hiệu</span>
                </label>
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkNoBannedKeywords}
                    onChange={(e) => setCheckNoBannedKeywords(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Không vi phạm từ cấm trong Hồ sơ thương hiệu</span>
                </label>
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkCallToAction}
                    onChange={(e) => setCheckCallToAction(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Có lời kêu gọi nhấp giỏ hàng góc trái rõ ràng</span>
                </label>
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkDuration}
                    onChange={(e) => setCheckDuration(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Thời lượng quay thực tế đạt chuẩn (60–90s)</span>
                </label>
              </div>
            </div>

            {/* Khung Thiết lập Câu lệnh (Prompt) & Nhận xét Biên tập Kịch bản */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-slate-800">
                    Biên tập kịch bản theo câu lệnh (Prompt phân hệ SCRIPT_REVIEW)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPromptEditor(v => !v)}
                    className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    {showPromptEditor ? 'Ẩn cấu hình API & câu lệnh' : 'Cấu hình API & câu lệnh'}
                  </button>
                  <button
                    type="button"
                    disabled={isRunningLlmReview}
                    onClick={async () => {
                      setIsRunningLlmReview(true);
                      try {
                        const latestPrompt = getEffectiveConfigForPurpose('SCRIPT_REVIEW').purpose.systemInstruction;
                        const inputContext = [
                          `[DỮ LIỆU PHÂN HỆ: Kiểm Duyệt & Biên Tập Kịch Bản Video KOC]`,
                          `- Nhãn hàng: ${detectedBrandProfile?.brandName || script.campaignTitle}`,
                          `- Chiến dịch: ${script.campaignTitle} | KOC: ${script.kocName} (${script.kocId})`,
                          `- Từ cấm của nhãn hàng: ${(detectedBrandProfile?.contentRules?.banned?.map((b) => b.phrase) || []).join(', ') || 'Không có'}`,
                          `- Mở đầu (3s): ${script.hook}`,
                          `- Nỗi đau (Pain Point): ${script.painPoint}`,
                          `- Giải pháp & USP: ${script.solutionAndUsp}`,
                          `- Kêu gọi hành động (CTA): ${script.callToAction}`,
                        ].join('\n');
                        const res = await executeOperationalReport({
                          purposeId: 'SCRIPT_REVIEW',
                          inputContextText: inputContext,
                          customSystemInstruction: latestPrompt || scriptPrompt,
                        });
                        setLlmReviewResult(res);
                      } finally {
                        setIsRunningLlmReview(false);
                      }
                    }}
                    className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRunningLlmReview ? 'animate-spin' : ''}`} />
                    {isRunningLlmReview ? 'Đang rà soát...' : 'Chạy biên tập kịch bản'}
                  </button>
                </div>
              </div>

              {promptToast && (
                <div className="text-xs font-semibold text-emerald-600">{promptToast}</div>
              )}

              {showPromptEditor && (
                <InlinePurposeApiSetup
                  purposeId="SCRIPT_REVIEW"
                  onConfigSaved={() => {
                    const eff = getEffectiveConfigForPurpose('SCRIPT_REVIEW');
                    setScriptPrompt(eff.purpose.systemInstruction);
                  }}
                />
              )}

              {llmReviewResult && (
                <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">
                      Bản nhận xét & gợi ý sửa kịch bản ({llmReviewResult.providerUsed}):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRevisionMode(true);
                        setFeedbackNotes(llmReviewResult.output);
                      }}
                      className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                    >
                      Chèn vào ô Yêu cầu chỉnh sửa
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3 rounded border border-slate-200 max-h-56 overflow-y-auto">
                    {llmReviewResult.output}
                  </pre>
                </div>
              )}
            </div>

            {/* Revision Input Box if toggled */}
            {isRevisionMode && (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-300 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-amber-600" />
                    Nhập ghi chú phản hồi yêu cầu sửa kịch bản cho KOC
                  </span>
                  <button
                    onClick={() => setIsRevisionMode(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                  >
                    Hủy
                  </button>
                </div>
                <textarea
                  rows={4}
                  placeholder="VD: Đoạn mở đầu 3s cần đẩy năng lượng cao hơn; bổ sung nhấn mạnh vào chứng nhận..."
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none"
                />
                {errorMsg && <p className="text-xs text-rose-600 font-medium">{errorMsg}</p>}
                <button
                  onClick={handleSendRevision}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg transition shadow-xs"
                >
                  Gửi yêu cầu chỉnh sửa
                </button>
              </div>
            )}
          </div>

          {/* Footer Actions - Enterprise Light */}
          <div className="px-4 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <span className="text-xs text-slate-600">
              Trạng thái hiện tại:{' '}
              <strong className="text-slate-900">
                {script.status === 'PENDING' ? 'Chờ duyệt' : script.status === 'APPROVED' ? 'Đã duyệt' : 'Cần sửa'}
              </strong>
            </span>

            <div className="flex flex-wrap items-center gap-2">
              {!isRevisionMode && script.status === 'PENDING' && (
                <button
                  onClick={() => setIsRevisionMode(true)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 transition flex items-center gap-1.5 shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Yêu cầu chỉnh sửa</span>
                </button>
              )}

              {script.status === 'PENDING' && (
                <button
                  onClick={handleApprove}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs transition flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Duyệt kịch bản &amp; kích hoạt ký hợp đồng</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg transition shadow-2xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>
    </Presence>
  );
};
