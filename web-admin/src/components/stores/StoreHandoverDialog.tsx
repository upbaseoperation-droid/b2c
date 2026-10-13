'use client';

/**
 * Hộp thoại Lập Lệnh Bàn Giao Giữa Kỳ — theo chuẩn Design System.
 * Thay thế cho alert() và các style màu cũ.
 */

import React, { useState } from 'react';
import { UserCheck } from 'lucide-react';
import type { StorePortfolioItem } from '../../lib/types';
import { Button, Field, Input, Modal, Select, Textarea } from '../ui';
import { UPBASE_STAFF_MASTER } from '../../lib/importedMasterData';

export interface StoreHandoverDialogProps {
  open: boolean;
  onClose: () => void;
  store: StorePortfolioItem;
  onConfirmHandover: (updatedStore: StorePortfolioItem, logEntry: {
    fromPic: string;
    toPic: string;
    effectiveDate: string;
    reason: string;
  }) => void;
}

export function StoreHandoverDialog({
  open,
  onClose,
  store,
  onConfirmHandover
}: StoreHandoverDialogProps) {
  const currentPic = store.b2cOwnerName || (store.b2cOwners && store.b2cOwners[0]) || 'Lê Phương Thảo';
  const [newPic, setNewPic] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('Nghỉ phép / Chuyển nhóm');
  const [customReason, setCustomReason] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Extract staff list for B2C
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

    const finalReason = reason === 'Lý do khác' ? (customReason || 'Bàn giao chuyển tiếp') : reason;

    const updatedStore: StorePortfolioItem = {
      ...store,
      previousPic: currentPic,
      b2cOwnerName: newPic.trim(),
      primaryPic: newPic.trim(),
      assignedStaff: newPic.trim(),
      assignedMembers: [newPic.trim()],
      b2cOwners: [newPic.trim()],
      handoverEffectiveDate: effectiveDate,
      assignmentNotes: `Lệnh bàn giao ngày ${effectiveDate}: Từ ${currentPic} sang ${newPic.trim()} (${finalReason})`,
      updatedAt: new Date().toISOString()
    };

    onConfirmHandover(updatedStore, {
      fromPic: currentPic,
      toPic: newPic.trim(),
      effectiveDate,
      reason: finalReason
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Lập lệnh bàn giao giữa kỳ"
      description={`Gian hàng ${store.storeName} (${store.storeOperationId || store.id})`}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button variant="primary" icon={UserCheck} onClick={handleSubmit}>Ký duyệt bàn giao</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-2.5 rounded-md bg-critical-soft text-critical text-2xs font-medium">
            {errorMessage}
          </div>
        )}

        <div className="p-3 rounded-lg bg-sunken border border-line text-2xs text-ink-2 space-y-1">
          <span className="font-semibold text-ink">Quy chuẩn bàn giao Upbase B2C:</span>
          <p>
            Chuyên viên tiếp nhận sẽ nhận toàn bộ hạn mức Order Net chưa giải ngân, danh mục deal đang chạy và chịu trách nhiệm nghiệm thu hợp đồng kể từ ngày hiệu lực.
          </p>
        </div>

        <Field label="Chuyên viên hiện tại (Người bàn giao)">
          <Input value={currentPic} disabled readOnly />
        </Field>

        <Field label="Chuyên viên tiếp nhận *" hint="Chọn nhân sự thay thế chịu trách nhiệm booking">
          <Select
            value={newPic}
            onChange={(e) => setNewPic(e.target.value)}
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

        <Field label="Ngày bắt đầu có hiệu lực *" hint="Ngày chuyển giao quyền phê duyệt và quản lý ngân sách">
          <Input
            type="date"
            required
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
          />
        </Field>

        <Field label="Lý do bàn giao">
          <Select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full"
          >
            <option value="Nghỉ phép / Chuyển nhóm">Nghỉ phép / Chuyển nhóm</option>
            <option value="Cân bằng khối lượng việc">Cân bằng khối lượng việc giữa các PIC</option>
            <option value="Tối ưu năng lực theo ngành hàng">Tối ưu năng lực theo ngành hàng</option>
            <option value="Bàn giao dự phòng (Backup PIC)">Bàn giao dự phòng (Backup PIC)</option>
            <option value="Lý do khác">Lý do khác</option>
          </Select>
        </Field>

        {reason === 'Lý do khác' && (
          <Field label="Chi tiết lý do bàn giao">
            <Textarea
              rows={2}
              placeholder="Ghi rõ lý do bàn giao công việc..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
            />
          </Field>
        )}
      </form>
    </Modal>
  );
}
