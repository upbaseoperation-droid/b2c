'use client';

import React, { useState } from 'react';
import { UserCheck } from 'lucide-react';
import type { StorePortfolioItem } from '../../lib/types';
import { Button, Field, Input, Modal, Select, Textarea } from '../ui';
import { getVietnamDateYmd } from '../../lib/format';
import { UPBASE_STAFF_MASTER } from '../../lib/importedMasterData';

export interface StoreHandoverDialogProps {
  open: boolean;
  onClose: () => void;
  store: StorePortfolioItem;
  onConfirmHandover: (
    updatedStore: StorePortfolioItem,
    logEntry: {
      fromPic: string;
      toPic: string;
      effectiveDate: string;
      reason: string;
    }
  ) => void;
}

export function StoreHandoverDialog({
  open,
  onClose,
  store,
  onConfirmHandover,
}: StoreHandoverDialogProps) {
  const currentPic =
    store.b2cOwnerName ||
    store.primaryPic ||
    (store.b2cOwners && store.b2cOwners[0]) ||
    'Lê Phương Thảo';
  const [newPic, setNewPic] = useState('');
  const [leaderMode, setLeaderMode] = useState<string>(
    store.hasBookingLeader && store.bookingLeader ? store.bookingLeader : 'NONE'
  );
  const [effectiveDate, setEffectiveDate] = useState(() =>
    getVietnamDateYmd()
  );
  const [reason, setReason] = useState('Nghỉ phép / Chuyển nhóm');
  const [customReason, setCustomReason] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const staffList = React.useMemo(() => {
    return UPBASE_STAFF_MASTER.filter(s => s.name !== currentPic);
  }, [currentPic]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!newPic || newPic.trim() === '') {
      setErrorMessage('Vui lòng chọn chuyên viên tiếp nhận bàn giao.');
      return;
    }
    if (newPic === currentPic) {
      setErrorMessage('Chuyên viên tiếp nhận phải khác chuyên viên hiện tại.');
      return;
    }

    const finalReason =
      reason === 'Lý do khác' ? customReason || 'Bàn giao chuyển tiếp' : reason;
    const isDirectLead = leaderMode === 'NONE';

    const updatedStore: StorePortfolioItem = {
      ...store,
      previousPic: currentPic,
      b2cOwnerName: newPic.trim(),
      primaryPic: newPic.trim(),
      assignedStaff: newPic.trim(),
      assignedMembers: [newPic.trim()],
      b2cOwners: [newPic.trim()],
      hasBookingLeader: !isDirectLead,
      bookingLeader: isDirectLead ? undefined : leaderMode,
      handoverEffectiveDate: effectiveDate,
      assignmentNotes: `Lệnh bàn giao ngày ${effectiveDate}: Từ ${currentPic} sang ${newPic.trim()} (${finalReason})`,
      updatedAt: new Date().toISOString(),
    };

    onConfirmHandover(updatedStore, {
      fromPic: currentPic,
      toPic: newPic.trim(),
      effectiveDate,
      reason: finalReason,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Bàn giao gian hàng — ${store.storeName}`}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="primary" icon={UserCheck} onClick={handleSubmit}>
            Xác nhận bàn giao
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-2.5 rounded-md bg-critical-soft text-critical text-2xs font-medium">
            {errorMessage}
          </div>
        )}

        <Field label="Chuyên viên hiện tại (Người bàn giao)">
          <Input value={currentPic} disabled readOnly />
        </Field>

        <Field label="Chuyên viên tiếp nhận *">
          <Select
            value={newPic}
            onChange={e => setNewPic(e.target.value)}
            className="w-full"
          >
            <option value="">-- Chọn chuyên viên tiếp nhận --</option>
            {staffList.map(s => (
              <option key={s.id} value={s.name}>
                {s.name} ({s.role} - {s.team || s.department})
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Cấp sơ duyệt (Trưởng nhóm)">
          <Select
            value={leaderMode}
            onChange={e => setLeaderMode(e.target.value)}
            className="w-full"
          >
            <option value="NONE">Không có trưởng nhóm — Trực tiếp Trưởng phòng (Đặng Thị Yến Nhi)</option>
            <option value="Nguyễn Thị Ngọc Tâm">Nguyễn Thị Ngọc Tâm (Trưởng nhóm)</option>
          </Select>
        </Field>

        <Field label="Ngày bắt đầu có hiệu lực *">
          <Input
            type="date"
            required
            value={effectiveDate}
            onChange={e => setEffectiveDate(e.target.value)}
          />
        </Field>

        <Field label="Lý do bàn giao">
          <Select
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full"
          >
            <option value="Nghỉ phép / Chuyển nhóm">Nghỉ phép / Chuyển nhóm</option>
            <option value="Cân bằng khối lượng việc">
              Cân bằng khối lượng việc giữa các PIC
            </option>
            <option value="Tối ưu năng lực theo ngành hàng">
              Tối ưu năng lực theo ngành hàng
            </option>
            <option value="Bàn giao dự phòng (Backup PIC)">
              Bàn giao dự phòng (Backup PIC)
            </option>
            <option value="Lý do khác">Lý do khác</option>
          </Select>
        </Field>

        {reason === 'Lý do khác' && (
          <Field label="Chi tiết lý do bàn giao">
            <Textarea
              rows={2}
              placeholder="Ghi rõ lý do bàn giao công việc..."
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
            />
          </Field>
        )}
      </form>
    </Modal>
  );
}
