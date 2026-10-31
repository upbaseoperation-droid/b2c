'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { AssignmentIssue } from '../../../lib/assignmentNormalize';

const FIELD_LABEL: Record<string, string> = {
  b2cOwnerName: 'Booking chính',
  primaryPic: 'Booking chính',
  assignedStaff: 'Booking chính',
  assignedPic: 'Booking chính',
  b2cOwners: 'Danh sách Booking',
  assignedMembers: 'Booking cùng làm',
  bookingLeader: 'Leader Booking',
  contentPic: 'PIC Kênh tự sở hữu',
  backupOwnerName: 'Dự phòng',
  accountOwnerName: 'Account PIC',
  accountPic: 'Account PIC',
  planStrategyPic: 'PIC Plan / Strategy',
  keyVisualSisPic: 'PIC Key Visual / SIS',
  contentBrandMainPic: 'Content / Brand main',
  bookingPicLead: 'Trưởng nhóm Booking (nhãn)',
  brandPicName: 'Brand PIC',
};

function describe(i: AssignmentIssue): string {
  const field = FIELD_LABEL[i.field] || i.field;
  if (i.kind === 'BRAND_POSITION_CONFLICT') {
    const values = (i.values || []).map(v => `${v.value} (${v.stores.join(', ')})`).join(' · ');
    return `${field} của nhãn chưa đặt; các gian đang ghi khác nhau: ${values}. Chọn 1 người ở Thương hiệu › Sửa.`;
  }
  if (i.kind === 'AMBIGUOUS_NAME') {
    return `${field} "${i.name}" trùng tên ${i.candidates?.length || 2} người (${(i.candidates || []).join(', ')}). Mở form và chọn lại đúng người.`;
  }
  return `${field} "${i.name}" không có trong danh bạ nhân sự. Chọn lại từ danh sách.`;
}

/** Danh sách phân công cần người quản lý xử lý trước khi phân quyền chạy theo mã nhân sự. */
export function AssignmentIssuesPanel() {
  const [issues, setIssues] = useState<AssignmentIssue[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/master-data?view=assignment-issues', { cache: 'no-store' })
      .then(res => (res.ok ? res.json() : null))
      .then(body => alive && setIssues(body?.issues || []))
      .catch(() => alive && setIssues([]));
    return () => {
      alive = false;
    };
  }, []);

  if (!issues || issues.length === 0) return null;
  const conflicts = issues.filter(i => i.kind === 'BRAND_POSITION_CONFLICT').length;

  return (
    <details className="rounded-xl border border-warning/40 bg-warning-soft text-xs">
      <summary className="px-3 py-2 cursor-pointer flex items-center gap-2 text-ink font-medium">
        <AlertTriangle className="w-4 h-4 text-warning" aria-hidden />
        {issues.length} phân công cần xử lý
        {conflicts > 0 && <span className="text-ink-2 font-normal">· {conflicts} nhãn có PIC Plan / KV khác nhau giữa các gian</span>}
      </summary>
      <ul className="px-3 pb-3 space-y-2 max-h-72 overflow-y-auto">
        {issues.map((i, idx) => (
          <li key={`${i.entityId}-${i.field}-${i.name || ''}-${idx}`} className="text-ink-2">
            <span className="font-medium text-ink">{i.entityName}</span>: {describe(i)}
          </li>
        ))}
      </ul>
    </details>
  );
}
