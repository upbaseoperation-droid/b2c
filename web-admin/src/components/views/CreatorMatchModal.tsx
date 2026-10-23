'use client';

import React, { useMemo, useState } from 'react';
import type { BookingDealItem, InputPlanBreakdownState, KocItem } from '../../lib/types';
import type { KocChannelBriefAnalysisReport } from '../../lib/kocChannelBriefAnalyzer';
import { Button, Input, Modal, Select, Status } from '../ui';
import { planUnitBudget, scoreCreator, type MatchResult } from '../../lib/creatorMatching';
import type { ContentSlot } from '../../lib/contentPlanRules';
import { calculateExecutionCost, getEffectiveConfigForPurpose, loadApiWorkspaceConfig, recordApiUsageLog } from '../../lib/apiKeyConfig';

interface CreatorMatchModalProps {
  open: boolean;
  onClose: () => void;
  slot: ContentSlot | null;
  plan: InputPlanBreakdownState | null;
  kocs: KocItem[];
  deals: BookingDealItem[];
  usedHandles: Set<string>;
  onAssign: (handle: string | null) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

type AnalysisState = { state: 'loading' } | { state: 'error'; message: string } | { state: 'done'; report: KocChannelBriefAnalysisReport };

const fmt = (v: number) => Math.round(v).toLocaleString('vi-VN');
const clean = (h: string) => h.replace(/^@/, '').trim().toLowerCase();

export const CreatorMatchModal: React.FC<CreatorMatchModalProps> = ({ open, onClose, slot, plan, kocs, deals, usedHandles, onAssign, onNotify }) => {
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState<'ALL' | 'MATCH_SLOT' | string>('MATCH_SLOT');
  const [budgetFilter, setBudgetFilter] = useState<'ALL' | 'WITHIN_BUDGET'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'APPROVED_ONLY'>('ALL');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const [analysis, setAnalysis] = useState<Record<string, AnalysisState>>({});

  const ctx = useMemo(() => (slot && plan ? { slot, plan, deals, usedHandles: new Set(Array.from(usedHandles).filter(h => h !== clean(slot.kocHandle || ''))) } : null), [slot, plan, deals, usedHandles]);

  const targetBudget = useMemo(() => (slot && plan ? planUnitBudget(plan, slot.row) : undefined), [slot, plan]);

  const results: MatchResult[] = useMemo(() => {
    if (!ctx) return [];
    const q = search.trim().toLowerCase();

    let filtered = kocs;

    // Lọc theo từ khóa tìm kiếm
    if (q) {
      filtered = filtered.filter(k => `${k.channelId} ${k.stageName} ${k.kocCategory || ''} ${k.tepKenh || ''}`.toLowerCase().includes(q));
    }

    // Lọc theo Bậc lương
    if (gradeFilter === 'MATCH_SLOT' && slot?.row) {
      if (slot.row === 'FOC') {
        filtered = filtered.filter(k => k.salaryGrade === 'TAP UpAffiliate');
      } else {
        filtered = filtered.filter(k => k.salaryGrade === slot.row);
      }
    } else if (gradeFilter !== 'ALL' && gradeFilter !== 'MATCH_SLOT') {
      filtered = filtered.filter(k => k.salaryGrade === gradeFilter);
    }

    // Lọc theo Ngân sách kế hoạch
    if (budgetFilter === 'WITHIN_BUDGET' && targetBudget) {
      filtered = filtered.filter(k => (k.rateCardVideo || 0) <= targetBudget * 1.05);
    }

    // Lọc theo Chuyên mục
    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter(k => k.kocCategory === categoryFilter);
    }

    // Lọc theo Lịch sử hợp tác
    if (historyFilter === 'APPROVED_ONLY') {
      const approvedIds = new Set(
        deals
          .filter(d => (d.brandName || '').toLowerCase() === (plan?.brandName || '').toLowerCase() && (d.brandApprovalStatus === 'ĐÃ_DUYỆT' || d.status === 'COMPLETED'))
          .map(d => clean(d.kocChannelId || ''))
      );
      filtered = filtered.filter(k => approvedIds.has(clean(k.channelId)));
    }

    // Chấm điểm và sắp xếp
    return filtered
      .map(k => scoreCreator(k, ctx))
      .sort((a, b) => b.total - a.total)
      .slice(0, 30);
  }, [kocs, ctx, search, gradeFilter, budgetFilter, categoryFilter, historyFilter, slot, targetBudget, deals, plan]);

  const analyze = async (koc: KocItem) => {
    if (!slot || !plan) return;
    const handle = clean(koc.channelId);
    setAnalysis(a => ({ ...a, [handle]: { state: 'loading' } }));
    try {
      const cfg = loadApiWorkspaceConfig();
      const effective = getEffectiveConfigForPurpose('KOC_MATCHING', cfg);
      const unit = planUnitBudget(plan, slot.row);
      const res = await fetch('/api/integrations/tiktok-koc/channel-brief-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handles: handle,
          brandName: plan.brandName,
          productName: slot.product || undefined,
          preferredContentStyle: `${slot.pillar}${slot.angle ? ` - ${slot.angle}` : ''}`,
          maxBudgetPerVideoVnd: unit ? Math.round(unit * 1.2) : undefined,
          videoScanLimit: 30,
          background: false,
          llmConfig: {
            provider: effective.primaryProvider === 'OPENAI' ? 'OPENAI' : effective.primaryProvider === 'CLAUDE' ? 'CLAUDE' : effective.primaryProvider === 'INTERNAL' ? 'INTERNAL' : 'GEMINI',
            apiKey: effective.primaryApiKey || undefined,
            model: effective.primaryModel || undefined,
            systemInstruction: effective.purpose.systemInstruction,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.report) throw new Error(json.error || 'Không phân tích được kênh này.');
      const report = json.report as KocChannelBriefAnalysisReport;
      if (report.llmUsage) {
        const cost = calculateExecutionCost(report.llmUsage.modelUsed, {
          promptTokens: report.llmUsage.promptTokens,
          completionTokens: report.llmUsage.completionTokens,
          totalTokens: report.llmUsage.totalTokens,
        });
        recordApiUsageLog({
          purposeId: 'KOC_MATCHING',
          purposeTitle: `Khớp content KOC @${report.handle} (${plan.brandName})`,
          provider: report.llmUsage.provider,
          modelUsed: report.llmUsage.modelUsed,
          promptTokens: cost.promptTokens,
          completionTokens: cost.completionTokens,
          totalTokens: cost.totalTokens,
          costUsd: cost.costUsd,
          costVnd: cost.costVnd,
          latencyMs: report.llmUsage.latencyMs,
          status: 'SUCCESS',
          source: 'KOC_MATCHING',
        });
      }
      setAnalysis(a => ({ ...a, [handle]: { state: 'done', report } }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không phân tích được kênh này.';
      setAnalysis(a => ({ ...a, [handle]: { state: 'error', message } }));
      onNotify?.(message, 'warning');
    }
  };

  const current = slot?.kocHandle ? clean(slot.kocHandle) : '';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={slot ? `Gán KOC cho ${slot.pillar}` : 'Gán KOC'}
      size="lg"
      footer={
        <>
          {current && (
            <Button variant="secondary" onClick={() => onAssign(null)}>
              Bỏ gán @{current}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
        </>
      }
    >
      {slot && plan && (
        <div className="space-y-3">
          <div className="rounded-md bg-sunken px-3 py-2 text-xs text-ink-2">
            {slot.row ? `Bậc ${slot.row}` : 'Chưa xếp bậc'} · {slot.week ? slot.week.split(' ')[0] : 'chưa xếp tuần'} · Sản phẩm: {slot.product || 'chưa ghi'}
            {slot.angle ? ` · Góc: ${slot.angle}` : ''}
            {targetBudget ? ` · Định mức: ${fmt(targetBudget)}đ` : ''}
            {current ? ` · Đang gán @${current}` : ''}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <Input placeholder="Tìm ID kênh, tên KOC hoặc chuyên mục" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div>
              <Select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}>
                <option value="MATCH_SLOT">Bậc: Khớp ô ({slot.row || '—'})</option>
                <option value="ALL">Tất cả bậc</option>
                <option value="TAP UpAffiliate">FOC</option>
                <option value="KL1">KL1 (dưới 1tr)</option>
                <option value="KL2">KL2 (1 - 2.5tr)</option>
                <option value="KL3">KL3 (2.5 - 5tr)</option>
                <option value="KL4">KL4 (5 - 8tr)</option>
                <option value="KL5">KL5 (8 - 15tr)</option>
                <option value="KL6">KL6 (15 - 30tr)</option>
                <option value="KL7">KL7 (trên 30tr)</option>
              </Select>
            </div>
            <div>
              <Select value={budgetFilter} onChange={e => setBudgetFilter(e.target.value as 'ALL' | 'WITHIN_BUDGET')}>
                <option value="ALL">Giá: Tất cả</option>
                <option value="WITHIN_BUDGET">Trong ngân sách ô</option>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-2xs text-ink-3">
            <span>Bộ lọc nhanh:</span>
            <button
              type="button"
              onClick={() => setCategoryFilter(categoryFilter === 'ALL' ? 'Reviewer' : 'ALL')}
              className={`rounded border px-2 py-0.5 ${categoryFilter === 'Reviewer' ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-ink-2'}`}
            >
              Chuyên mục Reviewer
            </button>
            <button
              type="button"
              onClick={() => setHistoryFilter(historyFilter === 'ALL' ? 'APPROVED_ONLY' : 'ALL')}
              className={`rounded border px-2 py-0.5 ${historyFilter === 'APPROVED_ONLY' ? 'border-positive bg-positive-soft text-positive' : 'border-line bg-surface text-ink-2'}`}
            >
              Brand từng duyệt
            </button>
            {categoryFilter !== 'ALL' && (
              <button type="button" onClick={() => setCategoryFilter('ALL')} className="text-accent underline">
                Bỏ lọc chuyên mục
              </button>
            )}
            {historyFilter !== 'ALL' && (
              <button type="button" onClick={() => setHistoryFilter('ALL')} className="text-accent underline">
                Bỏ lọc lịch sử
              </button>
            )}
            <span className="ml-auto tabular-nums">{results.length} KOC phù hợp</span>
          </div>

          <div className="max-h-[52vh] space-y-2 overflow-y-auto">
            {results.length === 0 && <div className="px-3 py-8 text-center text-xs text-ink-3">Không có KOC phù hợp trong Danh bạ với bộ lọc hiện tại.</div>}
            {results.map(r => {
              const handle = clean(r.koc.channelId);
              const an = analysis[handle];
              const open = expanded === r.koc.id;

              const gradeScore = r.parts.find(p => p.key === 'GRADE')?.score || 0;
              const priceScore = r.parts.find(p => p.key === 'PRICE')?.score || 0;
              const historyScore = r.parts.find(p => p.key === 'HISTORY')?.score || 0;
              const pillarScore = r.parts.find(p => p.key === 'PILLAR')?.score || 0;

              return (
                <div key={r.koc.id} className={`rounded-md border p-3 ${handle === current ? 'border-accent bg-accent-soft' : 'border-line bg-surface'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
                        <span className="truncate font-medium text-ink">@{r.koc.channelId}</span>
                        <span className="rounded bg-sunken px-1.5 py-0.5 text-2xs text-ink-2">{r.koc.salaryGrade === 'TAP UpAffiliate' ? 'FOC' : r.koc.salaryGrade}</span>
                        {r.koc.kocCategory && <span className="rounded border border-line bg-surface px-1.5 py-0.5 text-2xs text-ink-3">{r.koc.kocCategory}</span>}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-2xs text-ink-3">
                        <span>{r.koc.stageName}</span>
                        <span>·</span>
                        <span>{fmt(r.koc.followers || 0)} follower</span>
                        <span>·</span>
                        <span className="font-medium text-ink-2">{r.koc.rateCardVideo ? `${fmt(r.koc.rateCardVideo)}đ` : 'Chưa có giá'}</span>
                      </div>

                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {gradeScore === 25 && <span className="rounded bg-positive-soft px-1.5 py-0.2 text-2xs font-medium text-positive">Đúng bậc</span>}
                        {priceScore === 10 && <span className="rounded bg-positive-soft px-1.5 py-0.2 text-2xs font-medium text-positive">Đúng giá kế hoạch</span>}
                        {historyScore > 0 && <span className="rounded bg-accent-soft px-1.5 py-0.2 text-2xs font-medium text-accent">Brand từng duyệt</span>}
                        {pillarScore >= 10 && <span className="rounded bg-sunken px-1.5 py-0.2 text-2xs text-ink-2">Khớp tệp pillar</span>}
                      </div>
                    </div>

                    <div className="w-32 shrink-0 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-sm font-semibold tabular-nums text-ink">{r.total}/100</span>
                        <Status tone={r.total >= 70 ? 'positive' : r.total >= 45 ? 'warning' : 'neutral'}>
                          {r.total >= 70 ? 'Phù hợp cao' : r.total >= 45 ? 'Phù hợp vừa' : 'Cân nhắc'}
                        </Status>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded bg-sunken">
                        <div className={`h-full ${r.total >= 70 ? 'bg-positive' : r.total >= 45 ? 'bg-accent' : 'bg-warning'}`} style={{ width: `${r.total}%` }} />
                      </div>
                    </div>
                  </div>

                  {r.warnings.length > 0 && (
                    <ul className="mt-2 space-y-0.5 rounded bg-critical-soft/50 px-2 py-1 text-2xs text-critical">
                      {r.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  )}

                  {open && (
                    <div className="mt-2.5 rounded border border-line bg-sunken/40 p-2.5">
                      <div className="mb-1 text-2xs font-medium text-ink">Bóc tách điểm 6 trụ cột (100đ):</div>
                      <ul className="space-y-1 text-2xs">
                        {r.parts.map(p => (
                          <li key={p.key} className="flex items-start gap-2">
                            <span className="w-28 shrink-0 text-ink-2">{p.label}</span>
                            <span className="w-12 shrink-0 tabular-nums font-semibold text-ink">
                              {p.score}/{p.max}
                            </span>
                            <span className="text-ink-3">{p.reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {an?.state === 'loading' && <div className="mt-2 text-2xs text-ink-3">Đang phân tích kênh, có thể mất 30 đến 90 giây…</div>}
                  {an?.state === 'error' && <div className="mt-2 text-2xs text-critical">{an.message}</div>}
                  {an?.state === 'done' && (
                    <div className="mt-2 space-y-1 rounded bg-sunken px-3 py-2 text-2xs text-ink-2">
                      <div className="flex items-center gap-2">
                        <Status tone={an.report.briefMatchEvaluation.totalScore >= 70 ? 'positive' : an.report.briefMatchEvaluation.totalScore >= 45 ? 'warning' : 'critical'}>
                          {an.report.briefMatchEvaluation.fitVerdictLabel}
                        </Status>
                        <span className="font-medium text-ink">{an.report.briefMatchEvaluation.totalScore}/100 theo nội dung kênh</span>
                      </div>
                      {an.report.briefMatchEvaluation.whyMatchStrengths.slice(0, 3).map((s, i) => (
                        <div key={`s${i}`}>+ {s}</div>
                      ))}
                      {an.report.briefMatchEvaluation.riskWarnings.slice(0, 3).map((s, i) => (
                        <div key={`r${i}`} className="text-warning">
                          − {s}
                        </div>
                      ))}
                      {an.report.briefMatchEvaluation.recommendedAngleForKoc && <div>Góc gợi ý cho KOC: {an.report.briefMatchEvaluation.recommendedAngleForKoc}</div>}
                    </div>
                  )}

                  <div className="mt-2.5 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        onAssign(r.koc.channelId);
                        onClose();
                      }}
                      disabled={handle === current}
                    >
                      {handle === current ? 'Đang gán' : 'Gán KOC này'}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setExpanded(open ? null : r.koc.id)}>
                      {open ? 'Ẩn lý do' : 'Xem lý do điểm'}
                    </Button>
                    <Button size="sm" variant="secondary" disabled={an?.state === 'loading'} onClick={() => void analyze(r.koc)}>
                      Phân tích kênh
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 border-t border-line pt-3">
            <Input placeholder="ID kênh chưa có trong Danh bạ (VD: thuyhang_skincare)" value={manual} onChange={e => setManual(e.target.value)} />
            <Button
              variant="secondary"
              disabled={!clean(manual)}
              onClick={() => {
                onAssign(clean(manual));
                setManual('');
                onClose();
              }}
            >
              Gán ID này
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
