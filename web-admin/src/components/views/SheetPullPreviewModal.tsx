'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button, Modal } from '../ui';

export interface SheetPullChange {
  handle: string;
  briefCode?: string;
  field: string;
  app: string;
  sheet: string;
  conflict?: string;
}

interface Props {
  open: boolean;
  changes: SheetPullChange[];
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Xem trước kết quả kéo từ Google Sheet: thay đổi sẽ ghi và các mâu thuẫn với dữ liệu trong app (không ghi đè). */
export function SheetPullPreviewModal({ open, changes, busy, onCancel, onConfirm }: Props) {
  const conflicts = changes.filter(c => c.conflict);
  const writes = changes.filter(c => !c.conflict);
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Xem trước kết quả từ Google Sheet"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Hủy
          </Button>
          <Button variant="primary" disabled={busy || writes.length === 0} onClick={onConfirm}>
            {busy ? 'Đang ghi…' : `Ghi ${writes.length} thay đổi vào app`}
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        {changes.length === 0 && <p className="text-ink-2">Sheet không có thay đổi nào so với app.</p>}
        {conflicts.length > 0 && (
          <section className="rounded-lg border border-warning/40 bg-warning-soft p-3 space-y-2">
            <div className="flex items-center gap-2 font-medium text-ink">
              <AlertTriangle className="h-4 w-4 text-warning" aria-hidden />
              {conflicts.length} mâu thuẫn — app giữ nguyên, cần xử lý tay
            </div>
            <ul className="space-y-1.5 text-xs text-ink-2">
              {conflicts.map((c, i) => (
                <li key={`c-${i}`}>
                  <span className="font-medium text-ink">@{c.handle}</span>
                  {c.briefCode ? ` · ${c.briefCode}` : ''} · {c.field}: app <strong>{c.app || '—'}</strong>, Sheet <strong>{c.sheet || '—'}</strong>. {c.conflict}
                </li>
              ))}
            </ul>
          </section>
        )}
        {writes.length > 0 && (
          <section className="space-y-2">
            <div className="font-medium text-ink">{writes.length} thay đổi sẽ ghi vào app</div>
            <div className="max-h-72 overflow-y-auto rounded-lg border border-line">
              <table className="w-full text-xs">
                <thead className="bg-sunken text-ink-2">
                  <tr>
                    <th className="px-2.5 py-1.5 text-left font-medium">KOC</th>
                    <th className="px-2.5 py-1.5 text-left font-medium">Mục</th>
                    <th className="px-2.5 py-1.5 text-left font-medium">Trong app</th>
                    <th className="px-2.5 py-1.5 text-left font-medium">Trên Sheet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {writes.map((c, i) => (
                    <tr key={`w-${i}`}>
                      <td className="px-2.5 py-1.5 text-ink">@{c.handle}{c.briefCode ? <span className="text-ink-3"> · {c.briefCode}</span> : null}</td>
                      <td className="px-2.5 py-1.5 text-ink-2">{c.field}</td>
                      <td className="px-2.5 py-1.5 text-ink-2">{c.app || '—'}</td>
                      <td className="px-2.5 py-1.5 font-medium text-ink">{c.sheet || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}
