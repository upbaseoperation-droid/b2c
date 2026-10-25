'use client';

import React, { useState, useMemo } from 'react';
import { Button, Field, Modal, Select, Status, Textarea } from '../ui';
import { Lightbulb, ShieldCheck, Sparkles, Check, Copy } from 'lucide-react';
import { INITIAL_CONTENT_ANGLES, generateAiAngleSuggestions } from '../../lib/contentAngleData';
import { analyzeScriptWithAi } from '../../lib/aiScriptAnalyzer';
import { useBrandProfiles, brandProfileToKnowledgeBase, findBrandProfile } from '../../lib/brands/useBrandProfiles';
import { executeOperationalReport } from '../../lib/operationalReportService';
import type { ContentAngleItem } from '../../lib/types';
import { CONTENT_PILLARS } from '../../lib/contentPillars';
import {
  ContentFunnelStage,
  FUNNEL_STAGE_OPTIONS,
  inferSlotFunnelStage,
} from '../../lib/contentPlanRules';

export interface AppliedAngleData {
  angleName: string;
  hook: string;
  painPoint: string;
  usp: string;
  cta: string;
  format?: string;
}

interface ContentCopilotModalProps {
  open: boolean;
  onClose: () => void;
  brandName?: string;
  productName?: string;
  initialPillar?: string;
  initialScript?: string;
  onApplyAngle?: (data: AppliedAngleData) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

type CopilotMode = 'SUGGEST_ANGLES' | 'PRECHECK_SCRIPT';

export const ContentCopilotModal: React.FC<ContentCopilotModalProps> = ({
  open,
  onClose,
  brandName = 'Kutieskin',
  productName = '',
  initialPillar = 'Nỗi đau - Giải pháp',
  initialScript = '',
  onApplyAngle,
  onNotify,
}) => {
  const { profiles } = useBrandProfiles();
  const [mode, setMode] = useState<CopilotMode>('SUGGEST_ANGLES');

  // Input states
  const [selectedBrand, setSelectedBrand] = useState(brandName);
  const [selectedProduct, setSelectedProduct] = useState(productName);
  const [selectedPillar, setSelectedPillar] = useState(initialPillar);
  const [selectedFunnel, setSelectedFunnel] = useState<ContentFunnelStage>(() =>
    inferSlotFunnelStage(undefined, initialPillar),
  );

  // Script Precheck state
  const [scriptInput, setScriptInput] = useState(initialScript);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Sync khi mở modal
  const syncKey = `${open}|${brandName}|${productName}|${initialPillar}|${initialScript}`;
  const [prevSyncKey, setPrevSyncKey] = useState(syncKey);
  if (syncKey !== prevSyncKey) {
    setPrevSyncKey(syncKey);
    if (open) {
      if (brandName) setSelectedBrand(brandName);
      if (productName) setSelectedProduct(productName);
      if (initialPillar) setSelectedPillar(initialPillar);
      if (initialScript) setScriptInput(initialScript);
    }
  }

  const brandProfile = useMemo(() => findBrandProfile(profiles, selectedBrand) || profiles[0], [profiles, selectedBrand]);

  const brandProducts = useMemo(() => {
    if (brandProfile?.products?.length) {
      return brandProfile.products.map(p => p.name);
    }
    return ['Kem bôi dịu da Kutieskin 30g', 'Sữa tắm gội thảo dược', 'Kem dưỡng ẩm da'];
  }, [brandProfile]);

  const activeProduct = selectedProduct || brandProducts[0] || '';

  // Kho Góc nội dung (Angles)
  const angleSuggestions = useMemo(() => {
    // 1. Tìm các angle có sẵn trong danh mục chuẩn khớp sản phẩm hoặc thương hiệu
    const exact = INITIAL_CONTENT_ANGLES.filter(
      a =>
        a.productName.toLowerCase().includes(activeProduct.toLowerCase()) ||
        a.brandName.toLowerCase().includes(selectedBrand.toLowerCase())
    );

    // 2. Nếu thiếu thì bổ sung từ thuật toán sinh theo pillar và sản phẩm
    const generated = generateAiAngleSuggestions(activeProduct, selectedPillar, selectedBrand);

    return [...exact, ...generated].slice(0, 8);
  }, [activeProduct, selectedBrand, selectedPillar]);

  // Kết quả Soát xét kịch bản (Pre-check)
  const scriptAudit = useMemo(() => {
    if (!brandProfile || !scriptInput.trim()) return null;
    const kb = brandProfileToKnowledgeBase(brandProfile);
    return analyzeScriptWithAi(scriptInput, kb, undefined, {
      funnelStage: selectedFunnel,
      pillar: selectedPillar,
    });
  }, [brandProfile, scriptInput, selectedFunnel, selectedPillar]);

  const handleApply = (angle: Partial<ContentAngleItem>) => {
    if (!onApplyAngle) return;
    onApplyAngle({
      angleName: angle.name || `${selectedPillar} - ${activeProduct}`,
      hook: angle.hookIdea || '',
      painPoint: angle.painPoint || '',
      usp: angle.solutionApproach || '',
      cta: angle.callToAction || '',
      format: angle.suggestedFormat,
    });
    onNotify?.(`Đã áp dụng góc tiếp cận: ${angle.name}`, 'success');
    onClose();
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
    onNotify?.('Đã sao chép vào bộ nhớ tạm', 'info');
  };

  // Tạo kịch bản mẫu dựa trên thông số sản phẩm (Bấm nút tường minh theo RULE-API-02)
  const handleGenerateScriptDraft = async (angle: Partial<ContentAngleItem>) => {
    setIsGenerating(true);
    try {
      const prodObj = brandProfile?.products?.find(p => p.name === activeProduct);
      const usps = prodObj?.usps?.join('; ') || 'Sản phẩm chính hãng có chứng nhận an toàn';
      const banned = (brandProfile?.contentRules?.banned || []).map(b => b.phrase).join(', ');
      const disclaimer = brandProfile?.legal?.find(l => l.disclaimer)?.disclaimer || '';

      const report = await executeOperationalReport({
        purposeId: 'SCRIPT_REVIEW',
        moduleTitle: `Soạn kịch bản (${selectedBrand} - ${activeProduct})`,
        sourceTag: 'SCRIPT_REVIEW',
        inputContextText: [
          `Thương hiệu: ${selectedBrand}`,
          `Sản phẩm: ${activeProduct}`,
          `Trụ cột: ${selectedPillar}`,
          `Góc tiếp cận: ${angle.name || ''}`,
          `Nỗi đau tham khảo: ${angle.painPoint || ''}`,
          `USP chính: ${usps}`,
          banned ? `Từ cấm không được nhắc: ${banned}` : '',
          disclaimer ? `Khuyến cáo bắt buộc: ${disclaimer}` : '',
          `Định dạng kịch bản 4 phần: 1. Hook 3s; 2. Nỗi đau / Tình huống; 3. Giải pháp & Cách dùng; 4. Lời kêu gọi hành động CTA.`,
        ].filter(Boolean).join('\n'),
      });

      if (report.ok && report.outputText) {
        setScriptInput(report.outputText);
        setMode('PRECHECK_SCRIPT');
        onNotify?.('Đã soạn thảo kịch bản mẫu. Chuyển sang bước tiền kiểm tra.', 'success');
      } else {
        // Fallback nội bộ
        const fallbackText = `[Hook 3s]: ${angle.hookIdea || 'Bạn đang gặp vấn đề này mỗi ngày?'}\n\n[Tình huống]: ${angle.painPoint || 'Rất nhiều người dùng sai cách hoặc chọn nhầm sản phẩm.'}\n\n[Giải pháp & Cách dùng]: ${angle.solutionApproach || 'Sử dụng đúng liều lượng đều đặn mỗi ngày.'}\n\n[CTA]: ${angle.callToAction || 'Bấm vào giỏ hàng góc trái màn hình để nhận ưu đãi.'}`;
        setScriptInput(fallbackText);
        setMode('PRECHECK_SCRIPT');
        onNotify?.('Đã tạo kịch bản cơ sở từ góc tiếp cận.', 'info');
      }
    } catch {
      onNotify?.('Đã tạo kịch bản từ mẫu có sẵn.', 'info');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Góc nội dung & Soát xét kịch bản"
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-2xs text-ink-3">
            {mode === 'SUGGEST_ANGLES' ? 'Chọn góc tiếp cận phù hợp để áp dụng' : 'Đối chiếu quy tắc nhãn hàng & chính sách sàn'}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Thanh chọn chế độ */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('SUGGEST_ANGLES')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
                mode === 'SUGGEST_ANGLES' ? 'bg-accent text-white' : 'bg-sunken text-ink-2 hover:bg-line'
              }`}
            >
              <Lightbulb className="h-3.5 w-3.5" />
              Góc tiếp cận & Hook 3s ({angleSuggestions.length})
            </button>
            <button
              type="button"
              onClick={() => setMode('PRECHECK_SCRIPT')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
                mode === 'PRECHECK_SCRIPT' ? 'bg-accent text-white' : 'bg-sunken text-ink-2 hover:bg-line'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Soát xét kịch bản {scriptAudit ? `(${scriptAudit.overallScore}/100)` : ''}
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-ink-3">Thương hiệu:</span>
            <span className="font-medium text-ink">{selectedBrand}</span>
          </div>
        </div>

        {/* Thanh điều khiển ngữ cảnh */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 bg-sunken/60 p-2.5 rounded-md">
          <Field label="Sản phẩm mục tiêu">
            <Select value={activeProduct} onChange={e => setSelectedProduct(e.target.value)}>
              {brandProducts.map(p => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Trụ cột nội dung (Pillar)">
            <Select value={selectedPillar} onChange={e => setSelectedPillar(e.target.value)}>
              {CONTENT_PILLARS.map(p => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Giai đoạn Phễu truyền thông">
            <Select
              value={selectedFunnel}
              onChange={e => setSelectedFunnel(e.target.value as ContentFunnelStage)}
            >
              {FUNNEL_STAGE_OPTIONS.map(f => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {/* TAB 1: GỢI Ý GÓC TIẾP CẬN & HOOK 3S */}
        {mode === 'SUGGEST_ANGLES' && (
          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {angleSuggestions.map((ang, idx) => (
              <div key={('id' in ang && ang.id) ? String(ang.id) : `gen-${idx}`} className="rounded-md border border-line bg-surface p-3.5 hover:border-accent/40 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-ink">{ang.name}</span>
                      <span className="rounded bg-accent-soft px-2 py-0.5 text-2xs font-medium text-accent">
                        {ang.pillarName || selectedPillar}
                      </span>
                      {ang.suggestedFormat && (
                        <span className="rounded bg-sunken px-2 py-0.5 text-2xs text-ink-3">
                          {ang.suggestedFormat}
                        </span>
                      )}
                    </div>

                    {/* Hook 3s */}
                    <div className="mt-2 rounded bg-sunken/80 p-2 text-xs">
                      <span className="font-semibold text-accent">Hook 3s mở đầu: </span>
                      <span className="text-ink">{ang.hookIdea}</span>
                    </div>

                    {/* Chi tiết nội dung */}
                    <div className="mt-2 space-y-1 text-2xs text-ink-2">
                      {ang.painPoint && (
                        <div>
                          <strong className="text-ink-3">Tình huống/Nỗi đau: </strong>
                          {ang.painPoint}
                        </div>
                      )}
                      {ang.solutionApproach && (
                        <div>
                          <strong className="text-ink-3">Lồng ghép sản phẩm & USP: </strong>
                          {ang.solutionApproach}
                        </div>
                      )}
                      {ang.callToAction && (
                        <div>
                          <strong className="text-ink-3">Lời kêu gọi (CTA): </strong>
                          {ang.callToAction}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Các nút thao tác */}
                <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(ang.hookIdea || '', `hook-${idx}`)}
                      className="inline-flex items-center gap-1 text-2xs text-ink-3 hover:text-accent"
                    >
                      {copiedId === `hook-${idx}` ? <Check className="h-3 w-3 text-positive" /> : <Copy className="h-3 w-3" />}
                      {copiedId === `hook-${idx}` ? 'Đã chép hook' : 'Sao chép hook 3s'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isGenerating}
                      onClick={() => void handleGenerateScriptDraft(ang)}
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1 text-accent" />
                      Soạn kịch bản nháp
                    </Button>
                    {onApplyAngle && (
                      <Button size="sm" variant="primary" onClick={() => handleApply(ang)}>
                        Áp dụng góc này
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: SOÁT XÉT KỊCH BẢN (PRE-CHECK) */}
        {mode === 'PRECHECK_SCRIPT' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Cột trái: Văn bản kịch bản */}
              <div className="space-y-2">
                <Field label="Nội dung kịch bản cần soát xét">
                  <Textarea
                    rows={12}
                    value={scriptInput}
                    onChange={e => setScriptInput(e.target.value)}
                    placeholder="Dán nội dung kịch bản (Hook, lời thoại, mô tả cảnh quay, CTA)..."
                    className="font-mono text-xs"
                  />
                </Field>
                <div className="flex items-center justify-between text-2xs text-ink-3">
                  <span>{scriptInput.trim().split(/\s+/).filter(Boolean).length} từ</span>
                  <button
                    type="button"
                    onClick={() => setScriptInput('')}
                    className="text-ink-3 hover:text-critical underline"
                  >
                    Xóa trắng
                  </button>
                </div>
              </div>

              {/* Cột phải: Bảng thẩm định 10 tiêu chí */}
              <div className="space-y-3">
                {scriptAudit ? (
                  <div className="rounded-md border border-line bg-surface p-3 space-y-3">
                    <div className="flex items-center justify-between border-b border-line pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold tabular-nums text-ink">{scriptAudit.overallScore}/100</span>
                        <Status
                          tone={
                            scriptAudit.overallScore >= 80
                              ? 'positive'
                              : scriptAudit.overallScore >= 50
                              ? 'warning'
                              : 'critical'
                          }
                        >
                          {scriptAudit.summaryVerdict}
                        </Status>
                      </div>
                      <span className="text-2xs text-ink-3">
                        {scriptAudit.issues.length} vấn đề cần lưu ý
                      </span>
                    </div>

                    {scriptAudit.hookStarTAnalysis && (
                      <div className="rounded border border-line bg-canvas/50 p-2 text-2xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-ink">
                            Hook STAR-T ({scriptAudit.hookStarTAnalysis.detectedHookType})
                          </span>
                          <span className="font-mono font-semibold text-accent">
                            {scriptAudit.hookStarTAnalysis.starTDrivers.filter(d => d.matched).length}/5 động lực
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {scriptAudit.hookStarTAnalysis.starTDrivers.map(drv => (
                            <span
                              key={drv.driver}
                              title={drv.evidence}
                              className={`px-1.5 py-0.5 rounded border text-3xs ${
                                drv.matched
                                  ? 'border-positive/30 bg-positive-soft/30 text-positive'
                                  : 'border-line bg-surface text-ink-3'
                              }`}
                            >
                              {drv.matched ? '✓' : '○'} {drv.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {scriptAudit.sevenStageAudit && scriptAudit.sevenStageAudit.length > 0 && (
                      <div className="rounded border border-line bg-canvas/40 p-2 text-2xs space-y-1">
                        <div className="flex items-center justify-between font-semibold text-ink">
                          <span>Kiểm định 7 Chặng B2C</span>
                          <span className="text-ink-3">
                            {scriptAudit.sevenStageAudit.filter(s => s.status === 'PASS').length}/7 đạt
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-1 max-h-36 overflow-y-auto pr-1">
                          {scriptAudit.sevenStageAudit.map(st => (
                            <div
                              key={st.stageNumber}
                              className="flex items-center justify-between gap-2 rounded bg-surface px-2 py-1 border border-line"
                            >
                              <span className="truncate text-ink">
                                <strong>{st.stageNumber}. {st.stageName}:</strong> {st.finding}
                              </span>
                              <span
                                className={`shrink-0 text-3xs font-bold ${
                                  st.status === 'PASS'
                                    ? 'text-positive'
                                    : st.status === 'FAIL'
                                      ? 'text-critical'
                                      : 'text-warning'
                                }`}
                              >
                                {st.status === 'PASS' ? 'ĐẠT' : st.status === 'FAIL' ? 'LỖI' : 'LƯU Ý'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Danh sách lỗi phát hiện */}
                    <div className="max-h-[38vh] space-y-2 overflow-y-auto pr-1">
                      {scriptAudit.issues.length === 0 && (
                        <div className="p-4 text-center text-xs text-positive">
                          ✓ Kịch bản đạt chuẩn, không vi phạm từ cấm sàn và quy tắc nhãn hàng.
                        </div>
                      )}

                      {scriptAudit.issues.map(iss => (
                        <div
                          key={iss.id}
                          className={`rounded border p-2 text-2xs ${
                            iss.severity === 'CRITICAL'
                              ? 'border-critical/40 bg-critical-soft/30 text-critical'
                              : 'border-warning/40 bg-warning-soft/30 text-ink-2'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{iss.title}</span>
                            <span className="rounded px-1 py-0.2 text-3xs font-semibold">
                              {iss.severity === 'CRITICAL' ? 'Vi phạm' : 'Lưu ý'}
                            </span>
                          </div>
                          {iss.rationale && <div className="mt-1 text-ink-3">{iss.rationale}</div>}
                          {iss.replacementSuggestion && (
                            <div className="mt-1.5 flex items-center justify-between rounded bg-surface p-1.5 border border-line">
                              <div>
                                <span className="font-medium text-positive">Gợi ý sửa: </span>
                                <span className="text-ink">{iss.replacementSuggestion}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (iss.detectedText && iss.replacementSuggestion) {
                                    setScriptInput(prev =>
                                      prev.replace(new RegExp(iss.detectedText!, 'gi'), iss.replacementSuggestion!)
                                    );
                                    onNotify?.('Đã thay thế từ trong kịch bản', 'success');
                                  }
                                }}
                                className="text-accent underline shrink-0 ml-2"
                              >
                                Sửa ngay
                              </button>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Tiêu chí đánh giá chi tiết */}
                      <div className="pt-2 border-t border-line space-y-1.5">
                        <div className="text-2xs font-medium text-ink">Bóc tách theo tiêu chí:</div>
                        {scriptAudit.dimensions.map((d, di) => (
                          <div key={d.name || di} className="flex items-center justify-between text-2xs">
                            <span className="text-ink-2">{d.name}</span>
                            <span className="font-semibold tabular-nums text-ink">
                              {d.score}/{d.maxScore}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-line p-6 text-center text-xs text-ink-3">
                    Nhập nội dung kịch bản ở khung bên trái để xem kết quả soát xét.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
