'use client';

import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button, Modal, Select, Field } from '../ui';

interface PreviewPlan {
  id: string;
  storeName?: string;
  brandName: string;
  pic: string | null;
  matchedStore: boolean;
  relation: 'new' | 'draft' | 'locked';
  mismatches: number;
  bookingLeader: string | null;
  totalTargetBudget: number;
  totalTargetContents: number;
  notes?: string;
}

interface PreviewResult {
  month: string;
  availableMonths: string[];
  plans: PreviewPlan[];
  skipped: { storeName: string; reason: string }[];
  warnings: string[];
}

interface CommitResult {
  created: number;
  compared: number;
  locked: number;
  mismatched: { storeName: string; count: number }[];
}

interface PlanOrderUploadModalProps {
  open: boolean;
  onClose: () => void;
  /** Gọi sau khi tạo xong để màn danh sách tải lại. */
  onUploaded: (result: { created: number; compared: number; month: string }) => void;
  onNotify?: (msg: string) => void;
}

const fmtMoney = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}đ`;

/** Tải file 4.1 Plan order tổng: xem trước danh sách gian hàng rồi tạo kế hoạch Nháp giao cho chuyên viên. */
export const PlanOrderUploadModal: React.FC<PlanOrderUploadModalProps> = ({ open, onClose, onUploaded, onNotify }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [month, setMonth] = useState('');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setMonth('');
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const close = () => {
    reset();
    onClose();
  };

  const send = async (mode: 'preview' | 'commit', targetFile: File, targetMonth: string) => {
    const form = new FormData();
    form.append('file', targetFile);
    form.append('mode', mode);
    if (targetMonth) form.append('month', targetMonth);
    const res = await fetch('/api/monthly-plans/upload', { method: 'POST', body: form });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.error || `Lỗi ${res.status}`);
    return body;
  };

  const runPreview = async (targetFile: File, targetMonth: string) => {
    setBusy(true);
    setError(null);
    try {
      const body = (await send('preview', targetFile, targetMonth)) as PreviewResult;
      setPreview(body);
      setMonth(body.month);
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : 'Không đọc được file.');
    } finally {
      setBusy(false);
    }
  };

  const onPickFile = (picked: File | null) => {
    setFile(picked);
    setPreview(null);
    setMonth('');
    if (picked) void runPreview(picked, '');
  };

  const commit = async () => {
    if (!file || !preview) return;
    setBusy(true);
    setError(null);
    try {
      const body = (await send('commit', file, month)) as CommitResult & { month: string };
      const parts = [`Tạo mới ${body.created}`, `đối chiếu ${body.compared} kế hoạch nháp có sẵn`];
      if (body.locked) parts.push(`bỏ qua ${body.locked} kế hoạch đã gửi duyệt`);
      if (body.mismatched.length) parts.push(`lệch bảng 4.1: ${body.mismatched.map(m => m.storeName).join(', ')}`);
      onNotify?.(`Tháng ${body.month}: ${parts.join('; ')}.`);
      onUploaded({ created: body.created, compared: body.compared, month: body.month });
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tạo được kế hoạch.');
    } finally {
      setBusy(false);
    }
  };

  const totalBudget = preview?.plans.reduce((s, p) => s + p.totalTargetBudget, 0) ?? 0;
  const unassignedCount = preview?.plans.filter(p => !p.pic).length ?? 0;
  const unmatchedCount = preview?.plans.filter(p => !p.matchedStore).length ?? 0;

  return (
    <Modal
      open={open}
      onClose={close}
      title="Tải Plan order tổng"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Đóng
          </Button>
          <Button variant="primary" icon={Upload} disabled={busy || !preview || preview.plans.length === 0} onClick={() => void commit()}>
            {preview ? `Tạo ${preview.plans.length} kế hoạch` : 'Tạo kế hoạch'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="File 4.1 Plan order tổng (.xlsx)">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            disabled={busy}
            onChange={e => onPickFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-ink-2"
          />
        </Field>

        {preview && preview.availableMonths.length > 1 && (
          <Field label="Tháng">
            <Select
              value={month}
              disabled={busy}
              onChange={e => {
                setMonth(e.target.value);
                if (file) void runPreview(file, e.target.value);
              }}
            >
              {preview.availableMonths.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {busy && <div className="text-sm text-ink-3">Đang xử lý…</div>}
        {error && <div className="rounded-md border border-line px-3 py-2 text-sm text-danger">{error}</div>}

        {preview && (
          <div className="space-y-3">
            <div className="text-sm text-ink-2">
              Tháng {preview.month}: {preview.plans.length} gian hàng B2C, tổng ngân sách Net {fmtMoney(totalBudget)}.
            </div>
            {(unassignedCount > 0 || unmatchedCount > 0) && (
              <div className="text-sm text-ink-2">
                {unassignedCount} gian chưa có nhân sự trong app{unmatchedCount > 0 ? `, ${unmatchedCount} gian chưa khớp Dữ liệu gốc` : ''}.
              </div>
            )}
            <div className="max-h-80 overflow-auto rounded-md border border-line">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface text-left text-ink-3">
                  <tr>
                    <th className="px-3 py-2 font-medium">Gian hàng</th>
                    <th className="px-3 py-2 font-medium">Nhân sự trong app</th>
                    <th className="px-3 py-2 font-medium">Leader</th>
                    <th className="px-3 py-2 text-right font-medium">Số nội dung</th>
                    <th className="px-3 py-2 text-right font-medium">Ngân sách Net</th>
                    <th className="px-3 py-2 font-medium">Kế hoạch</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.plans.map(p => (
                    <tr key={p.id} className="border-t border-line">
                      <td className="px-3 py-2">{p.storeName || p.brandName}</td>
                      <td className="px-3 py-2">{p.pic || '—'}</td>
                      <td className="px-3 py-2">{p.bookingLeader ?? '—'}</td>
                      <td className="px-3 py-2 text-right">{p.totalTargetContents}</td>
                      <td className="px-3 py-2 text-right">{fmtMoney(p.totalTargetBudget)}</td>
                      <td className="px-3 py-2">
                        {p.relation === 'new' ? 'Tạo mới' : p.relation === 'draft' ? (p.mismatches > 0 ? `Nháp có sẵn, lệch ${p.mismatches} chỉ tiêu` : 'Nháp có sẵn') : 'Đã gửi duyệt, giữ nguyên'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.skipped.length > 0 && (
              <div className="text-sm text-ink-2">
                Bỏ qua {preview.skipped.length} gian hàng:{' '}
                {preview.skipped.map(s => `${s.storeName} (${s.reason})`).join('; ')}
              </div>
            )}
            {preview.warnings.length > 0 && (
              <div className="text-sm text-ink-3">Cần kiểm tra: {preview.warnings.join('; ')}</div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
