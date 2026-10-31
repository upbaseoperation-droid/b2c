'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Presence } from './ui';
import {
  CheckCircle,
  RotateCcw,
  Clock,
  CheckSquare,
  MessageSquare,
  ShieldAlert,
  AlertTriangle,
  Sliders,
  RefreshCw,
} from 'lucide-react';
import { ScriptReviewItem } from '../lib/types';
import { analyzeScriptWithAi } from '../lib/aiScriptAnalyzer';
import {
  ContentFunnelStage,
  FUNNEL_STAGE_OPTIONS,
  inferSlotFunnelStage,
} from '../lib/contentPlanRules';
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
  const [selectedFunnelStage, setSelectedFunnelStage] = useState<ContentFunnelStage>('CONSIDERATION');

  // Thiết lập câu lệnh (Prompt) & Nhận xét kịch bản (SCRIPT_REVIEW)
  const [scriptPrompt, setScriptPrompt] = useState<string>(() => {
    const cfg = loadApiWorkspaceConfig();
    return getEffectiveConfigForPurpose('SCRIPT_REVIEW', cfg).purpose.systemInstruction;
  });
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

  // Chạy đối soát tự động với Từ cấm, Điểm nổi bật, Pháp lý, 7 Chặng B2C & STAR-T Hook trong Hồ sơ thương hiệu
  const complianceResult = useMemo(() => {
    if (!script || !detectedBrandProfile) return null;
    const kb = brandProfileToKnowledgeBase(detectedBrandProfile);
    const fullText = `${script.hook}\n${script.painPoint}\n${script.solutionAndUsp}\n${script.callToAction}`;
    return analyzeScriptWithAi(fullText, kb, undefined, {
      funnelStage: selectedFunnelStage,
      pillar: script.pillar,
    });
  }, [script, detectedBrandProfile, selectedFunnelStage]);

  const bannedIssues = useMemo(
    () => (complianceResult?.issues || []).filter(i => i.type === 'BLACKLIST_WORD' || i.type === 'MISSING_DISCLAIMER'),
    [complianceResult],
  );

  // Đồng bộ trạng thái checklist theo kết quả quét từ cấm thực tế
  const openSyncKey = `${isOpen}|${script?.id || ''}`;
  const [prevOpenSyncKey, setPrevOpenSyncKey] = useState(openSyncKey);
  if (openSyncKey !== prevOpenSyncKey) {
    setPrevOpenSyncKey(openSyncKey);
    if (isOpen && script) {
      setSelectedBrandName('');
      setSelectedFunnelStage(
        script.funnelStage || inferSlotFunnelStage(script.klCode as never, script.pillar),
      );
      setIsRevisionMode(false);
      setRevisionRound(1);
      setFeedbackNotes('');
      setErrorMsg(null);
      setLlmReviewResult(null);
      const cfg = loadApiWorkspaceConfig();
      setScriptPrompt(getEffectiveConfigForPurpose('SCRIPT_REVIEW', cfg).purpose.systemInstruction);
    }
  }

  const complianceSyncKey = complianceResult
    ? `${script?.id || ''}|${detectedBrandProfile?.key || ''}|${complianceResult.overallScore}|${complianceResult.issues.map(i => i.id).join(',')}`
    : '';
  const [prevComplianceSyncKey, setPrevComplianceSyncKey] = useState('');
  if (complianceSyncKey !== prevComplianceSyncKey) {
    setPrevComplianceSyncKey(complianceSyncKey);
    if (complianceResult) {
      const hasBanned = complianceResult.issues.some(i => i.type === 'BLACKLIST_WORD');
      const hasMissingUsp = complianceResult.issues.some(i => i.type === 'MISSING_USP');
      setCheckNoBannedKeywords(!hasBanned);
      setCheckUsp(!hasMissingUsp);
    }
  }

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
    if (complianceResult.sevenStageAudit) {
      for (const st of complianceResult.sevenStageAudit) {
        if (st.status !== 'PASS') {
          lines.push(`- [Chặng ${st.stageNumber} · ${st.stageName}]: ${st.actionableFix || st.finding}`);
        }
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
    <Modal
      open={Boolean(isOpen && script)}
      onClose={onClose}
      title={`Duyệt kịch bản KOC · ${script.dealCode}`}
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          <span className="text-xs text-ink-2">
            Trạng thái hiện tại:{' '}
            <strong className="text-ink">
              {script.status === 'PENDING' ? 'Chờ duyệt' : script.status === 'APPROVED' ? 'Đã duyệt' : 'Cần sửa'}
            </strong>
          </span>

          <div className="flex flex-wrap items-center gap-2">
            {!isRevisionMode && script.status === 'PENDING' && (
              <button
                onClick={() => setIsRevisionMode(true)}
                className="px-4 py-2 bg-white hover:bg-canvas text-ink-2 font-semibold text-xs rounded-lg border border-line-strong transition flex items-center gap-2 shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-ink-3" />
                <span>Yêu cầu chỉnh sửa</span>
              </button>
            )}

            {script.status === 'PENDING' && (
              <button
                onClick={handleApprove}
                className="px-5 py-2 bg-positive hover:bg-positive text-white font-semibold text-xs rounded-lg shadow-xs transition flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Duyệt kịch bản &amp; kích hoạt ký hợp đồng</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-canvas text-ink-2 border border-line-strong text-xs font-semibold rounded-lg transition shadow-2xs"
            >
              Đóng
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Metadata Bar + Brand Profile Selector */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-canvas rounded-lg border border-line text-xs text-ink-2">
              <div className="flex flex-wrap items-center gap-3">
                <span>KOC: <strong className="text-ink">{script.kocName}</strong> ({script.campaignTitle})</span>
                <span>·</span>
                <span>
                  Phân loại: <strong className="text-accent">{script.pillar}</strong>
                </span>
                <span>
                  Thời lượng: <strong className="text-ink">{script.videoDuration}</strong>
                </span>
                <label className="flex items-center gap-2">
                  <span className="text-ink-3">Hồ sơ nhãn:</span>
                  <select
                    value={detectedBrandProfile?.brandName || ''}
                    onChange={(e) => setSelectedBrandName(e.target.value)}
                    className="bg-white border border-line-strong rounded px-2 py-0.5 text-xs font-semibold text-accent-hover focus:outline-none focus:border-accent"
                  >
                    {profiles.map(p => (
                      <option key={p.key} value={p.brandName}>
                        {p.brandName} ({p.contentRules?.banned.length || 0} từ cấm)
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  <span className="text-ink-3">Giai đoạn Phễu:</span>
                  <select
                    value={selectedFunnelStage}
                    onChange={(e) => setSelectedFunnelStage(e.target.value as ContentFunnelStage)}
                    className="bg-white border border-line-strong rounded px-2 py-0.5 text-xs font-semibold text-ink focus:outline-none focus:border-accent"
                  >
                    {FUNNEL_STAGE_OPTIONS.map(f => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  <span className="text-ink-3">Lần sửa:</span>
                  <select
                    value={revisionRound}
                    onChange={(e) => setRevisionRound(Number(e.target.value))}
                    className={`bg-white border rounded px-2 py-0.5 text-xs font-semibold focus:outline-none ${
                      isOverFreeRevisionLimit ? 'border-critical text-critical' : 'border-line-strong text-ink'
                    }`}
                  >
                    <option value={1}>Lần 1 (Miễn phí)</option>
                    <option value={2}>Lần 2 (Miễn phí)</option>
                    <option value={3}>Lần 3 (Kiểm tra định mức)</option>
                    <option value={4}>Lần 4 (Ngoài định mức)</option>
                  </select>
                </label>
              </div>
              <span className="text-xs font-medium flex items-center gap-2 text-warning">
                <Clock className="w-3.5 h-3.5" />
                SLA còn {script.remainingHours > 0 ? `${script.remainingHours}h` : 'Đã nghiệm thu'}
              </span>
            </div>

            {/* Quy tắc SLA duyệt kịch bản & giới hạn chỉnh sửa từ Hồ sơ thương hiệu */}
            {workflowRules && (
              <div className="p-3 rounded-lg bg-canvas border border-line space-y-2 text-2xs text-ink-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <strong>Quy định phê duyệt của {detectedBrandProfile?.brandName}:</strong>{' '}
                    {workflowRules.requireScriptApproval ? 'Bắt buộc duyệt kịch bản' : 'Không bắt buộc nhãn duyệt kịch bản'}
                    {' · '}
                    {workflowRules.requireDemoApproval ? 'Có duyệt video nháp' : 'Không duyệt video nháp'}
                  </span>
                  <span className="font-semibold text-accent-hover">
                    Tự động cho phép đăng sau {workflowRules.autoAirAfterHours}h · Tối đa {workflowRules.maxFreeRevisions} lần sửa miễn phí
                  </span>
                </div>
                {isOverFreeRevisionLimit && (
                  <div className="p-2 rounded bg-critical-soft border border-critical/30 text-critical font-medium flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-critical" />
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
                    ? 'bg-critical-soft/70 border-critical/30'
                    : complianceResult.overallScore >= 80
                      ? 'bg-positive-soft/60 border-positive/30'
                      : 'bg-warning-soft/60 border-warning/30'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert
                      className={`w-4 h-4 ${
                        bannedIssues.length > 0
                          ? 'text-critical'
                          : complianceResult.overallScore >= 80
                            ? 'text-positive'
                            : 'text-warning'
                      }`}
                    />
                    <span className="text-xs font-semibold text-ink">
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
                      className="px-3 py-1 rounded bg-white hover:bg-canvas text-critical border border-critical/30 text-2xs font-semibold transition shadow-2xs"
                    >
                      Điền nội dung yêu cầu sửa ({complianceResult.issues.length} mục)
                    </button>
                  )}
                </div>

                <p className="text-xs text-ink-2">{complianceResult.summaryVerdict}</p>

                {complianceResult.issues.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {complianceResult.issues.map(issue => (
                      <div
                        key={issue.id}
                        className="p-3 rounded bg-white border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 font-semibold text-ink">
                            <AlertTriangle
                              className={`w-3.5 h-3.5 shrink-0 ${
                                issue.severity === 'CRITICAL' ? 'text-critical' : 'text-warning'
                              }`}
                            />
                            <span>{issue.title}</span>
                          </div>
                          <p className="text-2xs text-ink-3">{issue.rationale}</p>
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

                {/* Kiểm định Kịch bản 7 Chặng chuẩn B2C & Phân tích Hook STAR-T */}
                {complianceResult.hookStarTAnalysis && (
                  <div className="p-3 rounded-lg bg-white border border-line space-y-2 text-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-ink">
                        Phân tích Hook 3–5 giây theo mô hình STAR-T ({complianceResult.hookStarTAnalysis.detectedHookType})
                      </span>
                      <span className="font-mono font-semibold text-accent-hover">
                        Đạt {complianceResult.hookStarTAnalysis.starTDrivers.filter(d => d.matched).length}/5 động lực STAR-T
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {complianceResult.hookStarTAnalysis.starTDrivers.map(drv => (
                        <span
                          key={drv.driver}
                          title={drv.evidence}
                          className={`px-2 py-0.5 rounded border font-medium ${
                            drv.matched
                              ? 'bg-positive-soft text-positive border-positive/30'
                              : 'bg-canvas text-ink-3 border-line'
                          }`}
                        >
                          {drv.matched ? '✓' : '○'} {drv.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {complianceResult.sevenStageAudit && complianceResult.sevenStageAudit.length > 0 && (
                  <div className="p-3 rounded-lg bg-white border border-line space-y-2 text-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink">
                        Kiểm định Kịch bản 7 Chặng chuẩn B2C (Phễu: {FUNNEL_STAGE_OPTIONS.find(f => f.value === selectedFunnelStage)?.shortLabel || selectedFunnelStage})
                      </span>
                      <span className="text-ink-3">
                        {complianceResult.sevenStageAudit.filter(s => s.status === 'PASS').length}/7 chặng đạt
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {complianceResult.sevenStageAudit.map(st => (
                        <div
                          key={st.stageNumber}
                          className={`px-3 py-2 rounded border flex items-start justify-between gap-2 ${
                            st.status === 'PASS'
                              ? 'bg-positive-soft/50 border-positive/30 text-ink'
                              : st.status === 'FAIL'
                                ? 'bg-critical-soft/70 border-critical/30 text-critical'
                                : 'bg-warning-soft/60 border-warning/30 text-warning'
                          }`}
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="font-semibold truncate">
                              Chặng {st.stageNumber}: {st.stageName}
                            </div>
                            <div className="text-2xs text-ink-2 leading-snug">{st.finding}</div>
                          </div>
                          <span
                            className={`shrink-0 px-2 py-0.5 rounded text-2xs font-semibold ${
                              st.status === 'PASS'
                                ? 'bg-positive-soft text-positive'
                                : st.status === 'FAIL'
                                  ? 'bg-critical-soft text-critical'
                                  : 'bg-warning-soft text-warning'
                            }`}
                          >
                            {st.status === 'PASS' ? 'ĐẠT' : st.status === 'FAIL' ? 'LỖI' : 'LƯU Ý'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tóm tắt danh mục từ cấm, nỗi đau khách hàng & hashtag bắt buộc của nhãn để người duyệt tra cứu nhanh */}
                <div className="pt-2 border-t border-line/80 space-y-2 text-2xs">
                  {(detectedBrandProfile.contentRules?.banned.length || 0) > 0 && (
                    <div className="text-ink-2">
                      <span className="text-ink-3 font-medium">
                        Từ cấm trong hồ sơ {detectedBrandProfile.brandName}:{' '}
                      </span>
                      <span className="text-critical font-medium">
                        {detectedBrandProfile.contentRules!.banned.map(b => b.phrase).join(', ')}
                      </span>
                    </div>
                  )}
                  {(detectedBrandProfile.positioning?.painPoints?.length || 0) > 0 && (
                    <div className="text-ink-2">
                      <strong>Góc nỗi đau khách hàng chuẩn của nhãn:</strong>{' '}
                      {detectedBrandProfile.positioning!.painPoints!.slice(0, 2).join(' · ')}
                    </div>
                  )}
                  {(detectedBrandProfile.positioning?.barriersToTrial?.length || 0) > 0 && (
                    <div className="text-ink-2">
                      <strong>Rào cản mua hàng cần giải đáp trong clip:</strong>{' '}
                      {detectedBrandProfile.positioning!.barriersToTrial!.slice(0, 2).join(' · ')}
                    </div>
                  )}
                  {(detectedBrandProfile.contentRules?.mandatoryHashtags?.length || 0) > 0 && (
                    <div className="text-ink-2">
                      <strong>Hashtag &amp; thời lượng bắt buộc:</strong>{' '}
                      {detectedBrandProfile.contentRules!.mandatoryHashtags!.join(' ')}{' '}
                      {detectedBrandProfile.contentRules?.videoDurationRule ? `(${detectedBrandProfile.contentRules.videoDurationRule})` : ''}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4 Structural Script Sections or Vetting Guardrail Sections */}
            {(script.reviewMode === 'VETTING_GUARDRAILS' || script.kocTier === 'TIER_1_CELEB' || script.kocTier === 'TIER_2_MACRO') ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-ink">
                    Bộ tham số kiểm duyệt KOL ({script.klCode || 'KL6 / KL7'} — Không áp đặt Angle/Hook mẫu)
                  </h4>
                  <span className="rounded bg-accent-soft px-2 py-0.5 text-2xs font-semibold text-accent">
                    KOL tự đề xuất kịch bản theo chất kênh
                  </span>
                </div>

                <div className="p-4 bg-positive-soft/50 rounded-lg border border-positive/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-positive">
                      1. Thông điệp cốt lõi tối thiểu phải nhắc (Key USP)
                    </span>
                    <span className="text-2xs text-ink-3 font-medium">Truyền tải tự nhiên bằng ngôn từ KOL</span>
                  </div>
                  <p className="text-xs text-ink leading-relaxed">{script.solutionAndUsp}</p>
                </div>

                <div className="p-4 bg-critical-soft/50 rounded-lg border border-critical/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-critical">
                      2. Từ cấm &amp; Ranh giới thương hiệu bắt buộc tránh (Do &amp; Don&apos;t)
                    </span>
                    <span className="text-2xs text-ink-3 font-medium">An toàn pháp lý &amp; hình ảnh</span>
                  </div>
                  <p className="text-xs text-ink leading-relaxed">
                    {script.forbiddenClaims || script.painPoint || 'Tuân thủ danh mục từ cấm y tế/sàn và không nhắc tên đối thủ cạnh tranh trực tiếp.'}
                  </p>
                </div>

                <div className="p-4 bg-accent-soft/50 rounded-lg border border-accent/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-accent-hover">
                      3. Yêu cầu khung hình &amp; Hiện diện sản phẩm bắt buộc
                    </span>
                    <span className="text-2xs text-ink-3 font-medium">Quy chuẩn hình ảnh tối thiểu</span>
                  </div>
                  <p className="text-xs text-ink leading-relaxed">
                    {script.mandatoryShots || 'Lộ diện rõ bao bì sản phẩm tối thiểu 5 giây; quay cận kết cấu thực tế khi sử dụng; phát âm đúng tên thương hiệu.'}
                  </p>
                </div>

                <div className="p-4 bg-accent-soft rounded-lg border border-line space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-accent">
                      4. Điều khoản gắn giỏ hàng, Mã Spark Ads &amp; Độc quyền
                    </span>
                    <span className="text-2xs text-ink-3 font-medium">Quyền lợi thương mại</span>
                  </div>
                  <p className="text-xs text-ink leading-relaxed">
                    {script.rightsGuardrails ? `${script.rightsGuardrails} · ${script.callToAction}` : script.callToAction}
                  </p>
                </div>

                {script.hook && (
                  <div className="p-3 bg-canvas rounded-lg border border-line space-y-1">
                    <span className="text-2xs font-semibold text-ink-2">Outline / Ý tưởng do KOL gửi:</span>
                    <p className="text-xs text-ink italic">&ldquo;{script.hook}&rdquo;</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-ink">Nội dung kịch bản chi tiết</h4>

                {/* Section 1: Hook */}
                <div className="p-4 bg-accent-soft/50 rounded-lg border border-accent/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-accent-hover">Đoạn mở đầu (0–3 giây đầu)</span>
                    <span className="text-2xs text-ink-3 font-medium">Tình huống mở đầu</span>
                  </div>
                  <p className="text-xs text-ink leading-relaxed italic">&ldquo;{script.hook}&rdquo;</p>
                </div>

                {/* Section 2: Pain Point */}
                <div className="p-4 bg-warning-soft/50 rounded-lg border border-warning/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-warning">Vấn đề người dùng (3–15 giây)</span>
                    <span className="text-2xs text-ink-3 font-medium">Tình trạng thường gặp</span>
                  </div>
                  <p className="text-xs text-ink leading-relaxed">{script.painPoint}</p>
                </div>

                {/* Section 3: Solution & USP */}
                <div className="p-4 bg-positive-soft/50 rounded-lg border border-positive/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-positive">
                      Giới thiệu sản phẩm (15–45 giây)
                    </span>
                    <span className="text-2xs text-ink-3 font-medium">Công dụng &amp; thành phần chính</span>
                  </div>
                  <p className="text-xs text-ink leading-relaxed">{script.solutionAndUsp}</p>
                </div>

                {/* Section 4: CTA */}
                <div className="p-4 bg-accent-soft rounded-lg border border-line space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-accent">Điều hướng mua hàng (45–60 giây)</span>
                    <span className="text-2xs text-ink-3 font-medium">Gắn giỏ hàng &amp; ưu đãi</span>
                  </div>
                  <p className="text-xs text-ink leading-relaxed">{script.callToAction}</p>
                </div>
              </div>
            )}

            {/* Quality Audit Checklist */}
            <div className="p-4 bg-canvas rounded-lg border border-line space-y-3">
              <h4 className="text-xs font-semibold text-ink flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-positive" />
                {(script.reviewMode === 'VETTING_GUARDRAILS' || script.kocTier === 'TIER_1_CELEB' || script.kocTier === 'TIER_2_MACRO')
                  ? 'Checklist kiểm duyệt theo Khung tham số (Dành cho KL6 / KL7)'
                  : 'Danh mục kiểm duyệt tiêu chuẩn nền tảng & thương hiệu'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 text-ink-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkUsp}
                    onChange={(e) => setCheckUsp(e.target.checked)}
                    className="rounded border-line-strong text-accent focus:ring-accent"
                  />
                  <span>
                    {(script.reviewMode === 'VETTING_GUARDRAILS' || script.kocTier === 'TIER_1_CELEB' || script.kocTier === 'TIER_2_MACRO')
                      ? 'Truyền tải đủ Key USP cốt lõi (tôn trọng văn phong KOL)'
                      : 'Đúng thông điệp sản phẩm & quy chuẩn thương hiệu'}
                  </span>
                </label>
                <label className="flex items-center gap-2 text-ink-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkNoBannedKeywords}
                    onChange={(e) => setCheckNoBannedKeywords(e.target.checked)}
                    className="rounded border-line-strong text-accent focus:ring-accent"
                  />
                  <span>Không vi phạm từ cấm &amp; ranh giới Do &amp; Don&apos;t của nhãn</span>
                </label>
                <label className="flex items-center gap-2 text-ink-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkCallToAction}
                    onChange={(e) => setCheckCallToAction(e.target.checked)}
                    className="rounded border-line-strong text-accent focus:ring-accent"
                  />
                  <span>
                    {(script.reviewMode === 'VETTING_GUARDRAILS' || script.kocTier === 'TIER_1_CELEB' || script.kocTier === 'TIER_2_MACRO')
                      ? 'Đảm bảo khung hình lộ diện sản phẩm tối thiểu & gắn giỏ hàng'
                      : 'Có lời kêu gọi nhấp giỏ hàng góc trái rõ ràng'}
                  </span>
                </label>
                <label className="flex items-center gap-2 text-ink-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkDuration}
                    onChange={(e) => setCheckDuration(e.target.checked)}
                    className="rounded border-line-strong text-accent focus:ring-accent"
                  />
                  <span>
                    {(script.reviewMode === 'VETTING_GUARDRAILS' || script.kocTier === 'TIER_1_CELEB' || script.kocTier === 'TIER_2_MACRO')
                      ? 'Đạt cam kết mã Spark Ads, thời hạn giữ bài & độc quyền'
                      : 'Thời lượng quay thực tế đạt chuẩn (60–90s)'}
                  </span>
                </label>
              </div>
            </div>

            {/* Khung Nhận xét Biên tập Kịch bản */}
            <div className="p-4 bg-canvas rounded-lg border border-line space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-accent" />
                  <span className="text-xs font-semibold text-ink">
                    Rà soát &amp; biên tập kịch bản
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isRunningLlmReview}
                    onClick={async () => {
                      setIsRunningLlmReview(true);
                      try {
                        const latestPrompt = getEffectiveConfigForPurpose('SCRIPT_REVIEW').purpose.systemInstruction;
                        const bannedList = (detectedBrandProfile?.contentRules?.banned || []).map(
                          (b) => `"${b.phrase}" (thay bằng: "${b.replacement || 'diễn đạt tự nhiên'}")`
                        );
                        const uspsList = (detectedBrandProfile?.products || []).flatMap(p => p.usps || []);
                        const disclaimers = (detectedBrandProfile?.legal || []).map(l => l.disclaimer).filter(Boolean);
                        const hashtags = detectedBrandProfile?.contentRules?.mandatoryHashtags || [];
                        const isGuardrails =
                          script.reviewMode === 'VETTING_GUARDRAILS' ||
                          script.kocTier === 'TIER_1_CELEB' ||
                          script.kocTier === 'TIER_2_MACRO';

                        const inputContext = [
                          `[DỮ LIỆU PHÂN HỆ: Kiểm Duyệt & Biên Tập Kịch Bản Video KOC]`,
                          `- Nhãn hàng: ${detectedBrandProfile?.brandName || script.campaignTitle}`,
                          `- Chiến dịch: ${script.campaignTitle} | KOC: ${script.kocName} (${script.kocId})`,
                          detectedBrandProfile?.positioning?.slogan ? `- Định vị nhãn hàng: ${detectedBrandProfile.positioning.slogan}` : '',
                          detectedBrandProfile?.positioning?.toneOfVoice ? `- Giọng văn: ${detectedBrandProfile.positioning.toneOfVoice}` : '',
                          detectedBrandProfile?.positioning?.targetAudience ? `- Khách hàng mục tiêu: ${detectedBrandProfile.positioning.targetAudience}` : '',
                          detectedBrandProfile?.positioning?.keyMessage ? `- Thông điệp chính: ${detectedBrandProfile.positioning.keyMessage}` : '',
                          uspsList.length > 0 ? `- USP sản phẩm nhãn hàng: ${uspsList.slice(0, 5).join('; ')}` : '',
                          bannedList.length > 0
                            ? `- Danh sách từ cấm kèm từ thay thế: ${bannedList.join(', ')}`
                            : `- Từ cấm của nhãn hàng: Không có`,
                          disclaimers.length > 0 ? `- Khuyến cáo pháp lý bắt buộc (disclaimer): ${disclaimers.join('; ')}` : '',
                          hashtags.length > 0 ? `- Hashtag bắt buộc: ${hashtags.join(' ')}` : '',
                          isGuardrails && (script.mandatoryShots || detectedBrandProfile?.contentRules?.visualDo?.length)
                            ? `- Cảnh quay bắt buộc (Mandatory Shots): ${script.mandatoryShots || (detectedBrandProfile?.contentRules?.visualDo || []).join('; ')}`
                            : '',
                          isGuardrails && script.rightsGuardrails
                            ? `- Ràng buộc quyền & mã Spark Ads (Rights Guardrails): ${script.rightsGuardrails}`
                            : '',
                          `- Mở đầu (Hook 3s): ${script.hook}`,
                          `- Nỗi đau (Pain Point): ${script.painPoint}`,
                          `- Giải pháp & USP kịch bản: ${script.solutionAndUsp}`,
                          `- Kêu gọi hành động (CTA): ${script.callToAction}`,
                        ].filter(Boolean).join('\n');
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
                    className="px-3 py-1 rounded bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRunningLlmReview ? 'animate-spin' : ''}`} />
                    {isRunningLlmReview ? 'Đang rà soát...' : 'Chạy biên tập kịch bản'}
                  </button>
                </div>
              </div>

              {llmReviewResult && (
                <div className="p-4 bg-white rounded-lg border border-line space-y-2">
                  <div className="flex items-center justify-between text-xs text-ink-2">
                    <span className="font-semibold text-ink">
                      Bản nhận xét & gợi ý sửa kịch bản ({llmReviewResult.providerUsed}):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRevisionMode(true);
                        setFeedbackNotes(llmReviewResult.output);
                      }}
                      className="text-xs font-semibold text-accent hover:underline cursor-pointer"
                    >
                      Chèn vào ô Yêu cầu chỉnh sửa
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-ink whitespace-pre-wrap leading-relaxed bg-canvas p-3 rounded border border-line max-h-56 overflow-y-auto">
                    {llmReviewResult.output}
                  </pre>
                </div>
              )}
            </div>

            {/* Revision Input Box if toggled */}
            {isRevisionMode && (
              <div className="p-4 bg-warning-soft rounded-lg border border-warning/30 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-warning flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-warning" />
                    Nhập ghi chú phản hồi yêu cầu sửa kịch bản cho KOC
                  </span>
                  <button
                    onClick={() => setIsRevisionMode(false)}
                    className="text-xs text-ink-3 hover:text-ink font-medium"
                  >
                    Hủy
                  </button>
                </div>
                <textarea
                  rows={4}
                  placeholder="VD: Đoạn mở đầu 3s cần đẩy năng lượng cao hơn; bổ sung nhấn mạnh vào chứng nhận..."
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  className="w-full bg-white border border-line-strong rounded-lg p-3 text-xs text-ink placeholder-ink-3 focus:ring-2 focus:ring-warning/20 focus:border-warning focus:outline-none"
                />
                {errorMsg && <p className="text-xs text-critical font-medium">{errorMsg}</p>}
                <button
                  onClick={handleSendRevision}
                  className="px-4 py-2 bg-warning hover:bg-warning text-white font-semibold text-xs rounded-lg transition shadow-xs"
                >
                  Gửi yêu cầu chỉnh sửa
                </button>
              </div>
            )}
      </div>
    </Modal>
  );
};
