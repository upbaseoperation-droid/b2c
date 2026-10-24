'use client';

import React, { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Upload } from 'lucide-react';
import { Button, Modal, Select, Field, Status } from '../ui';

interface PreviewPlan {
  id: string;
  storeName?: string;
  brandName: string;
  pic: string | null;
  matchedStore: boolean;
  isGrowthLocked?: boolean;
  growthLockLabel?: string;
  existingStatus?: string;
  relation: 'new' | 'draft' | 'locked';
  mismatches: number;
  mismatchDetails?: string[];
  lockedHasDiff?: boolean;
  diffSummary?: string[];
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
  lockedFlagged?: number;
  unconfirmedCount?: number;
  mismatched: { storeName: string; count: number }[];
  lockedDiffs?: { storeName: string; diffSummary: string[] }[];
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
  const [previewFilter, setPreviewFilter] = useState<'ALL' | 'UNCONFIRMED_41' | 'LOCKED_DIFF' | 'DRAFT_DIFF'>('ALL');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setMonth('');
    setPreview(null);
    setPreviewFilter('ALL');
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
      setPreviewFilter('ALL');
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
      const parts = [`Tạo mới ${body.created}`, `đối chiếu ${body.compared} kế hoạch nháp`];
      if (body.unconfirmedCount) parts.push(`${body.unconfirmedCount} gian chưa chốt 4.1 (chỉ lưu Nháp)`);
      if (body.lockedFlagged) parts.push(`gắn cờ "Lệch 4.1 mới" cho ${body.lockedFlagged} kế hoạch đã duyệt`);
      if (body.locked) parts.push(`giữ nguyên ${body.locked} kế hoạch đã duyệt khớp số`);
      if (body.mismatched.length) parts.push(`nháp lệch bảng 4.1: ${body.mismatched.map(m => m.storeName).join(', ')}`);
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
  const unconfirmed41Plans = preview?.plans.filter(p => p.isGrowthLocked === false) ?? [];
  const lockedDiffPlans = preview?.plans.filter(p => p.relation === 'locked' && p.lockedHasDiff) ?? [];
  const draftDiffPlans =
    preview?.plans.filter(p => p.relation === 'draft' && (p.mismatches > 0 || (p.mismatchDetails && p.mismatchDetails.length > 0))) ?? [];

  const filteredPreviewPlans =
    preview?.plans.filter(p => {
      if (previewFilter === 'UNCONFIRMED_41') return p.isGrowthLocked === false;
      if (previewFilter === 'LOCKED_DIFF') return p.relation === 'locked' && p.lockedHasDiff;
      if (previewFilter === 'DRAFT_DIFF') return p.relation === 'draft' && (p.mismatches > 0 || (p.mismatchDetails && p.mismatchDetails.length > 0));
      return true;
    }) ?? [];

  return (
    <Modal
      open={open}
      onClose={close}
      title="Tải Plan order tổng"
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Đóng
          </Button>
          <Button variant="primary" icon={Upload} disabled={busy || !preview || preview.plans.length === 0} onClick={() => void commit()}>
            {preview ? `Xác nhận nạp ${preview.plans.length} gian hàng` : 'Tạo kế hoạch'}
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
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-2">
              <span>
                Tháng <strong>{preview.month}</strong>: <strong>{preview.plans.length}</strong> gian hàng B2C, tổng ngân sách Net <strong>{fmtMoney(totalBudget)}</strong>.
              </span>
              {(unassignedCount > 0 || unmatchedCount > 0) && (
                <span className="text-xs text-ink-3">
                  {unassignedCount} gian chưa gán nhân sự{unmatchedCount > 0 ? `, ${unmatchedCount} gian chưa khớp Dữ liệu gốc` : ''}
                </span>
              )}
            </div>

            {/* Khối cảnh báo 3 lớp theo trạng thái duyệt */}
            {(unconfirmed41Plans.length > 0 || lockedDiffPlans.length > 0 || draftDiffPlans.length > 0) && (
              <div className="space-y-2">
                {lockedDiffPlans.length > 0 && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-900">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                      <div>
                        <div className="font-semibold">
                          Cảnh báo: {lockedDiffPlans.length} gian hàng ĐÃ DUYỆT / ĐANG TRÌNH DUYỆT nhưng file 4.1 mới thay đổi số liệu
                        </div>
                        <div className="mt-0.5 text-rose-800">
                          Hệ thống sẽ <strong>giữ nguyên bản đã duyệt</strong> và gắn cờ <strong>&ldquo;Lệch 4.1 mới&rdquo;</strong> trên từng gian hàng để Quản lý chủ động bấm <em>&ldquo;Mở khóa / Cập nhật theo 4.1 mới&rdquo;</em>: {lockedDiffPlans.map(p => p.storeName || p.brandName).join(', ')}.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {unconfirmed41Plans.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-950">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <div>
                        <div className="font-semibold">
                          Cảnh báo cột &ldquo;Chốt plan&rdquo;: {unconfirmed41Plans.length} gian hàng trên file 4.1 CHƯA CHỐT (số tạm tính)
                        </div>
                        <div className="mt-0.5 text-amber-900">
                          Các gian hàng này chỉ được phép <strong>lưu Nháp</strong> và bị chặn gửi duyệt phân rã 4.1.1 cho đến khi tải lên bản 4.1 đã chốt: {unconfirmed41Plans.slice(0, 8).map(p => p.storeName || p.brandName).join(', ')}{unconfirmed41Plans.length > 8 ? ` (+${unconfirmed41Plans.length - 8} gian khác)` : ''}.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {draftDiffPlans.length > 0 && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-950">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                      <div>
                        <span className="font-semibold">
                          Đối soát kế hoạch CHƯA DUYỆT (Đang nháp): {draftDiffPlans.length} gian hàng đang lệch chỉ tiêu với file 4.1 mới.
                        </span>{' '}
                        Hệ thống sẽ cập nhật mốc tham chiếu 4.1 mới để chuyên viên kiểm tra và điều chỉnh lại phân rã tuần.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Thanh lọc nhanh trong bảng xem trước */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: 'ALL' as const, label: `Tất cả (${preview.plans.length})` },
                ...(lockedDiffPlans.length > 0
                  ? [{ key: 'LOCKED_DIFF' as const, label: `Đã duyệt lệch 4.1 (${lockedDiffPlans.length})` }]
                  : []),
                ...(unconfirmed41Plans.length > 0
                  ? [{ key: 'UNCONFIRMED_41' as const, label: `Chưa chốt 4.1 (${unconfirmed41Plans.length})` }]
                  : []),
                ...(draftDiffPlans.length > 0
                  ? [{ key: 'DRAFT_DIFF' as const, label: `Nháp lệch chỉ tiêu (${draftDiffPlans.length})` }]
                  : []),
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setPreviewFilter(tab.key)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                    previewFilter === tab.key
                      ? 'border-accent bg-accent text-white'
                      : 'border-line bg-surface text-ink-2 hover:bg-sunken'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="max-h-80 overflow-auto rounded-md border border-line">
              {/* MOBILE CARDS (< 768px) */}
              <div className="md:hidden divide-y divide-line">
                {filteredPreviewPlans.map(p => {
                  const isLocked41 = p.isGrowthLocked !== false;
                  return (
                    <div
                      key={`m-prev-${p.id}`}
                      className={`p-3 space-y-1.5 text-xs ${
                        p.relation === 'locked' && p.lockedHasDiff
                          ? 'bg-rose-50/50'
                          : !isLocked41
                          ? 'bg-amber-50/40'
                          : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-ink">{p.storeName || p.brandName}</div>
                          <div className="text-2xs text-ink-3">
                            PIC: {p.pic || '—'} {p.bookingLeader ? `· Leader: ${p.bookingLeader}` : ''}
                          </div>
                        </div>
                        {isLocked41 ? (
                          <Status tone="positive">Đã chốt</Status>
                        ) : (
                          <Status tone="warning">{p.growthLockLabel || 'Chưa chốt'}</Status>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-2xs tabular-nums bg-surface-2/60 rounded px-2 py-1 border border-line">
                        <span>Số nội dung: <strong className="text-ink">{p.totalTargetContents}</strong></span>
                        <span>Ngân sách Net: <strong className="text-ink">{fmtMoney(p.totalTargetBudget)}</strong></span>
                      </div>

                      <div className="text-2xs">
                        {p.relation === 'new' ? (
                          <span className="text-ink-2">
                            Tạo mới Nháp{!isLocked41 ? ' · Chặn gửi duyệt (chờ Chốt 4.1)' : ''}
                          </span>
                        ) : p.relation === 'draft' ? (
                          <div className="space-y-0.5">
                            <div className={p.mismatches > 0 || (p.mismatchDetails && p.mismatchDetails.length > 0) ? 'font-semibold text-amber-800' : 'text-ink-2'}>
                              {p.mismatches > 0
                                ? `Đang nháp · Lệch ${p.mismatches} chỉ tiêu phân rã`
                                : p.mismatchDetails && p.mismatchDetails.length > 0
                                ? 'Đang nháp · Có thay đổi số 4.1'
                                : 'Đang nháp · Khớp bảng 4.1'}
                            </div>
                            {p.mismatchDetails && p.mismatchDetails.length > 0 && (
                              <div className="text-2xs text-amber-700">
                                {p.mismatchDetails.slice(0, 3).join(' · ')}
                              </div>
                            )}
                          </div>
                        ) : p.lockedHasDiff ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-rose-700">
                              Đã duyệt / Đang trình · Lệch số 4.1 mới (Giữ nguyên &amp; gắn cờ)
                            </div>
                            {p.diffSummary && p.diffSummary.length > 0 && (
                              <div className="text-2xs text-rose-600">
                                {p.diffSummary.join(' · ')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Đã gửi duyệt / Đã duyệt · Khớp 4.1 (Giữ nguyên)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP TABLE (>= 768px) */}
              <table className="hidden md:table w-full min-w-[680px] text-xs">
                <thead className="sticky top-0 bg-surface text-left text-ink-3 border-b border-line">
                  <tr>
                    <th className="px-3 py-2 font-medium">Gian hàng</th>
                    <th className="px-2.5 py-2 font-medium">Chốt 4.1</th>
                    <th className="px-2.5 py-2 font-medium">Nhân sự</th>
                    <th className="px-2.5 py-2 text-right font-medium">Số nội dung</th>
                    <th className="px-2.5 py-2 text-right font-medium">Ngân sách Net</th>
                    <th className="px-3 py-2 font-medium">Trạng thái kế hoạch &amp; Cảnh báo đối soát</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPreviewPlans.map(p => {
                    const isLocked41 = p.isGrowthLocked !== false;
                    return (
                      <tr
                        key={p.id}
                        className={`border-t border-line ${
                          p.relation === 'locked' && p.lockedHasDiff
                            ? 'bg-rose-50/50'
                            : !isLocked41
                            ? 'bg-amber-50/40'
                            : ''
                        }`}
                      >
                        <td className="px-3 py-2 font-medium text-ink">
                          <div>{p.storeName || p.brandName}</div>
                          {p.bookingLeader && <div className="text-2xs font-normal text-ink-3">Leader: {p.bookingLeader}</div>}
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          {isLocked41 ? (
                            <Status tone="positive">Đã chốt</Status>
                          ) : (
                            <Status tone="warning">{p.growthLockLabel || 'Chưa chốt'}</Status>
                          )}
                        </td>
                        <td className="px-2.5 py-2 text-ink-2">{p.pic || '—'}</td>
                        <td className="px-2.5 py-2 text-right tabular-nums">{p.totalTargetContents}</td>
                        <td className="px-2.5 py-2 text-right tabular-nums font-medium">{fmtMoney(p.totalTargetBudget)}</td>
                        <td className="px-3 py-2">
                          {p.relation === 'new' ? (
                            <span className="text-ink-2">
                              Tạo mới Nháp{!isLocked41 ? ' · Chặn gửi duyệt (chờ Chốt 4.1)' : ''}
                            </span>
                          ) : p.relation === 'draft' ? (
                            <div className="space-y-0.5">
                              <div className={p.mismatches > 0 || (p.mismatchDetails && p.mismatchDetails.length > 0) ? 'font-semibold text-amber-800' : 'text-ink-2'}>
                                {p.mismatches > 0
                                  ? `Đang nháp · Lệch ${p.mismatches} chỉ tiêu phân rã`
                                  : p.mismatchDetails && p.mismatchDetails.length > 0
                                  ? 'Đang nháp · Có thay đổi số 4.1'
                                  : 'Đang nháp · Khớp bảng 4.1'}
                              </div>
                              {p.mismatchDetails && p.mismatchDetails.length > 0 && (
                                <div className="text-2xs text-amber-700">
                                  {p.mismatchDetails.slice(0, 3).join(' · ')}
                                </div>
                              )}
                            </div>
                          ) : p.lockedHasDiff ? (
                            <div className="space-y-0.5">
                              <div className="font-semibold text-rose-700">
                                Đã duyệt / Đang trình · Lệch số 4.1 mới (Giữ nguyên &amp; gắn cờ)
                              </div>
                              {p.diffSummary && p.diffSummary.length > 0 && (
                                <div className="text-2xs text-rose-600">
                                  {p.diffSummary.join(' · ')}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Đã gửi duyệt / Đã duyệt · Khớp 4.1 (Giữ nguyên)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
