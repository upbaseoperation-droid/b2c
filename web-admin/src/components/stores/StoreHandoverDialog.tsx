'use client';

import React, { useState, useMemo } from 'react';
import { Check, Search, UserCheck, Users, X } from 'lucide-react';
import {
  type StorePortfolioItem,
  resolveStoreStaffAssignment,
} from '../../lib/types';
import { Button, Field, Input, Modal, Select, Textarea } from '../ui';
import { getVietnamDateYmd } from '../../lib/format';
import { UPBASE_STAFF_MASTER } from '../../lib/importedMasterData';
import { B2C_28_STAFF_WORKLOAD_ROSTER } from '../views/TaskDelegationView';

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
  const currentAssignment = useMemo(
    () => resolveStoreStaffAssignment(store, 'Lê Phương Thảo'),
    [store]
  );

  const [primaryPic, setPrimaryPic] = useState<string>(currentAssignment.primaryPic);
  const [supportStaff, setSupportStaff] = useState<string[]>(currentAssignment.supportStaff);
  const [supportSearch, setSupportSearch] = useState('');
  const [leaderMode, setLeaderMode] = useState<string>(
    store.hasBookingLeader && store.bookingLeader ? store.bookingLeader : 'NONE'
  );
  const [effectiveDate, setEffectiveDate] = useState(() => getVietnamDateYmd());
  const [reason, setReason] = useState('Phân công nhân sự chính & hỗ trợ');
  const [customReason, setCustomReason] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Đồng bộ lại state khi đổi gian hàng mở hộp thoại
  const [syncedStoreId, setSyncedStoreId] = useState(store.id);
  if (store.id !== syncedStoreId) {
    setSyncedStoreId(store.id);
    setPrimaryPic(currentAssignment.primaryPic);
    setSupportStaff(currentAssignment.supportStaff);
    setLeaderMode(
      store.hasBookingLeader && store.bookingLeader ? store.bookingLeader : 'NONE'
    );
    setSupportSearch('');
    setErrorMessage('');
  }

  const allB2cStaffOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; roleLabel: string }>();
    B2C_28_STAFF_WORKLOAD_ROSTER.forEach(r => {
      map.set(r.name, {
        id: r.staffCode,
        name: r.name,
        roleLabel: `${r.roleGroup} (${r.level})`,
      });
    });
    UPBASE_STAFF_MASTER.forEach(s => {
      if (!map.has(s.name)) {
        map.set(s.name, {
          id: s.id,
          name: s.name,
          roleLabel: `${s.role} - ${s.team || s.department}`,
        });
      }
    });
    return Array.from(map.values());
  }, []);

  const filteredSupportOptions = useMemo(() => {
    const q = supportSearch.trim().toLowerCase();
    return allB2cStaffOptions.filter(s => {
      if (s.name.toLowerCase() === primaryPic.trim().toLowerCase()) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.roleLabel.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      );
    });
  }, [allB2cStaffOptions, primaryPic, supportSearch]);

  const handlePrimaryChange = (nextPrimary: string) => {
    setPrimaryPic(nextPrimary);
    setSupportStaff(prev =>
      prev.filter(n => n.toLowerCase() !== nextPrimary.trim().toLowerCase())
    );
  };

  const toggleSupportStaff = (name: string) => {
    setSupportStaff(prev => {
      const exists = prev.some(n => n.toLowerCase() === name.toLowerCase());
      if (exists) {
        return prev.filter(n => n.toLowerCase() !== name.toLowerCase());
      }
      return [...prev, name];
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanPrimary = primaryPic.trim();
    if (!cleanPrimary) {
      setErrorMessage('Vui lòng chọn nhân viên chính phụ trách gian hàng.');
      return;
    }

    const cleanSupport = supportStaff.filter(
      n => n.trim() && n.trim().toLowerCase() !== cleanPrimary.toLowerCase()
    );
    const allOwners = [cleanPrimary, ...cleanSupport];

    const finalReason =
      reason === 'Lý do khác' ? customReason || 'Cập nhật phân công gian hàng' : reason;
    const isDirectLead = leaderMode === 'NONE';
    const isPrimaryChanged =
      cleanPrimary.toLowerCase() !== currentAssignment.primaryPic.toLowerCase();

    const supportNote =
      cleanSupport.length > 0
        ? ` · Hỗ trợ: ${cleanSupport.join(', ')}`
        : ' · Không có nhân viên hỗ trợ';

    const updatedStore: StorePortfolioItem = {
      ...store,
      ...(isPrimaryChanged
        ? {
            previousPic: currentAssignment.primaryPic,
            handoverEffectiveDate: effectiveDate,
          }
        : {}),
      b2cOwnerName: cleanPrimary,
      primaryPic: cleanPrimary,
      assignedStaff: cleanPrimary,
      assignedPic: cleanPrimary,
      assignedMembers: allOwners,
      b2cOwners: allOwners,
      hasBookingLeader: !isDirectLead,
      bookingLeader: isDirectLead ? undefined : leaderMode,
      assignmentNotes: isPrimaryChanged
        ? `Bàn giao ngày ${effectiveDate}: Từ ${currentAssignment.primaryPic} sang ${cleanPrimary}${supportNote} (${finalReason})`
        : `Phân công ngày ${effectiveDate}: Chính ${cleanPrimary}${supportNote} (${finalReason})`,
      updatedAt: new Date().toISOString(),
    };

    onConfirmHandover(updatedStore, {
      fromPic: currentAssignment.primaryPic,
      toPic: cleanPrimary,
      effectiveDate,
      reason: `${finalReason}${supportNote}`,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Phân công & Bàn giao gian hàng — ${store.storeName}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="primary" icon={UserCheck} onClick={handleSubmit}>
            Lưu phân công
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nhân viên chính hiện tại">
            <Input value={currentAssignment.primaryPic} disabled readOnly />
          </Field>

          <Field label="Nhân viên chính (PIC chủ trì) *">
            <Select
              value={primaryPic}
              onChange={e => handlePrimaryChange(e.target.value)}
              className="w-full"
            >
              {allB2cStaffOptions.map(s => (
                <option key={s.id} value={s.name}>
                  {s.name} ({s.roleLabel})
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label={`Nhân viên hỗ trợ cùng thực thi (${supportStaff.length} nhân sự)`}>
          <div className="space-y-2 rounded-lg border border-line bg-canvas p-2.5">
            {supportStaff.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-line">
                {supportStaff.map(name => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent-soft text-accent border border-accent/20 text-xs font-medium"
                  >
                    <Users className="w-3 h-3 shrink-0" />
                    <span>{name}</span>
                    <button
                      type="button"
                      onClick={() => toggleSupportStaff(name)}
                      className="ml-0.5 hover:text-critical cursor-pointer"
                      title={`Gỡ ${name} khỏi danh sách hỗ trợ`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-2xs text-ink-3 pb-1.5 border-b border-line">
                Chưa chọn nhân viên hỗ trợ. Tích chọn một hoặc nhiều nhân sự bên dưới.
              </div>
            )}

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={supportSearch}
                onChange={e => setSupportSearch(e.target.value)}
                placeholder="Tìm tên nhân viên hỗ trợ..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-surface border border-line rounded-md text-ink placeholder-ink-3 focus:outline-none focus:border-focus"
              />
            </div>

            <div className="max-h-40 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
              {filteredSupportOptions.map(s => {
                const isSelected = supportStaff.some(
                  n => n.toLowerCase() === s.name.toLowerCase()
                );
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSupportStaff(s.name)}
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border text-left text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-accent-soft border-accent/30 text-accent font-semibold'
                        : 'bg-surface border-line text-ink hover:bg-sunken'
                    }`}
                  >
                    <div className="min-w-0 truncate">
                      <span className="block truncate">{s.name}</span>
                      <span className="block text-2xs text-ink-3 truncate font-normal">
                        {s.roleLabel}
                      </span>
                    </div>
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-accent border-accent text-white'
                          : 'border-line-strong bg-surface'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Cấp sơ duyệt (Trưởng nhóm)">
            <Select
              value={leaderMode}
              onChange={e => setLeaderMode(e.target.value)}
              className="w-full"
            >
              <option value="NONE">
                Không có trưởng nhóm — Trực tiếp Trưởng phòng (Đặng Thị Yến Nhi)
              </option>
              <option value="Nguyễn Thị Ngọc Tâm">
                Nguyễn Thị Ngọc Tâm (Trưởng nhóm)
              </option>
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
        </div>

        <Field label="Lý do phân công / bàn giao">
          <Select
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full"
          >
            <option value="Phân công nhân sự chính & hỗ trợ">
              Phân công nhân sự chính &amp; hỗ trợ
            </option>
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
          <Field label="Chi tiết lý do">
            <Textarea
              rows={2}
              placeholder="Ghi rõ lý do phân công hoặc bàn giao..."
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
            />
          </Field>
        )}
      </form>
    </Modal>
  );
}
