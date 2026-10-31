'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, ConfirmDialog, DataTable, Input, Panel, Segmented, Stat, StatRow, Status } from '../../ui';
import type { Column } from '../../ui';
import { formatDate, formatNumber, formatVnd } from '../../../lib/format';
import {
  SELF_ACCEPTANCE_LABEL,
  SELF_CTV_CONFIRM_LABEL,
  SELF_FORMAT_LABEL,
  SELF_PAYMENT_LABEL,
  SELF_PLATFORM_LABEL,
  type SelfAcceptanceStatus,
  type SelfCtvConfirmStatus,
  type SelfFormatKey,
  type SelfPaymentStatus,
  type SelfPublishPlatform,
} from '../../../lib/selfChannelBoardRules';
import { SELF_SETTLEMENT_STATUS_LABEL, type SelfMonthlySettlementStatus } from '../../../lib/selfChannelSettlement';

type Notify = (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
type Kind = 'SCRIPT' | 'DRAFT' | 'AIR' | 'CONFIRM';

interface PortalJob {
  planId: string;
  month: string;
  storeName: string;
  brandName: string;
  code: string;
  formatKey: SelfFormatKey;
  pillar?: string;
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
  ctvConfirmStatus?: SelfCtvConfirmStatus;
  acceptanceStatus: SelfAcceptanceStatus;
  paymentStatus: SelfPaymentStatus;
  feedback?: string[];
  acceptedAt?: string;
  pitTaxAmount?: number;
  netPayout?: number;
  dnttSlipCode?: string;
  paidAt?: string;
  uncRef?: string;
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
  paidAt?: string;
}

interface PortalProfile {
  legalMasked: string;
  bankName: string;
  bankMasked: string;
  contractCode: string;
  contractStatus: string;
  contractNeededJobs: string[];
}

type Bucket = 'NEW' | 'DOING' | 'REVISION' | 'REVIEW' | 'DONE' | 'PAYMENT';

const SUBMIT_LABEL: Record<Exclude<Kind, 'CONFIRM'>, string> = { SCRIPT: 'Nộp kịch bản', DRAFT: 'Nộp video nháp', AIR: 'Gửi link đã đăng' };
const BUCKET_LABEL: Record<Bucket, string> = {
  NEW: 'Việc mới',
  DOING: 'Đang làm',
  REVISION: 'Cần sửa',
  REVIEW: 'Chờ duyệt',
  DONE: 'Hoàn tất',
  PAYMENT: 'Thanh toán',
};

/** Một việc nằm đúng một nhóm theo trạng thái nhìn từ phía CTV. */
function bucketOf(j: PortalJob): Exclude<Bucket, 'PAYMENT'> {
  if (j.ctvConfirmStatus === 'DECLINED') return 'DONE';
  if (j.ctvConfirmStatus === 'ASSIGNED') return 'NEW';
  if (j.acceptanceStatus === 'PASSED' || j.paymentStatus === 'REQUESTED' || j.paymentStatus === 'PAID') return 'DONE';
  if (j.waitingOnCtv && (j.feedback?.length || 0) > 0) return 'REVISION';
  if (j.waitingOnCtv) return 'DOING';
  return 'REVIEW';
}

/** Cổng CTV: nhận / từ chối việc, xem brief, nộp kịch bản / video nháp / link đăng, xem phản hồi và thanh toán từng video. */
export function CtvPortalPanel({ onNotify }: { onNotify?: Notify }) {
  const [data, setData] = useState<{ contributor?: { name: string }; profile?: PortalProfile; jobs: PortalJob[]; settlements: PortalSettlement[]; error?: string }>({ jobs: [], settlements: [] });
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [bucket, setBucket] = useState<Bucket>('NEW');
  const [declining, setDeclining] = useState<PortalJob | null>(null);

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

  const post = async (job: PortalJob, payload: Record<string, unknown>, key: string) => {
    setBusy(key);
    try {
      const res = await fetch('/api/self-channel-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: job.planId, jobCode: job.code, ...payload }),
      });
      const body = await res.json().catch(() => ({}));
      onNotify?.(body?.message || body?.error || (res.ok ? 'Đã gửi.' : 'Chưa gửi được.'), res.ok ? 'success' : 'error');
      if (res.ok) {
        setLinks(prev => ({ ...prev, [key]: '' }));
        await load();
      }
    } catch {
      onNotify?.('Lỗi mạng, chưa gửi được.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const submit = (job: PortalJob) => {
    const key = `${job.planId}:${job.code}`;
    const link = (links[key] || '').trim();
    if (!job.submitKind || job.submitKind === 'CONFIRM' || !link) return;
    void post(job, { kind: job.submitKind, link }, key);
  };

  const grouped = useMemo(() => {
    const map = new Map<Bucket, PortalJob[]>();
    for (const j of data.jobs) {
      const b = bucketOf(j);
      map.set(b, [...(map.get(b) || []), j]);
    }
    return map;
  }, [data.jobs]);

  const monthTotals = useMemo(() => {
    const active = data.jobs.filter(j => j.ctvConfirmStatus !== 'DECLINED');
    const paid = active.filter(j => j.paymentStatus === 'PAID');
    const accepted = active.filter(j => j.acceptanceStatus === 'PASSED');
    return {
      jobs: active.length,
      accepted: accepted.length,
      unpaid: accepted.filter(j => j.paymentStatus !== 'PAID').reduce((s, j) => s + (j.netPayout || 0), 0),
      paid: paid.reduce((s, j) => s + (j.netPayout || 0), 0),
    };
  }, [data.jobs]);

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
      header: 'Yêu cầu',
      render: j => (
        <div className="text-xs space-y-0.5 max-w-xs">
          {j.pillar && <div className="font-medium text-ink">{j.pillar}</div>}
          <div className="text-ink">{j.productName || '—'}{j.angle ? ` · ${j.angle}` : ''}</div>
          {j.hook && <div className="text-ink-3">Hook: {j.hook}</div>}
          {j.usp && <div className="text-ink-3">Điểm chính: {j.usp}</div>}
          {j.cta && <div className="text-ink-3">Kêu gọi: {j.cta}</div>}
          {j.forbiddenClaims && <div className="text-critical">Tránh: {j.forbiddenClaims}</div>}
          {j.briefUrl && (
            <a href={j.briefUrl} target="_blank" rel="noreferrer" className="text-accent underline">
              Mở brief
            </a>
          )}
        </div>
      ),
    },
    { key: 'deadline', header: 'Hạn đăng', render: j => (j.deadline ? formatDate(j.deadline) : '—') },
    {
      key: 'step',
      header: 'Bước tiếp theo',
      render: j => (
        <div className="space-y-1 max-w-xs">
          <Status tone={j.waitingOnCtv ? 'warning' : 'neutral'}>{j.nextStep}</Status>
          {(j.feedback || []).map(f => (
            <div key={f} className="text-xs text-critical">{f}</div>
          ))}
        </div>
      ),
    },
    {
      key: 'act',
      header: 'Thao tác',
      render: j => {
        const key = `${j.planId}:${j.code}`;
        if (j.ctvConfirmStatus === 'ASSIGNED') {
          return (
            <div className="flex gap-2">
              <Button size="sm" variant="primary" disabled={busy !== null} onClick={() => void post(j, { kind: 'CONFIRM' }, key)}>
                {busy === key ? 'Đang gửi…' : 'Nhận việc'}
              </Button>
              <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => setDeclining(j)}>
                Từ chối
              </Button>
            </div>
          );
        }
        if (!j.waitingOnCtv || !j.submitKind || j.submitKind === 'CONFIRM') return <span className="text-xs text-ink-3">—</span>;
        return (
          <div className="flex gap-2 min-w-[18rem]">
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

  const doneColumns: Column<PortalJob>[] = [
    jobColumns[0],
    {
      key: 'result',
      header: 'Kết quả',
      render: j =>
        j.ctvConfirmStatus === 'DECLINED' ? (
          <Status tone="critical">{SELF_CTV_CONFIRM_LABEL.DECLINED}</Status>
        ) : (
          <Status tone={j.acceptanceStatus === 'PASSED' ? 'positive' : 'neutral'}>
            {SELF_ACCEPTANCE_LABEL[j.acceptanceStatus]}
            {j.acceptedAt ? ` · ${formatDate(j.acceptedAt)}` : ''}
          </Status>
        ),
    },
    { key: 'fee', header: 'Thù lao', align: 'right', render: j => formatVnd(j.feeGross) },
  ];

  const videoPayColumns: Column<PortalJob>[] = [
    jobColumns[0],
    { key: 'acc', header: 'Nghiệm thu', render: j => (j.acceptedAt ? formatDate(j.acceptedAt) : '—') },
    { key: 'gross', header: 'Thù lao', align: 'right', render: j => formatVnd(j.feeGross) },
    { key: 'tax', header: 'Thuế TNCN', align: 'right', render: j => formatVnd(j.pitTaxAmount || 0) },
    { key: 'net', header: 'Thực nhận', align: 'right', render: j => formatVnd(j.netPayout || 0) },
    { key: 'slip', header: 'Phiếu', render: j => j.dnttSlipCode || '—' },
    {
      key: 'status',
      header: 'Thanh toán',
      render: j => (
        <div>
          <Status tone={j.paymentStatus === 'PAID' ? 'positive' : j.paymentStatus === 'REQUESTED' ? 'info' : 'neutral'}>{SELF_PAYMENT_LABEL[j.paymentStatus]}</Status>
          {j.paidAt && <div className="text-2xs text-ink-3">Chi ngày {formatDate(j.paidAt)}{j.uncRef ? ` · UNC ${j.uncRef}` : ''}</div>}
        </div>
      ),
    },
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

  const profile = data.profile;
  const contractMissing = Boolean(profile && profile.contractNeededJobs.length > 0 && !profile.contractCode);
  const tabs = (Object.keys(BUCKET_LABEL) as Bucket[]).map(k => ({
    key: k,
    label: k === 'PAYMENT' ? BUCKET_LABEL[k] : `${BUCKET_LABEL[k]} (${formatNumber((grouped.get(k) || []).length)})`,
  }));
  const current = bucket === 'PAYMENT' ? [] : grouped.get(bucket) || [];
  const payable = data.jobs.filter(j => j.ctvConfirmStatus !== 'DECLINED' && j.acceptanceStatus === 'PASSED');

  return (
    <div className="space-y-4">
      <StatRow>
        <Stat label="Việc trong kỳ" value={formatNumber(monthTotals.jobs)} />
        <Stat label="Nghiệm thu đạt" value={formatNumber(monthTotals.accepted)} />
        <Stat label="Thực nhận chưa chi" value={formatVnd(monthTotals.unpaid)} tone={monthTotals.unpaid > 0 ? 'warning' : undefined} />
        <Stat label="Đã nhận" value={formatVnd(monthTotals.paid)} />
      </StatRow>

      <Panel title={data.contributor ? `Việc của ${data.contributor.name}` : 'Việc được giao'} actions={<Segmented items={tabs} value={bucket} onChange={setBucket} />} flush>
        {bucket === 'PAYMENT' ? (
          <div className="space-y-4 p-4">
            {profile && (
              <div className="grid gap-2 rounded-lg border border-line bg-sunken/40 p-3 text-xs sm:grid-cols-3">
                <div>
                  <div className="text-2xs text-ink-3">CCCD / Mã số thuế</div>
                  <div className="font-medium text-ink">{profile.legalMasked || 'Chưa có, liên hệ Partnership'}</div>
                </div>
                <div>
                  <div className="text-2xs text-ink-3">Tài khoản nhận tiền</div>
                  <div className="font-medium text-ink">{profile.bankMasked ? `${profile.bankName} ${profile.bankMasked}` : 'Chưa có, liên hệ Partnership'}</div>
                </div>
                <div>
                  <div className="text-2xs text-ink-3">Hợp đồng CTV</div>
                  <div className="font-medium text-ink">{profile.contractCode ? `${profile.contractCode}${profile.contractStatus ? ` · ${profile.contractStatus}` : ''}` : 'Chưa có'}</div>
                </div>
                {contractMissing && (
                  <div className="sm:col-span-3">
                    <Status tone="warning">Video {profile.contractNeededJobs.join(', ')} có giá trị từ 10.000.000 ₫ nên cần ký hợp đồng CTV trước khi thanh toán.</Status>
                  </div>
                )}
              </div>
            )}
            <div>
              <div className="mb-2 text-sm font-semibold text-ink">Theo từng video</div>
              <DataTable columns={videoPayColumns} rows={payable} rowKey={j => `${j.planId}:${j.code}`} loading={loading} empty="Chưa có video nào được nghiệm thu." />
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold text-ink">Theo đợt thanh toán</div>
              <DataTable columns={settlementColumns} rows={data.settlements} rowKey={s => s.slipCode} loading={loading} empty="Chưa có đợt thanh toán nào." />
            </div>
          </div>
        ) : (
          <DataTable
            columns={bucket === 'DONE' ? doneColumns : jobColumns}
            rows={current}
            rowKey={j => `${j.planId}:${j.code}`}
            loading={loading}
            empty={data.error || `Không có việc nào ở mục ${BUCKET_LABEL[bucket].toLowerCase()}.`}
          />
        )}
      </Panel>

      <ConfirmDialog
        open={Boolean(declining)}
        title={declining ? `Từ chối việc ${declining.code}` : 'Từ chối việc'}
        confirmLabel="Từ chối việc"
        tone="danger"
        reason={{ label: 'Lý do từ chối', required: true }}
        onConfirm={reason => {
          const job = declining;
          setDeclining(null);
          if (job) void post(job, { kind: 'DECLINE', reason: reason || '' }, `${job.planId}:${job.code}`);
        }}
        onCancel={() => setDeclining(null)}
      />
    </div>
  );
}
