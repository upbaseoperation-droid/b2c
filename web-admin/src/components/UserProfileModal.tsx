'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Button,
  Field,
  Input,
  Select,
  Avatar,
  Status,
} from './ui';
import {
  User,
  Shield,
  Building2,
  Mail,
  Phone,
  Briefcase,
  Key,
  LayoutDashboard,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { UserProfile, TabKey } from '../lib/types';
import { USERS } from '../lib/mockData';
import { getAllowedTabsForRole } from '../lib/rbacData';
import { TAB_LABELS } from '../lib/navGroups';

export interface UserProfileModalProps {
  open: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSaveUser: (updated: UserProfile) => void;
  onSwitchUser?: (user: UserProfile) => void;
  onLogout?: () => void;
  onNotify?: (message: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

type ProfileSubTab = 'info' | 'internal_accounts' | 'preferences' | 'security';

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  open,
  onClose,
  currentUser,
  onSaveUser,
  onSwitchUser,
  onNotify,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<ProfileSubTab>('info');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [defaultLanding, setDefaultLanding] = useState<TabKey>(
    currentUser.customLandingTab || 'cockpit'
  );

  // Trạng thái đổi mật khẩu (nếu dùng tài khoản nội bộ không qua SSO)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Nạp dữ liệu khi mở modal
  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setPhone(currentUser.phone || '');
        const savedLanding = typeof window !== 'undefined'
          ? (localStorage.getItem(`upbase_user_landing_${currentUser.id}`) as TabKey | null)
          : null;
        setDefaultLanding(savedLanding || currentUser.customLandingTab || 'cockpit');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError('');
        setPasswordSuccess(false);
        setActiveSubTab('info');
      });
    }
  }, [open, currentUser]);

  const allowedTabs = useMemo(() => {
    return getAllowedTabsForRole(currentUser.role);
  }, [currentUser.role]);

  const landingOptions = useMemo(() => {
    return allowedTabs.map((key) => ({
      value: key,
      label: TAB_LABELS[key] || key,
    }));
  }, [allowedTabs]);

  const handleSavePreferences = () => {
    const updated: UserProfile = {
      ...currentUser,
      phone: phone.trim(),
      customLandingTab: defaultLanding,
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`upbase_user_landing_${currentUser.id}`, defaultLanding);
        localStorage.setItem(`upbase_user_phone_${currentUser.id}`, phone.trim());
      } catch {
        // bỏ qua lỗi storage
      }
    }

    onSaveUser(updated);
    onNotify?.('Đã lưu thiết lập cá nhân thành công', 'success');
    onClose();
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError('Vui lòng nhập mật khẩu hiện tại');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có tối thiểu 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp');
      return;
    }

    setPasswordSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onNotify?.('Đã cập nhật mật khẩu thành công', 'success');
  };

  const isLarkLogin =
    currentUser.loginProvider === 'LARK' &&
    Boolean(currentUser.larkOpenId) &&
    !String(currentUser.larkOpenId).startsWith('ou_sandbox_') &&
    !String(currentUser.larkOpenId).startsWith('ou_staff_');
  const internalUsers = useMemo(
    () => USERS.filter((u) => !u.partnerType && !u.role.endsWith('_PARTNER') && u.canLogin !== false),
    []
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Hồ sơ & Thiết lập cá nhân"
      size="lg"
      footer={
        activeSubTab === 'preferences' ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              Đóng
            </Button>
            <Button variant="primary" onClick={handleSavePreferences}>
              Lưu thay đổi
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
        )
      }
    >
      <div className="space-y-4">
        {/* Khối thẻ định danh nhân sự */}
        <div className="p-4 rounded-xl bg-sunken border border-line flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Avatar
            name={currentUser.name}
            src={currentUser.larkAvatarUrl}
            size={52}
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm sm:text-base font-semibold text-ink">{currentUser.name}</span>
              {currentUser.staffCode && (
                <span className="px-2 py-0.5 rounded text-2xs font-mono font-medium bg-canvas border border-line text-ink-2">
                  {currentUser.staffCode}
                </span>
              )}
              <Status tone={currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER' || currentUser.role === 'LEADER' ? 'info' : 'neutral'}>
                {currentUser.roleTitle}
              </Status>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-ink-3">
              <span className="inline-flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{currentUser.email}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span>{currentUser.departmentName || 'Phòng Marketing B2C'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Thanh chuyển đổi tiểu mục */}
        <div className="flex border-b border-line gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('info')}
            className={`pb-2 px-1 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeSubTab === 'info'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            Thông tin & Phân công
          </button>
          {onSwitchUser && (
            <button
              type="button"
              onClick={() => setActiveSubTab('internal_accounts')}
              className={`pb-2 px-1 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeSubTab === 'internal_accounts'
                  ? 'border-accent text-accent font-semibold'
                  : 'border-transparent text-ink-3 hover:text-ink'
              }`}
            >
              Tài khoản nội bộ ({internalUsers.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveSubTab('preferences')}
            className={`pb-2 px-1 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeSubTab === 'preferences'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            Thiết lập cá nhân
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('security')}
            className={`pb-2 px-1 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeSubTab === 'security'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            Bảo mật & Đăng nhập
          </button>
        </div>

        {/* Nội dung 1: Thông tin & Phân công */}
        {activeSubTab === 'info' && (
          <div className="space-y-3 pt-1">
            <div className="p-4 rounded-lg border border-line bg-canvas space-y-3">
              <span className="text-2xs font-semibold text-ink-3 block">
                Phân công & Phê duyệt
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-ink-3 block mb-1">Người quản lý duyệt trực tiếp:</span>
                  <span className="font-medium text-ink">
                    {currentUser.managerName || 'Đặng Thị Yến Nhi (Lead B2C)'}
                  </span>
                </div>

                <div>
                  <span className="text-ink-3 block mb-1">Vai trò hệ thống:</span>
                  <span className="font-medium text-ink font-mono text-2xs">
                    {currentUser.role}
                  </span>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-ink-3 block mb-1">Nhãn hàng phân công phụ trách:</span>
                  {currentUser.assignedBrands && currentUser.assignedBrands.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {currentUser.assignedBrands.map((brand) => (
                        <span
                          key={brand}
                          className="px-2 py-0.5 rounded text-2xs font-medium bg-accent-soft text-accent border border-accent/20"
                        >
                          {brand}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-ink-2 text-xs">Toàn bộ gian hàng theo phân quyền vai trò</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nội dung 1b: Chuyển nhanh tài khoản nội bộ */}
        {activeSubTab === 'internal_accounts' && onSwitchUser && (
          <div className="space-y-3 pt-1">
            <div className="text-2xs text-ink-2">
              Chọn tài khoản nhân sự nội bộ để đăng nhập và làm việc theo đúng phạm vi phân quyền:
            </div>
            <div className="border border-line rounded-xl bg-surface divide-y divide-line max-h-72 overflow-y-auto">
              {internalUsers.map((u) => {
                const isCurrent = u.id === currentUser.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      onSwitchUser(u);
                      onClose();
                    }}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isCurrent ? 'bg-accent-soft/60 text-ink' : 'hover:bg-sunken text-ink'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={u.name} size={28} />
                      <div className="min-w-0 leading-tight">
                        <div className="text-xs font-semibold text-ink truncate">
                          {u.name}
                          {u.staffCode ? <span className="ml-2 font-mono text-2xs text-ink-3">({u.staffCode})</span> : null}
                        </div>
                        <div className="text-2xs text-ink-3 truncate mt-0.5">{u.roleTitle} · {u.email}</div>
                      </div>
                    </div>
                    <Status tone={isCurrent ? 'positive' : 'neutral'}>
                      {isCurrent ? 'Đang dùng' : 'Đăng nhập'}
                    </Status>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Nội dung 2: Thiết lập cá nhân */}
        {activeSubTab === 'preferences' && (
          <div className="space-y-4 pt-1">
            <Field label="Số điện thoại liên hệ">
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Nhập số điện thoại cá nhân"
              />
            </Field>

            <Field label="Màn hình mặc định khi đăng nhập">
              <Select
                value={defaultLanding}
                onChange={(e) => setDefaultLanding(e.target.value as TabKey)}
              >
                {landingOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}

        {/* Nội dung 3: Bảo mật & Đăng nhập */}
        {activeSubTab === 'security' && (
          <div className="space-y-3 pt-1">
            {isLarkLogin ? (
              <div className="p-4 rounded-lg border border-line bg-sunken space-y-2">
                <div className="flex items-center gap-2 text-ink font-medium text-xs">
                  <Shield className="w-4 h-4 text-positive shrink-0" />
                  <span>Xác thực tập trung qua Lark SSO</span>
                </div>
                <div className="text-xs text-ink-2 space-y-1">
                  <div>Mã định danh Lark: <span className="font-mono text-ink">{currentUser.larkOpenId || 'Đã liên kết'}</span></div>
                  <div>Chính sách bảo mật, xác thực 2 lớp và mật khẩu được quản lý trực tiếp trên hệ thống Lark doanh nghiệp.</div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div className="p-4 rounded-lg border border-line bg-canvas space-y-3">
                  <span className="text-2xs font-semibold text-ink-3 block">
                    Đổi mật khẩu tài khoản
                  </span>

                  {passwordError && (
                    <div className="p-2 rounded bg-critical-soft text-critical text-xs border border-critical/20">
                      {passwordError}
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="p-2 rounded bg-positive-soft text-positive text-xs border border-positive/20 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Đã đổi mật khẩu thành công</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Field label="Mật khẩu hiện tại">
                      <Input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Nhập mật khẩu hiện tại"
                      />
                    </Field>

                    <Field label="Mật khẩu mới">
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Tối thiểu 6 ký tự"
                      />
                    </Field>

                    <Field label="Xác nhận mật khẩu mới">
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới"
                      />
                    </Field>

                    <div className="pt-2 flex justify-end">
                      <Button variant="primary" type="submit">
                        Cập nhật mật khẩu
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
