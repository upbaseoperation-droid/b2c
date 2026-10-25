'use client';

import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import type { AssignmentLogEntry } from '../../../lib/assignmentNormalize';

const FIELD_LABEL: Record<string, string> = {
  b2cOwnerName: 'Booking chính',
  primaryPic: 'Booking chính',
  assignedStaff: 'Booking chính',
  assignedPic: 'Booking chính',
  b2cOwners: 'Danh sách Booking',
  assignedMembers: 'Booking cùng làm',
  bookingLeader: 'Leader Booking',
  hasBookingLeader: 'Có Leader',
  contentPic: 'PIC Kênh tự sở hữu',
  backupOwnerName: 'Dự phòng',
  isBackupActive: 'Bật dự phòng',
  backupFrom: 'Dự phòng từ ngày',
  backupTo: 'Dự phòng đến ngày',
  accountOwnerName: 'Account PIC',
  accountPic: 'Account PIC',
  planStrategyPic: 'PIC Plan / Strategy',
  keyVisualSisPic: 'PIC Key Visual / SIS',
  contentBrandMainPic: 'Content / Brand main',
  bookingPicLead: 'Trưởng nhóm Booking (nhãn)',
  brandPicName: 'Brand PIC',
  selfAirAllowed: 'Đồng ý tự Air',
};

/** Nhật ký phân công của một gian hoặc nhãn (ai đổi người phụ trách, khi nào). */
export function AssignmentLogList({ entityId }: { entityId: string }) {
  const [entries, setEntries] = useState<AssignmentLogEntry[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    fetch(`/api/master-data?view=assignment-log&entityId=${encodeURIComponent(entityId)}`, { cache: 'no-store' })
      .then(async res => {
        const body = await res.json().catch(() => null);
        if (!alive) return;
        if (!res.ok) setError(body?.error || 'Không tải được nhật ký phân công.');
        else setEntries(body?.entries || []);
      })
      .catch(() => alive && setError('Không tải được nhật ký phân công.'));
    return () => {
      alive = false;
    };
  }, [entityId]);

  return (
    <details className="text-2xs border border-line rounded-lg bg-surface">
      <summary className="px-2.5 py-1.5 cursor-pointer text-ink-2 font-medium flex items-center gap-1.5">
        <History className="w-3 h-3" aria-hidden />
        Nhật ký phân công{entries ? ` (${entries.length})` : ''}
      </summary>
      <div className="px-2.5 pb-2 max-h-48 overflow-y-auto">
        {error ? (
          <div className="text-critical py-1">{error}</div>
        ) : !entries ? (
          <div className="text-ink-3 py-1">Đang tải…</div>
        ) : entries.length === 0 ? (
          <div className="text-ink-3 py-1">Chưa có thay đổi nào được ghi lại.</div>
        ) : (
          <ul className="divide-y divide-line">
            {entries.map((e, i) => (
              <li key={`${e.at}-${e.field}-${i}`} className="py-1.5">
                <div className="text-ink">
                  <span className="font-medium">{FIELD_LABEL[e.field] || e.field}</span>: {e.from || '—'} → {e.to || '—'}
                </div>
                <div className="text-ink-3">
                  {new Date(e.at).toLocaleString('vi-VN')} · {e.actor}
                  {e.actorCode ? ` (${e.actorCode})` : ''}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
