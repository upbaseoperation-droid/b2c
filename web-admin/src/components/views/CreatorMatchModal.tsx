'use client';

import React, { useMemo, useState } from 'react';
import type { BookingDealItem, InputPlanBreakdownState, KocItem } from '../../lib/types';
import type { KocChannelBriefAnalysisReport } from '../../lib/kocChannelBriefAnalyzer';
import { Button, Input, Modal, Status } from '../ui';
import { planUnitBudget, rankCreators, scoreCreator, type MatchResult } from '../../lib/creatorMatching';
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
  const [expanded, setExpanded] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const [analysis, setAnalysis] = useState<Record<string, AnalysisState>>({});

  const ctx = useMemo(() => (slot && plan ? { slot, plan, deals, usedHandles: new Set(Array.from(usedHandles).filter(h => h !== clean(slot.kocHandle || ''))) } : null), [slot, plan, deals, usedHandles]);

  const results: MatchResult[] = useMemo(() => {
    if (!ctx) return [];
    const q = search.trim().toLowerCase();
    if (!q) return rankCreators(kocs, ctx, 12);
    return kocs
      .filter(k => `${k.channelId} ${k.stageName}`.toLowerCase().includes(q))
      .slice(0, 30)
      .map(k => scoreCreator(k, ctx))
      .sort((a, b) => b.total - a.total);
  }, [kocs, ctx, search]);

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
            {current ? ` · Đang gán @${current}` : ''}
          </div>

          <Input placeholder="Tìm KOC theo ID kênh hoặc tên" value={search} onChange={e => setSearch(e.target.value)} />

          <div className="max-h-[52vh] space-y-2 overflow-y-auto">
            {results.length === 0 && <div className="px-3 py-8 text-center text-xs text-ink-3">Không có KOC phù hợp trong Danh bạ.</div>}
            {results.map(r => {
              const handle = clean(r.koc.channelId);
              const an = analysis[handle];
              const open = expanded === r.koc.id;
              return (
                <div key={r.koc.id} className={`rounded-md border p-3 ${handle === current ? 'border-accent bg-accent-soft' : 'border-line bg-surface'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[13px]">
                        <span className="truncate font-medium text-ink">@{r.koc.channelId}</span>
                        <span className="rounded bg-sunken px-1.5 py-0.5 text-2xs text-ink-2">{r.koc.salaryGrade === 'TAP UpAffiliate' ? 'FOC' : r.koc.salaryGrade}</span>
                      </div>
                      <div className="mt-0.5 text-2xs text-ink-3">
                        {r.koc.stageName} · {fmt(r.koc.followers || 0)} follower · {r.koc.rateCardVideo ? `${fmt(r.koc.rateCardVideo)}đ` : 'chưa có giá'}
                      </div>
                    </div>
                    <div className="w-28 shrink-0 text-right">
                      <div className="text-sm font-semibold tabular-nums text-ink">{r.total}/100</div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded bg-sunken">
                        <div className={`h-full ${r.total >= 70 ? 'bg-positive' : r.total >= 45 ? 'bg-accent' : 'bg-warning'}`} style={{ width: `${r.total}%` }} />
                      </div>
                    </div>
                  </div>

                  {r.warnings.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-2xs text-critical">
                      {r.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  )}

                  {open && (
                    <ul className="mt-2 space-y-1 border-t border-line pt-2 text-2xs">
                      {r.parts.map(p => (
                        <li key={p.key} className="flex items-start gap-2">
                          <span className="w-28 shrink-0 text-ink-2">{p.label}</span>
                          <span className="w-12 shrink-0 tabular-nums font-medium text-ink">
                            {p.score}/{p.max}
                          </span>
                          <span className="text-ink-3">{p.reason}</span>
                        </li>
                      ))}
                    </ul>
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

                  <div className="mt-2 flex items-center gap-2">
                    <Button size="sm" variant="primary" onClick={() => onAssign(r.koc.channelId)} disabled={handle === current}>
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
            <Input placeholder="ID kênh chưa có trong Danh bạ" value={manual} onChange={e => setManual(e.target.value)} />
            <Button
              variant="secondary"
              disabled={!clean(manual)}
              onClick={() => {
                onAssign(clean(manual));
                setManual('');
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
