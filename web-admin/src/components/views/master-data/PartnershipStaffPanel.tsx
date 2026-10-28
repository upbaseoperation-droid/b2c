'use client';

import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Panel, SectionHeader, Status } from '../../ui';
import { StaffSearchSelect } from './StaffSearchSelect';
import type { PartnershipStaffEntry } from '../../../lib/ctvDirectory';

/** Nhân sự Partnership quản lý danh bạ CTV chung mọi gian. Giám đốc / Admin đặt; chọn từ danh bạ để có mã nhân sự. */
export function PartnershipStaffPanel({
  staff,
  canManage,
  onSave,
}: {
  staff: PartnershipStaffEntry[];
  canManage: boolean;
  onSave?: (staff: PartnershipStaffEntry[]) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<PartnershipStaffEntry[] | null>(null);
  const [saving, setSaving] = useState(false);
  const rows = draft ?? staff;
  const editing = draft !== null;

  const save = async () => {
    if (!draft || !onSave) return;
    setSaving(true);
    const ok = await onSave(draft.filter(s => s.name.trim()));
    setSaving(false);
    if (ok) setDraft(null);
  };

  return (
    <Panel>
      <SectionHeader
        title="Nhân sự Partnership"
        description="Quản lý danh bạ CTV dùng chung mọi gian: thêm / sửa CTV, đơn giá chuẩn, hợp đồng khung, BBNT và ĐNTT. Người khác chỉ xem danh bạ."
        actions={
          canManage &&
          (editing ? (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setDraft(null)} disabled={saving}>
                Hủy
              </Button>
              <Button size="sm" variant="primary" onClick={save} disabled={saving}>
                {saving ? 'Đang lưu…' : 'Lưu'}
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setDraft(staff.map(s => ({ ...s })))}>
              Sửa
            </Button>
          ))
        }
      />
      {!editing ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {rows.length === 0 ? (
            <span className="text-xs text-ink-3">Chưa đặt nhân sự Partnership — chỉ Giám đốc / Admin sửa được danh bạ CTV.</span>
          ) : (
            rows.map(s => (
              <Status key={`${s.staffCode || ''}-${s.name}`} tone={s.staffCode ? 'info' : 'warning'}>
                {s.name}
                {s.staffCode ? ` · ${s.staffCode}` : ' · chưa có mã nhân sự'}
              </Status>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-2 pt-1">
          {rows.map((s, i) => (
            <div key={i} className="flex items-end gap-2">
              <StaffSearchSelect
                className="flex-1"
                label={`Nhân sự ${i + 1}`}
                value={s.name}
                selectedCode={s.staffCode}
                onChange={(name, code) => setDraft(rows.map((r, j) => (j === i ? { name, staffCode: code } : r)))}
              />
              <Button
                size="sm"
                variant="ghost"
                icon={Trash2}
                aria-label="Bỏ nhân sự"
                onClick={() => setDraft(rows.filter((_, j) => j !== i))}
              />
            </div>
          ))}
          <Button size="sm" variant="secondary" icon={Plus} onClick={() => setDraft([...rows, { name: '' }])}>
            Thêm người
          </Button>
        </div>
      )}
    </Panel>
  );
}
