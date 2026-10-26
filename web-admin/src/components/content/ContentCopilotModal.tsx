'use client';

import React, { useState, useMemo } from 'react';
import { Button, Field, Input, Modal, Select, Status, Textarea } from '../ui';
import { Lightbulb, ShieldCheck, FileText, Check, Copy, Bookmark } from 'lucide-react';
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
import {
  loadSavedBrandAngles,
  saveBrandAngleItem,
  buildBrandContentContextPrompt,
} from '../../lib/contentContextBuilder';

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
  const [kocChannelInput, setKocChannelInput] = useState('');
  const [customProposals, setCustomProposals] = useState<ContentAngleItem[]>([]);
  const [isGeneratingProposals, setIsGeneratingProposals] = useState(false);
  const [savedAngleIds, setSavedAngleIds] = useState<Set<string>>(new Set());

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
    // 0. Góc nội dung đã lưu từ nhãn hàng
    const saved = loadSavedBrandAngles(selectedBrand);

    // 1. Tìm các angle có sẵn trong danh mục chuẩn khớp sản phẩm hoặc thương hiệu
    const exact = INITIAL_CONTENT_ANGLES.filter(
      a =>
        a.productName.toLowerCase().includes(activeProduct.toLowerCase()) ||
        a.brandName.toLowerCase().includes(selectedBrand.toLowerCase())
    );

    // 2. Nếu thiếu thì bổ sung từ thuật toán sinh theo pillar và sản phẩm
    const generated = generateAiAngleSuggestions(activeProduct, selectedPillar, selectedBrand);

    // Gộp customProposals + saved lên đầu, loại trừ trùng ID
    const combined: ContentAngleItem[] = [];
    const seen = new Set<string>();

    [...customProposals, ...saved, ...exact, ...generated].forEach((item, idx) => {
      const partialItem = item as Partial<ContentAngleItem>;
      const key = partialItem.id || `gen-${partialItem.name}-${idx}`;
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(item as ContentAngleItem);
      }
    });

    return combined.slice(0, 16);
  }, [activeProduct, selectedBrand, selectedPillar, customProposals]);

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

  const handleSaveAngleToStore = (ang: Partial<ContentAngleItem>) => {
    const itemToSave: ContentAngleItem = {
      id: ang.id || `ang-saved-${Date.now()}`,
      code: ang.code || `ANG-${Date.now().toString().slice(-4)}`,
      name: ang.name || `${selectedPillar} - ${activeProduct}`,
      productId: ang.productId || `prod-saved`,
      productName: ang.productName || activeProduct,
      productSku: ang.productSku || '',
      brandId: ang.brandId || `brand-saved`,
      brandName: ang.brandName || selectedBrand,
      storeId: ang.storeId || `store-saved`,
      storeName: ang.storeName || `${selectedBrand} Official`,
      platform: ang.platform || 'TIKTOK_SHOP',
      pillarId: ang.pillarId || 'pillar-1',
      pillarName: ang.pillarName || selectedPillar,
      targetAudience: ang.targetAudience || brandProfile?.positioning?.targetAudience || 'Khách hàng mục tiêu',
      painPoint: ang.painPoint || '',
      keySellingPoints: ang.keySellingPoints || [],
      solutionApproach: ang.solutionApproach || '',
      hookIdea: ang.hookIdea || '',
      callToAction: ang.callToAction || '',
      suggestedFormat: ang.suggestedFormat || 'Talking Head + B-roll thực tế',
      status: 'ACTIVE',
      usageCount: ang.usageCount || 0,
      avgViewsEstimate: ang.avgViewsEstimate || 50000,
      createdBy: ang.createdBy || 'Upbase Ops',
      createdAt: ang.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveBrandAngleItem(itemToSave);
    setSavedAngleIds(prev => new Set(prev).add(itemToSave.id));
    onNotify?.(`Đã lưu góc "${itemToSave.name}" vào kho góc mẫu nhãn hàng.`, 'success');
  };

  const handleGenerateNewProposals = async () => {
    setIsGeneratingProposals(true);
    try {
      const promptContext = buildBrandContentContextPrompt({
        profile: brandProfile,
        productName: activeProduct,
        pillar: selectedPillar,
        funnelStage: selectedFunnel,
        kocName: kocChannelInput.trim() || undefined,
      });

      const report = await executeOperationalReport({
        purposeId: 'CONTENT_PROPOSAL',
        moduleTitle: `Đề xuất góc nội dung (${selectedBrand} - ${activeProduct})`,
        sourceTag: 'SCRIPT_REVIEW',
        inputContextText: promptContext,
      });

      if (report.ok && report.outputText) {
        let parsed: Record<string, unknown> | Array<Record<string, unknown>> | null = null;
        try {
          const jsonMatch = report.outputText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
          } else {
            parsed = JSON.parse(report.outputText) as Record<string, unknown> | Array<Record<string, unknown>>;
          }
        } catch {
          // ignore
        }

        const proposalList: Array<Record<string, string>> =
          parsed && !Array.isArray(parsed) && Array.isArray(parsed.proposals)
            ? (parsed.proposals as Array<Record<string, string>>)
            : Array.isArray(parsed)
              ? (parsed as Array<Record<string, string>>)
              : [];

        if (proposalList.length > 0) {
          const brandPrefix = selectedBrand.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4) || 'ANG';
          const timestamp = Date.now().toString().slice(-4);
          const newItems: ContentAngleItem[] = proposalList.map((p, idx: number) => ({
            id: `ang-prop-${Date.now()}-${idx + 1}`,
            code: `ANG-${brandPrefix}-${timestamp}-${idx + 1}`,
            name: p.name || `Góc đề xuất ${idx + 1}`,
            productId: `prod-${brandPrefix.toLowerCase()}`,
            productName: activeProduct,
            productSku: `${brandPrefix}-SKU`,
            brandId: `brand-${brandPrefix.toLowerCase()}`,
            brandName: selectedBrand,
            storeId: `store-${brandPrefix.toLowerCase()}`,
            storeName: `${selectedBrand} Official`,
            platform: 'TIKTOK_SHOP' as const,
            pillarId: 'pillar-auto',
            pillarName: selectedPillar,
            funnelStage: selectedFunnel,
            targetAudience: brandProfile?.positioning?.targetAudience || 'Khách hàng mục tiêu',
            painPoint: p.painPoint || '',
            keySellingPoints: p.solutionApproach ? [p.solutionApproach] : [],
            solutionApproach: p.solutionApproach || '',
            hookIdea: p.hookIdea || '',
            callToAction: p.callToAction || '',
            suggestedFormat: p.suggestedFormat || 'Talking Head + B-roll thực tế',
            feasibilityScore: 'HIGH_VIRAL' as const,
            status: 'ACTIVE' as const,
            usageCount: 0,
            avgViewsEstimate: 50000,
            createdBy: 'Hệ thống Upbase',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));

          setCustomProposals(prev => [...newItems, ...prev]);
          onNotify?.(`Đã tạo thành công ${newItems.length} góc đề xuất mới.`, 'success');
        } else {
          onNotify?.('Không thể phân tích dữ liệu đề xuất, vui lòng thử lại.', 'warning');
        }
      } else {
        onNotify?.('Lỗi kết nối khi tạo góc đề xuất.', 'error');
      }
    } catch (err) {
      console.error('Lỗi khi tạo góc đề xuất:', err);
      onNotify?.('Có lỗi xảy ra khi tạo góc đề xuất mới.', 'error');
    } finally {
      setIsGeneratingProposals(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Đề xuất góc nội dung & Kiểm tra kịch bản"
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
        <div className="bg-sunken/60 p-2.5 rounded-md space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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

          <div className="flex flex-wrap items-end justify-between gap-2 pt-1 border-t border-line/60">
            <div className="flex-1 min-w-[200px]">
              <Field label="Kênh KOC dự kiến (tùy chọn)">
                <Input
                  value={kocChannelInput}
                  onChange={e => setKocChannelInput(e.target.value)}
                  placeholder="Ví dụ: @chuyenmebe, @reviewda..."
                />
              </Field>
            </div>
            <Button
              size="sm"
              variant="primary"
              icon={Lightbulb}
              disabled={isGeneratingProposals}
              onClick={() => void handleGenerateNewProposals()}
            >
              {isGeneratingProposals ? 'Đang tạo góc...' : 'Tạo 3 góc đề xuất mới'}
            </Button>
          </div>
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
                      icon={Bookmark}
                      onClick={() => handleSaveAngleToStore(ang)}
                    >
                      {savedAngleIds.has(ang.id || '') ? 'Đã lưu góc mẫu' : 'Lưu góc mẫu'}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isGenerating}
                      icon={FileText}
                      onClick={() => void handleGenerateScriptDraft(ang)}
                    >
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
                                className={`shrink-0 text-3xs font-semibold ${
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
