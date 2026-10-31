'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button, DataTable, Field, Input, Modal, Panel, PeriodPicker, Status } from '../../ui';
import type { Column } from '../../ui';
import { formatNumber, formatVnd } from '../../../lib/format';
import { SELF_FORMAT_LABEL } from '../../../lib/selfChannelBoardRules';
import {
  SELF_SETTLEMENT_STATUS_LABEL,
  type SelfMonthlySettlement,
} from '../../../lib/selfChannelSettlement';

type Notify = (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;

interface SettlementResponse {
  settlements?: SelfMonthlySettlement[];
  access?: { manage: boolean; finance: boolean; view: boolean };
  larkLive?: boolean;
  warnings?: string[];
  error?: string;
}

const STATUS_TONE: Record<SelfMonthlySettlement['status'], 'neutral' | 'info' | 'warning' | 'positive' | 'critical'> = {
  REQUESTED: 'info',
  APPROVED: 'warning',
  REJECTED: 'critical',
  PAID: 'positive',
  CANCELLED: 'neutral',
};

/** Xuất BBNT sản lượng tháng của 1 CTV (bảng kê các video đạt × đơn giá) để in / ký. */
function downloadBbntCsv(s: SelfMonthlySettlement) {
  const esc = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [
    ['BIÊN BẢN NGHIỆM THU SẢN LƯỢNG THÁNG', s.bbntCode],
    ['Tháng', s.month],
    ['CTV', `${s.contributorName} (${s.contributorCode})`],
    ['Hợp đồng khung', s.contractCode || 'Miễn HĐ (< 10.000.000đ)'],
    ['CCCD / MST', s.payee.legalId],
    [],
    ['STT', 'Mã việc', 'Gian hàng', 'Loại video', 'Link đăng', 'Ngày đăng', 'Thù lao (Gross)'],
    ...s.jobs.map((j, i) => [i + 1, j.jobCode, j.storeName, SELF_FORMAT_LABEL[j.formatKey], j.airLink, j.airedAt, j.feeGross]),
    [],
    ['Tổng thù lao (Gross)', s.grossTotal],
    ['Thuế TNCN 10% (theo tổng tháng)', s.pitTax],
    ['Thực nhận', s.netTotal],
  ];
  const csv = '﻿' + rows.map(r => r.map(esc).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${s.bbntCode}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function defaultMonth() {
  const d = new Date(Date.now() + 7 * 3_600_000);
  return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function recentMonths(from: string) {
  const [y, m] = from.split('/').map(Number);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}

/** Đợt quyết toán tháng lập theo cách cũ (trước khi chuyển sang phiếu từng video): chỉ để theo dõi và xử lý nốt các đợt còn mở. */
export function SelfChannelLegacySettlementPanel({ onNotify }: { onNotify?: Notify }) {
  const [month, setMonth] = useState(defaultMonth);
  const [data, setData] = useState<SettlementResponse>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [payTarget, setPayTarget] = useState<SelfMonthlySettlement | null>(null);
  const [uncRef, setUncRef] = useState('');

  const load = useCallback(
    async (m: string) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/self-channel-settlement?month=${encodeURIComponent(m)}`, { cache: 'no-store' });
        const body = (await res.json().catch(() => ({}))) as SettlementResponse;
        if (!res.ok) onNotify?.(body.error || 'Không tải được quyết toán.', 'error');
        setData(res.ok ? body : {});
      } catch {
        onNotify?.('Lỗi mạng khi tải quyết toán.', 'error');
      } finally {
        setLoading(false);
      }
    },
    [onNotify]
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) await load(month);
    })();
    return () => {
      cancelled = true;
    };
  }, [month, load]);

  const run = async (busyKey: string, payload: Record<string, unknown>, okMsg: string) => {
    setBusyId(busyKey);
    try {
      const res = await fetch('/api/self-channel-settlement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, ...payload }),
      });
      const body = (await res.json().catch(() => ({}))) as SettlementResponse;
      if (!res.ok) {
        onNotify?.(body.error || 'Thao tác không thành công.', 'error');
        return false;
      }
      onNotify?.(okMsg, 'success');
      for (const w of body.warnings || []) onNotify?.(w, 'warning');
      await load(month);
      return true;
    } catch {
      onNotify?.('Lỗi mạng, chưa thực hiện được.', 'error');
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const access = data.access || { manage: false, finance: false, view: false };
  const settlements = data.settlements || [];

  const settlementColumns: Column<SelfMonthlySettlement>[] = [
    {
      key: 'slip',
      header: 'Phiếu / BBNT',
      render: s => (
        <div>
          <div className="font-medium text-ink tabular-nums">{s.slipCode}</div>
          <div className="text-2xs text-ink-3 tabular-nums">{s.bbntCode}</div>
        </div>
      ),
    },
    { key: 'ctv', header: 'CTV', render: s => s.contributorName },
    { key: 'jobs', header: 'Video', align: 'right', render: s => formatNumber(s.jobs.length) },
    { key: 'net', header: 'Thực nhận', align: 'right', render: s => formatVnd(s.netTotal) },
    {
      key: 'status',
      header: 'Trạng thái',
      render: s => (
        <div className="space-y-0.5">
          <Status tone={STATUS_TONE[s.status]}>{SELF_SETTLEMENT_STATUS_LABEL[s.status]}</Status>
          {s.larkMode === 'SANDBOX' && <div className="text-2xs text-warning">Môi trường thử: chưa gửi Lark</div>}
          {s.uncRef && <div className="text-2xs text-ink-3">UNC: {s.uncRef}</div>}
        </div>
      ),
    },
    {
      key: 'act',
      header: '',
      align: 'right',
      render: s => (
        <div className="flex justify-end gap-2 flex-wrap">
          <Button size="sm" variant="ghost" onClick={() => downloadBbntCsv(s)}>
            Tải BBNT
          </Button>
          {s.larkMode === 'LIVE' && (s.status === 'REQUESTED' || s.status === 'APPROVED') && (
            <Button size="sm" variant="secondary" disabled={busyId !== null} onClick={() => run(`s-${s.id}`, { op: 'syncLark', id: s.id }, `Đã cập nhật trạng thái Lark của ${s.slipCode}.`)}>
              Đồng bộ Lark
            </Button>
          )}
          {access.finance && (s.status === 'APPROVED' || (s.larkMode === 'SANDBOX' && s.status === 'REQUESTED')) && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setUncRef('');
                setPayTarget(s);
              }}
            >
              Xác nhận đã chi
            </Button>
          )}
          {access.manage && s.status === 'REQUESTED' && (
            <Button size="sm" variant="ghost" disabled={busyId !== null} onClick={() => run(`x-${s.id}`, { op: 'cancel', id: s.id }, `Đã hủy đợt ${s.slipCode}, các video trở lại chờ quyết toán.`)}>
              Hủy
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (!loading && settlements.length === 0) return null;

  return (
    <div className="space-y-4">
      <Panel
        title="Đợt quyết toán tháng đã lập trước đây"
        actions={
          <PeriodPicker value={month} onChange={setMonth} options={recentMonths(defaultMonth())} />
        }
        flush
      >
        <DataTable columns={settlementColumns} rows={settlements} rowKey={s => s.id} loading={loading} empty="Không có đợt quyết toán tháng nào trong tháng này." />
      </Panel>

      <Modal
        open={Boolean(payTarget)}
        onClose={() => setPayTarget(null)}
        title="Xác nhận đã chi"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPayTarget(null)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              disabled={!uncRef.trim() || busyId !== null}
              onClick={async () => {
                if (!payTarget) return;
                const ok = await run(`p-${payTarget.id}`, { op: 'markPaid', id: payTarget.id, uncRef }, `Đã xác nhận chi ${payTarget.slipCode}.`);
                if (ok) setPayTarget(null);
              }}
            >
              Xác nhận
            </Button>
          </div>
        }
      >
        {payTarget && (
          <div className="space-y-3">
            <p className="text-sm text-ink">
              {payTarget.slipCode} · {payTarget.contributorName} · thực nhận <strong>{formatVnd(payTarget.netTotal)}</strong> vào{' '}
              {payTarget.payee.bankName} {payTarget.payee.bankAccount}.
            </p>
            <Field label="Mã lệnh chi / UNC ngân hàng">
              <Input value={uncRef} onChange={e => setUncRef(e.target.value)} placeholder="VD: UNC-20261105-0012" />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
