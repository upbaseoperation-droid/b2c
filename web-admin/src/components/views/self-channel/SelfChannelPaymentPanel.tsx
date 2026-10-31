'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, DataTable, Input, Panel, PeriodPicker, Status } from '../../ui';
import type { Column } from '../../ui';
import { formatDate, formatNumber, formatVnd } from '../../../lib/format';
import type { LarkPaymentRequestSlip } from '../../../lib/larkPaymentRequestEngine';
import { evaluateSelfJobForPaymentSlip, SELF_PAYMENT_CATEGORY } from '../../../lib/selfChannelPaymentSlip';
import { SELF_FORMAT_LABEL } from '../../../lib/selfChannelBoardRules';
import type { Contributor } from '../../../lib/types';
import type { HubJob } from './SelfChannelMonthPanels';

type Notify = (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
type Approval = LarkPaymentRequestSlip['larkSync']['approvalStatus'];

const APPROVAL_LABEL: Record<Approval, string> = {
  PENDING_LEADER: 'Chờ Trưởng nhóm duyệt',
  PENDING_DIRECTOR: 'Chờ Giám đốc MKT duyệt',
  PENDING_FINANCE: 'Chờ Kế toán duyệt',
  APPROVED: 'Đã duyệt, chờ đi tiền',
  PAID: 'Đã đi tiền',
  REJECTED: 'Bị từ chối',
};
const APPROVAL_TONE: Record<Approval, 'neutral' | 'info' | 'warning' | 'positive' | 'critical'> = {
  PENDING_LEADER: 'info',
  PENDING_DIRECTOR: 'info',
  PENDING_FINANCE: 'warning',
  APPROVED: 'warning',
  PAID: 'positive',
  REJECTED: 'critical',
};

const defaultMonth = () => {
  const d = new Date(Date.now() + 7 * 3_600_000);
  return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
const recentMonths = (from: string) => {
  const [y, m] = from.split('/').map(Number);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  });
};

interface PendingRow {
  job: HubJob;
  issues: string[];
  gross: number;
  pit: number;
  net: number;
}

/**
 * Thanh toán Content kênh: mỗi video nghiệm thu Đạt lập một phiếu ĐNTT trên cùng sổ phiếu và kết nối Lark với Booking video
 * (tuyến duyệt theo hạn mức, KT Handle đã đi tiền + UNC, trạng thái phiếu tự về việc).
 */
export function SelfChannelPaymentPanel({ onNotify, contributors = [] }: { onNotify?: Notify; contributors?: Contributor[] }) {
  const [month, setMonth] = useState(defaultMonth);
  const [jobs, setJobs] = useState<HubJob[]>([]);
  const [slips, setSlips] = useState<LarkPaymentRequestSlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [unc, setUnc] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [boardRes, slipRes] = await Promise.all([
        fetch('/api/self-channel-board?all=1', { cache: 'no-store' }),
        fetch('/api/integrations/larkbase/payment-requests', { cache: 'no-store' }),
      ]);
      const board = (await boardRes.json().catch(() => ({}))) as { jobs?: HubJob[]; error?: string };
      if (!boardRes.ok) onNotify?.(board.error || 'Không tải được việc Content kênh.', 'error');
      setJobs(boardRes.ok ? board.jobs || [] : []);
      const slipBody = (await slipRes.json().catch(() => ({}))) as { slips?: LarkPaymentRequestSlip[]; error?: string };
      if (!slipRes.ok) onNotify?.(slipBody.error || 'Không tải được sổ phiếu thanh toán.', 'warning');
      setSlips(slipRes.ok ? slipBody.slips || [] : []);
    } catch {
      onNotify?.('Lỗi mạng khi tải dữ liệu thanh toán.', 'error');
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  // Việc đã nghiệm thu Đạt, có thù lao, chưa có phiếu: tính điều kiện lập phiếu bằng đúng bộ luật máy chủ dùng
  const pending = useMemo<PendingRow[]>(
    () =>
      jobs
        .filter(j => j.month === month && j.lifecycleStatus !== 'CANCELLED' && j.productionMode === 'CTV_OUTSOURCE' && j.acceptanceStatus === 'PASSED' && j.feeGross > 0 && j.paymentStatus === 'NONE')
        .map(job => {
          const ctv = job.contributorId ? contributors.find(c => c.id === job.contributorId) : undefined;
          const line = evaluateSelfJobForPaymentSlip(job, { id: job.planId, storeName: job.storeName, brandName: job.brandName, month: job.month }, ctv);
          return { job, issues: line.issues.map(i => i.message), gross: line.grossContractAmount, pit: line.pitDeductionAmount, net: line.netTransferAmount };
        }),
    [jobs, month, contributors]
  );

  const selfSlips = useMemo(() => slips.filter(s => s.larkPaymentCategory === SELF_PAYMENT_CATEGORY && s.month === month), [slips, month]);

  const totals = useMemo(
    () => ({
      pending: pending.length,
      ready: pending.filter(p => p.issues.length === 0).length,
      inFlow: selfSlips.filter(s => s.larkSync.approvalStatus !== 'PAID' && s.larkSync.approvalStatus !== 'REJECTED').reduce((n, s) => n + s.totals.netTransferTotal, 0),
      paid: selfSlips.filter(s => s.larkSync.approvalStatus === 'PAID').reduce((n, s) => n + s.totals.netTransferTotal, 0),
    }),
    [pending, selfSlips]
  );

  const createSlip = async (row: PendingRow, silent = false): Promise<boolean> => {
    setBusy(`c-${row.job.id}`);
    try {
      const res = await fetch('/api/integrations/larkbase/payment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'SELF_CHANNEL', planId: row.job.planId, jobId: row.job.id }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) {
        onNotify?.(`${row.job.code}: ${body.message || body.error || 'Không lập được phiếu.'}`, 'error');
        return false;
      }
      if (!silent) onNotify?.(body.message || `Đã lập phiếu cho ${row.job.code}.`, 'success');
      return true;
    } catch {
      onNotify?.('Lỗi mạng, chưa lập được phiếu.', 'error');
      return false;
    } finally {
      setBusy(null);
    }
  };

  const createAllReady = async () => {
    let ok = 0;
    for (const row of pending.filter(p => p.issues.length === 0)) {
      if (await createSlip(row, true)) ok += 1;
    }
    if (ok > 0) onNotify?.(`Đã lập ${ok} phiếu thanh toán.`, 'success');
    await load();
  };

  const syncLark = async (slip: LarkPaymentRequestSlip) => {
    setBusy(`s-${slip.id}`);
    try {
      const res = await fetch('/api/integrations/larkbase/payment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'SYNC_LARK_STATUS', slipCode: slip.slipCode }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      onNotify?.(body.message || (res.ok ? 'Đã đồng bộ.' : 'Chưa đồng bộ được.'), res.ok ? 'success' : 'error');
      await load();
    } finally {
      setBusy(null);
    }
  };

  const advance = async (slip: LarkPaymentRequestSlip, action: 'ADVANCE_STEP' | 'REJECT_SLIP') => {
    setBusy(`a-${slip.id}`);
    try {
      const res = await fetch('/api/integrations/larkbase/payment-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slipId: slip.id,
          approvalInstanceCode: slip.larkSync.approvalInstanceCode,
          action,
          uncBillCode: unc[slip.id]?.trim() || undefined,
          rejectedReason: action === 'REJECT_SLIP' ? 'Cần bổ sung chứng từ hoặc kiểm tra lại tài khoản' : undefined,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      onNotify?.(body.message || (res.ok ? 'Đã cập nhật.' : 'Chưa cập nhật được.'), res.ok ? 'success' : 'error');
      await load();
    } finally {
      setBusy(null);
    }
  };

  const pendingColumns: Column<PendingRow>[] = [
    {
      key: 'job',
      header: 'Video',
      render: r => (
        <div>
          <div className="font-medium text-ink tabular-nums">{r.job.code}</div>
          <div className="text-2xs text-ink-3">{r.job.storeName} · {SELF_FORMAT_LABEL[r.job.formatKey]}</div>
        </div>
      ),
    },
    { key: 'ctv', header: 'CTV', render: r => r.job.contributorName || '—' },
    { key: 'aired', header: 'Ngày đăng', render: r => (r.job.airedAt ? formatDate(r.job.airedAt) : '—') },
    { key: 'gross', header: 'Thù lao', align: 'right', render: r => formatVnd(r.gross) },
    { key: 'pit', header: 'Thuế TNCN', align: 'right', render: r => formatVnd(r.pit) },
    { key: 'net', header: 'Thực chuyển', align: 'right', render: r => formatVnd(r.net) },
    {
      key: 'state',
      header: 'Điều kiện',
      render: r =>
        r.issues.length ? (
          <ul className="space-y-0.5 text-xs text-critical max-w-xs">
            {r.issues.map(i => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        ) : (
          <Status tone="positive">Đủ hồ sơ</Status>
        ),
    },
    {
      key: 'act',
      header: '',
      align: 'right',
      render: r => (
        <Button size="sm" variant="primary" disabled={r.issues.length > 0 || busy !== null} onClick={async () => { if (await createSlip(r)) await load(); }}>
          {busy === `c-${r.job.id}` ? 'Đang lập…' : 'Lập phiếu'}
        </Button>
      ),
    },
  ];

  const slipColumns: Column<LarkPaymentRequestSlip>[] = [
    {
      key: 'slip',
      header: 'Phiếu',
      render: s => (
        <div>
          <div className="font-medium text-ink tabular-nums">{s.slipCode}</div>
          <div className="text-2xs text-ink-3">{s.lineItems[0]?.dealCode}</div>
        </div>
      ),
    },
    { key: 'ctv', header: 'CTV', render: s => s.payee.kocStageName },
    { key: 'gross', header: 'Thù lao', align: 'right', render: s => formatVnd(s.totals.grossTotal) },
    { key: 'pit', header: 'Thuế TNCN', align: 'right', render: s => formatVnd(s.totals.pitTax10PctTotal) },
    { key: 'net', header: 'Thực chuyển', align: 'right', render: s => formatVnd(s.totals.netTransferTotal) },
    {
      key: 'status',
      header: 'Trạng thái',
      render: s => (
        <div className="space-y-0.5">
          <Status tone={APPROVAL_TONE[s.larkSync.approvalStatus]}>{APPROVAL_LABEL[s.larkSync.approvalStatus]}</Status>
          <div className="text-2xs text-ink-3">{s.larkSync.approvalInstanceCode}</div>
          {s.larkSync.syncMode === 'SANDBOX_SIMULATED' && <div className="text-2xs text-warning">Môi trường thử: chưa gửi Lark</div>}
          {s.larkSync.uncBillCode && <div className="text-2xs text-ink-3">UNC: {s.larkSync.uncBillCode}</div>}
          {s.larkSync.rejectedReason && <div className="text-2xs text-critical">{s.larkSync.rejectedReason}</div>}
        </div>
      ),
    },
    {
      key: 'act',
      header: '',
      align: 'right',
      render: s => {
        const st = s.larkSync.approvalStatus;
        const open = st !== 'PAID' && st !== 'REJECTED';
        return (
          <div className="flex flex-wrap justify-end gap-2">
            {s.larkSync.syncMode === 'LIVE_LARK_API' && open && (
              <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => syncLark(s)}>
                Đồng bộ Lark
              </Button>
            )}
            {st === 'APPROVED' && (
              <Input
                value={unc[s.id] || ''}
                onChange={e => setUnc(prev => ({ ...prev, [s.id]: e.target.value }))}
                placeholder="Mã UNC"
                className="h-8 w-36 text-xs"
              />
            )}
            {open && (
              <Button size="sm" variant="primary" disabled={busy !== null} onClick={() => advance(s, 'ADVANCE_STEP')}>
                {st === 'APPROVED' ? 'Xác nhận đã đi tiền' : 'Duyệt bước này'}
              </Button>
            )}
            {open && (
              <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => advance(s, 'REJECT_SLIP')}>
                Từ chối
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <Panel
        title="Video đã nghiệm thu, chờ lập phiếu"
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <Status tone="neutral">Thuế TNCN 10% từ 2.000.000 ₫ · Hợp đồng từ 10.000.000 ₫ · BBNT từ 20.000.000 ₫ (mỗi video)</Status>
            <PeriodPicker value={month} onChange={setMonth} options={recentMonths(defaultMonth())} />
            <Button size="sm" variant="primary" disabled={totals.ready === 0 || busy !== null} onClick={() => void createAllReady()}>
              Lập phiếu cho {formatNumber(totals.ready)} video đủ điều kiện
            </Button>
          </div>
        }
        flush
      >
        <DataTable columns={pendingColumns} rows={pending} rowKey={r => `${r.job.planId}:${r.job.id}`} loading={loading} empty="Không có video nào chờ lập phiếu trong tháng." />
      </Panel>

      <Panel title="Phiếu thanh toán Content kênh" flush>
        <DataTable columns={slipColumns} rows={selfSlips} rowKey={s => s.id} loading={loading} empty="Chưa có phiếu nào trong tháng." />
      </Panel>
    </div>
  );
}
