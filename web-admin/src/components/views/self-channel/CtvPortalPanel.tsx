'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button, DataTable, Input, Panel, Status } from '../../ui';
import type { Column } from '../../ui';
import { formatVnd } from '../../../lib/format';
import { SELF_FORMAT_LABEL, SELF_PLATFORM_LABEL, type SelfFormatKey, type SelfPublishPlatform } from '../../../lib/selfChannelBoardRules';
import { SELF_SETTLEMENT_STATUS_LABEL, type SelfMonthlySettlementStatus } from '../../../lib/selfChannelSettlement';

type Notify = (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
type Kind = 'SCRIPT' | 'DRAFT' | 'AIR';

interface PortalJob {
  planId: string;
  month: string;
  storeName: string;
  brandName: string;
  code: string;
  formatKey: SelfFormatKey;
  productName: string;
  angle: string;
  hook?: string;
  usp?: string;
  cta?: string;
  forbiddenClaims?: string;
  briefUrl?: string;
  deadline: string;
  publishPlatform: SelfPublishPlatform;
  feeGross: number;
  nextStep: string;
  waitingOnCtv: boolean;
  submitKind?: Kind;
}

interface PortalSettlement {
  slipCode: string;
  month: string;
  bbntCode: string;
  videos: number;
  grossTotal: number;
  pitTax: number;
  netTotal: number;
  status: SelfMonthlySettlementStatus;
}

const SUBMIT_LABEL: Record<Kind, string> = { SCRIPT: 'Nộp kịch bản', DRAFT: 'Nộp video nháp', AIR: 'Gửi link đã đăng' };

/** Cổng CTV: việc được giao (thật), nộp kịch bản / video nháp / link đăng, xem thanh toán. */
export function CtvPortalPanel({ onNotify }: { onNotify?: Notify }) {
  const [data, setData] = useState<{ contributor?: { name: string }; jobs: PortalJob[]; settlements: PortalSettlement[]; error?: string }>({ jobs: [], settlements: [] });
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/self-channel-portal', { cache: 'no-store' });
      const body = await res.json().catch(() => ({}));
      setData(res.ok ? body : { jobs: [], settlements: [], error: body?.error || 'Không tải được việc.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const submit = async (job: PortalJob) => {
    const key = `${job.planId}:${job.code}`;
    const link = (links[key] || '').trim();
    if (!job.submitKind || !link) return;
    setBusy(key);
    try {
      const res = await fetch('/api/self-channel-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: job.planId, jobCode: job.code, kind: job.submitKind, link }),
      });
      const body = await res.json().catch(() => ({}));
      onNotify?.(body?.message || body?.error || (res.ok ? 'Đã nộp.' : 'Chưa nộp được.'), res.ok ? 'success' : 'error');
      if (res.ok) {
        setLinks(prev => ({ ...prev, [key]: '' }));
        await load();
      }
    } catch {
      onNotify?.('Lỗi mạng, chưa nộp được.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const jobColumns: Column<PortalJob>[] = [
    {
      key: 'job',
      header: 'Việc',
      render: j => (
        <div>
          <div className="font-medium text-ink tabular-nums">{j.code}</div>
          <div className="text-2xs text-ink-3">
            {j.storeName} · {SELF_FORMAT_LABEL[j.formatKey]} · {SELF_PLATFORM_LABEL[j.publishPlatform]}
          </div>
        </div>
      ),
    },
    {
      key: 'brief',
      header: 'Brief',
      render: j => (
        <div className="text-xs space-y-0.5 max-w-xs">
          <div className="text-ink">{j.productName || '—'}{j.angle ? ` · ${j.angle}` : ''}</div>
          {j.hook && <div className="text-ink-3">Hook: {j.hook}</div>}
          {j.forbiddenClaims && <div className="text-critical">Tránh: {j.forbiddenClaims}</div>}
          {j.briefUrl && (
            <a href={j.briefUrl} target="_blank" rel="noreferrer" className="text-accent underline">
              Mở brief
            </a>
          )}
        </div>
      ),
    },
    { key: 'deadline', header: 'Hạn đăng', render: j => j.deadline || '—' },
    { key: 'step', header: 'Bước tiếp theo', render: j => <Status tone={j.waitingOnCtv ? 'warning' : 'neutral'}>{j.nextStep}</Status> },
    {
      key: 'submit',
      header: 'Nộp',
      render: j => {
        if (!j.waitingOnCtv || !j.submitKind) return <span className="text-xs text-ink-3">—</span>;
        const key = `${j.planId}:${j.code}`;
        return (
          <div className="flex gap-1.5 min-w-[18rem]">
            <Input value={links[key] || ''} onChange={e => setLinks(prev => ({ ...prev, [key]: e.target.value }))} placeholder="Dán link" className="h-8 text-xs" />
            <Button size="sm" variant="primary" disabled={!links[key]?.trim() || busy !== null} onClick={() => submit(j)}>
              {busy === key ? 'Đang nộp…' : SUBMIT_LABEL[j.submitKind]}
            </Button>
          </div>
        );
      },
    },
    { key: 'fee', header: 'Thù lao', align: 'right', render: j => formatVnd(j.feeGross) },
  ];

  const settlementColumns: Column<PortalSettlement>[] = [
    { key: 'slip', header: 'Phiếu', render: s => <span className="tabular-nums">{s.slipCode}</span> },
    { key: 'month', header: 'Tháng', render: s => s.month },
    { key: 'videos', header: 'Video', align: 'right', render: s => s.videos },
    { key: 'gross', header: 'Thù lao', align: 'right', render: s => formatVnd(s.grossTotal) },
    { key: 'pit', header: 'Thuế TNCN', align: 'right', render: s => formatVnd(s.pitTax) },
    { key: 'net', header: 'Thực nhận', align: 'right', render: s => formatVnd(s.netTotal) },
    { key: 'status', header: 'Trạng thái', render: s => <Status tone={s.status === 'PAID' ? 'positive' : s.status === 'REJECTED' ? 'critical' : 'info'}>{SELF_SETTLEMENT_STATUS_LABEL[s.status]}</Status> },
  ];

  return (
    <div className="space-y-4">
      <Panel
        title={data.contributor ? `Việc của ${data.contributor.name}` : 'Việc được giao'}
        description="Nộp kịch bản, video nháp và link đã đăng ngay tại đây hoặc qua Zalo (gõ /viec trong nhóm với bot)."
        flush
      >
        <DataTable
          columns={jobColumns}
          rows={data.jobs}
          rowKey={j => `${j.planId}:${j.code}`}
          loading={loading}
          empty={data.error || 'Chưa có việc nào được giao trong tháng này và tháng trước.'}
        />
      </Panel>
      <Panel title="Thanh toán" flush>
        <DataTable columns={settlementColumns} rows={data.settlements} rowKey={s => s.slipCode} loading={loading} empty="Chưa có đợt thanh toán nào." />
      </Panel>
    </div>
  );
}
