'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowRight, Building, Users, Video, Mail, BarChart3, Layers } from 'lucide-react';
import { USERS } from '@/lib/mockData';
import { INITIAL_THIRD_PARTY_ACCOUNTS } from '@/lib/thirdPartyAccessData';
import { BrandLogo, Button, Input, Segmented, Status } from '../../components/ui';
import type { StatusTone } from '../../components/ui';
import { sanitizeReturnTo } from '@/lib/urlUtils';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Quản trị',
  MANAGER: 'Trưởng phòng B2C',
  GROWTH_MANAGER: 'Trưởng phòng Growth',
  MEDIA_MANAGER: 'Trưởng phòng Media',
  LEADER: 'Trưởng nhóm',
  MEMBER: 'Chuyên viên',
  BRAND_MEMBER: 'Brand PIC',
  CONTENT_MEMBER: 'Content',
  BOOKING_MEMBER: 'Booking B2C',
  GROWTH_MEMBER: 'Growth',
  MEDIA_MEMBER: 'Media',
  BRAND_PARTNER: 'Đối tác Brand',
  KOC_PARTNER: 'KOC / KOL',
  CTV_PARTNER: 'Cộng tác viên',
};

const ROLE_TONE: Record<string, StatusTone> = {
  ADMIN: 'critical',
  MANAGER: 'info',
  GROWTH_MANAGER: 'info',
  MEDIA_MANAGER: 'info',
  LEADER: 'info',
  BOOKING_MEMBER: 'positive',
  GROWTH_MEMBER: 'positive',
  MEDIA_MEMBER: 'info',
  CONTENT_MEMBER: 'warning',
  BRAND_PARTNER: 'info',
  KOC_PARTNER: 'warning',
  CTV_PARTNER: 'positive',
};

function LarkMark({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

function GoogleMark({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.26-2.09 3.67-5.17 3.67-9.15z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.26v3.15C3.25 21.37 7.34 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.26C.46 8.21 0 10.05 0 12s.46 3.79 1.26 5.39l4.01-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.25 2.63 1.26 6.61l4.01 3.15c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-dvh bg-canvas flex items-center justify-center">
      <span className="text-[13px] text-ink-3">Đang tải…</span>
    </div>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  const messageParam = searchParams.get('message');
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'));

  const [activePortalTab, setActivePortalTab] = useState<'INTERNAL' | 'GMAIL_PARTNER'>('INTERNAL');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('upbase_selected_user_id');
      if (savedId && USERS.some(u => u.id === savedId)) {
        return savedId;
      }
    }
    return USERS[0].id;
  });
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  const [staffIdentifierInput, setStaffIdentifierInput] = useState<string>('');

  // Partner Gmail state
  const [partnerEmail, setPartnerEmail] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(INITIAL_THIRD_PARTY_ACCOUNTS[0]?.id || '');
  const [partnerError, setPartnerError] = useState<string | null>(null);

  const handleLarkLogin = () => {
    setIsLoading(true);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('upbase_selected_user_id');
    }
    router.push(`/api/auth/lark/login?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const handleSandboxLogin = async (userId: string) => {
    setIsLoading(true);
    setSandboxError(null);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('upbase_selected_user_id', userId);
      }
      const res = await fetch('/api/auth/lark/sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        if (typeof window !== 'undefined') {
          window.location.assign(returnTo || '/');
        } else {
          router.push(returnTo);
        }
      } else {
        setSandboxError(data.error || 'Không đăng nhập được bằng vai trò đã chọn. Thử lại sau ít phút.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      setSandboxError('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
      setIsLoading(false);
    }
  };

  const handleDirectoryStaffLogin = async (identifierOverride?: string) => {
    const identifier = (identifierOverride ?? staffIdentifierInput).trim();
    if (!identifier) {
      setSandboxError('Vui lòng nhập Mã nhân viên (VD: HN222, HN862, HN782) hoặc Email công ty.');
      return;
    }
    setIsLoading(true);
    setSandboxError(null);
    try {
      let staffOverrides = {};
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('upbase_b2c_staff_access_overrides_v1');
          if (raw) staffOverrides = JSON.parse(raw);
        } catch {
          // ignore
        }
      }
      const res = await fetch('/api/auth/lark/sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffIdentifier: identifier, staffOverrides }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.user?.id && typeof window !== 'undefined') {
          localStorage.setItem('upbase_selected_user_id', data.user.id);
        }
        if (typeof window !== 'undefined') {
          window.location.assign(returnTo || '/');
        } else {
          router.push(returnTo);
        }
      } else {
        setSandboxError(data.error || 'Nhân sự không có quyền đăng nhập vào hệ thống.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      setSandboxError('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
      setIsLoading(false);
    }
  };

  // Xử lý đăng nhập đối tác
  const handlePartnerGmailLogin = async (accountIdOrEmail?: string) => {
    setIsLoading(true);
    setPartnerError(null);
    try {
      const payload: Record<string, string> = {};
      if (accountIdOrEmail && accountIdOrEmail.includes('@')) {
        payload.email = accountIdOrEmail;
      } else if (accountIdOrEmail) {
        payload.accountId = accountIdOrEmail;
      } else if (partnerEmail.trim()) {
        payload.email = partnerEmail.trim();
      } else {
        payload.accountId = selectedPartnerId;
      }

      const res = await fetch('/api/auth/partner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        if (data.user?.id && typeof window !== 'undefined') {
          localStorage.setItem('upbase_selected_user_id', data.user.id);
        }
        if (typeof window !== 'undefined') {
          window.location.assign(returnTo || '/');
        } else {
          router.push(returnTo);
        }
      } else {
        setPartnerError(data.error || 'Không xác thực được tài khoản Gmail. Vui lòng kiểm tra lại quyền.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      setPartnerError('Lỗi kết nối máy chủ. Vui lòng thử lại.');
      setIsLoading(false);
    }
  };

  const larkError =
    errorParam === 'lark_not_configured'
      ? 'Đăng nhập Lark chưa được cấu hình. Bạn có thể truy cập trực tiếp bằng các vai trò bên dưới.'
      : errorParam
      ? messageParam || 'Lark chưa xác thực được tài khoản của bạn. Thử đăng nhập lại hoặc dùng truy cập nhanh bên dưới.'
      : null;

  return (
    <div className="min-h-dvh bg-canvas text-ink lg:grid lg:grid-cols-12">
      {/* Cột trái: Giới thiệu hệ sinh thái B2C & Thống kê vận hành */}
      <aside className="hidden lg:flex lg:col-span-5 flex-col justify-between p-10 bg-sunken/60 border-r border-line">
        <div className="space-y-8">
          <BrandLogo height={28} />

          <div className="space-y-3 pt-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-soft text-accent text-2xs font-medium border border-accent/20">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" aria-hidden="true" />
              <span>Khối Vận hành Marketing B2C</span>
            </div>
            <h2 className="text-2xl font-semibold text-ink tracking-tight leading-snug">
              Nền tảng Quản trị & Điều phối Vận hành Đa sàn
            </h2>
            <p className="text-sm text-ink-2 leading-relaxed">
              Hệ thống quản lý kế hoạch tháng, booking KOC và kiểm soát ngân sách PnL tập trung cho toàn bộ các gian hàng B2C.
            </p>
          </div>

          <div className="space-y-3.5 pt-2">
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-surface border border-line">
              <div className="p-2 rounded-lg bg-accent-soft text-accent shrink-0">
                <Building className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-ink">Quản lý 69 Gian hàng B2C</div>
                <div className="text-2xs text-ink-3 mt-0.5 leading-relaxed">
                  Kiểm soát định mức ngân sách chiến dịch trên TikTok Shop, Shopee và Lazada.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-surface border border-line">
              <div className="p-2 rounded-lg bg-accent-soft text-accent shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-ink">Đối soát Kế hoạch & Hạn mức Net</div>
                <div className="text-2xs text-ink-3 mt-0.5 leading-relaxed">
                  Tách bạch chi phí Gross và Net, phân bổ chỉ tiêu Leader và chuyên viên phụ trách.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-surface border border-line">
              <div className="p-2 rounded-lg bg-accent-soft text-accent shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-ink">Báo cáo Ads & Đo lường Video</div>
                <div className="text-2xs text-ink-3 mt-0.5 leading-relaxed">
                  Theo dõi tiến độ Air Video, doanh thu affiliate và hiệu quả chiến dịch thời gian thực.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-line flex items-center justify-between text-2xs text-ink-3">
          <span>Hệ thống Upbase Ops 2026</span>
          <span className="flex items-center gap-1.5 text-positive font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-positive" aria-hidden="true" />
            Vận hành ổn định
          </span>
        </div>
      </aside>

      {/* Cột phải: Form đăng nhập */}
      <main className="lg:col-span-7 flex flex-col justify-between items-center px-3 py-5 sm:px-8 sm:py-8">
        <div className="w-full lg:hidden pb-4 sm:pb-6 flex justify-center">
          <BrandLogo height={26} />
        </div>

        <div className="w-full max-w-[480px] my-auto bg-surface border border-line rounded-2xl p-4 sm:p-8 shadow-2xs space-y-4 sm:space-y-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Đăng nhập</h1>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Segmented
              value={activePortalTab}
              onChange={setActivePortalTab}
              items={[
                { key: 'INTERNAL', label: 'Nội bộ Upbase' },
                { key: 'GMAIL_PARTNER', label: 'Đối tác' },
              ]}
            />
          </div>

          {activePortalTab === 'INTERNAL' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {larkError && (
                <div role="alert" className="flex items-start gap-2.5 p-3 rounded-md bg-critical-soft text-critical text-[13px]">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{larkError}</span>
                </div>
              )}

              <Button
                variant="primary"
                onClick={handleLarkLogin}
                disabled={isLoading}
                className="w-full h-10"
              >
                <LarkMark className="w-4 h-4" />
                <span>Đăng nhập bằng Lark (UpBase SSO)</span>
              </Button>

              <section className="space-y-2.5" aria-labelledby="sandbox-title">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 id="sandbox-title" className="text-[13.5px] font-medium">Chọn vai trò đăng nhập</h2>
                  </div>
                </div>

                <div className="border border-line rounded-xl bg-surface divide-y divide-line overflow-hidden max-h-72 sm:max-h-80 overflow-y-auto overscroll-contain" role="radiogroup" aria-label="Chọn vai trò">
                  {USERS.map((u) => {
                    const isSelected = selectedUser === u.id;
                    const customBadge =
                      u.id === 'contract-demo-legal'
                        ? { label: 'Pháp chế', tone: 'warning' as StatusTone }
                        : u.id === 'contract-demo-finance'
                          ? { label: 'Kế toán', tone: 'info' as StatusTone }
                          : u.id === 'contract-demo-sign'
                            ? { label: 'Điều phối ký', tone: 'positive' as StatusTone }
                            : null;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setSelectedUser(u.id)}
                        onDoubleClick={() => handleSandboxLogin(u.id)}
                        className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 sm:gap-3 transition-colors ${isSelected ? 'bg-sunken' : 'hover:bg-canvas'}`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center ${isSelected ? 'border-accent' : 'border-line-strong'}`}
                          aria-hidden="true"
                        >
                          {isSelected && <span className="w-2 h-2 rounded-full bg-accent" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-medium truncate">{u.name}</span>
                          <span className="block text-2xs text-ink-3 truncate">{u.roleTitle}</span>
                        </span>
                        <Status tone={customBadge ? customBadge.tone : (ROLE_TONE[u.role] ?? 'neutral')} className="hidden xs:inline-flex sm:inline-flex shrink-0">
                          {customBadge ? customBadge.label : (ROLE_LABEL[u.role] ?? u.role)}
                        </Status>
                      </button>
                    );
                  })}
                </div>

                {sandboxError && (
                  <div role="alert" className="flex items-start gap-2 p-2.5 rounded-lg bg-critical-soft text-critical text-xs leading-relaxed">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{sandboxError}</span>
                  </div>
                )}

                <Button
                  variant="primary"
                  onClick={() => handleSandboxLogin(selectedUser)}
                  disabled={isLoading}
                  icon={ArrowRight}
                  className="w-full h-10"
                >
                  Đăng nhập với vai trò đã chọn
                </Button>
              </section>

              {/* Kiểm tra cổng đăng nhập từ danh bạ 1.011 nhân sự */}
              <section className="p-3 sm:p-3.5 rounded-xl border border-line bg-surface space-y-2.5">
                <div>
                  <h3 className="text-xs font-semibold text-ink">
                    Kiểm tra đăng nhập theo Mã NV / Email (Danh bạ 1.011 nhân sự)
                  </h3>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="text"
                    value={staffIdentifierInput}
                    onChange={(e) => setStaffIdentifierInput(e.target.value)}
                    placeholder="VD: HN222 (Growth), HN862 (Media), HN782 (Bị chặn)..."
                    className="flex-1 text-xs"
                  />
                  <Button
                    size="md"
                    variant="secondary"
                    disabled={isLoading}
                    onClick={() => handleDirectoryStaffLogin()}
                    className="w-full sm:w-auto"
                  >
                    Đăng nhập
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser('user-hai-long');
                      handleSandboxLogin('user-hai-long');
                    }}
                    className="text-2xs px-2.5 py-1.5 rounded bg-accent-soft text-accent border border-accent/25 font-medium"
                  >
                    HN220 · Hoàng Hải Long (Nhân viên B2C)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser('user-thanh-hai');
                      handleSandboxLogin('user-thanh-hai');
                    }}
                    className="text-2xs px-2.5 py-1.5 rounded bg-accent-soft text-accent border border-accent/25 font-medium"
                  >
                    HN241 · Lê Thanh Hải (Nhân viên B2C)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStaffIdentifierInput('HN028');
                      handleDirectoryStaffLogin('HN028');
                    }}
                    className="text-2xs px-2.5 py-1.5 rounded bg-sunken hover:bg-canvas border border-line text-ink-2"
                  >
                    HN028 · Nguyễn Thị Thu Thủy (TP Growth)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStaffIdentifierInput('HN862');
                      handleDirectoryStaffLogin('HN862');
                    }}
                    className="text-2xs px-2.5 py-1.5 rounded bg-sunken hover:bg-canvas border border-line text-ink-2"
                  >
                    HN862 · Đức Quảng (TP Media)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStaffIdentifierInput('HN782');
                      handleDirectoryStaffLogin('HN782');
                    }}
                    className="text-2xs px-2.5 py-1.5 rounded bg-critical-soft text-critical border border-line font-medium"
                  >
                    Thử HN782 · Phòng Livestream (Chặn Login)
                  </button>
                </div>
              </section>

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={handleLarkLogin}
                  disabled={isLoading}
                  className="text-xs text-ink-3 hover:text-ink transition-colors inline-flex items-center gap-1.5 underline decoration-line-strong"
                >
                  <LarkMark className="w-3 h-3" />
                  <span>Hoặc đăng nhập bằng Lark</span>
                </button>
              </div>
            </div>
          )}

          {activePortalTab === 'GMAIL_PARTNER' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-accent-soft border border-line rounded-xl p-3.5 text-xs text-ink space-y-1">
                <div className="font-semibold text-accent">
                  Cổng đăng nhập đối tác
                </div>
                <p className="text-2xs text-ink-2 leading-relaxed">
                  Đăng nhập bằng tài khoản Gmail đã được Upbase cấp quyền. Hệ thống sẽ chuyển bạn vào đúng Cổng đối tác Brand, KOC hoặc CTV.
                </p>
              </div>

              {partnerError && (
                <div role="alert" className="flex items-start gap-2.5 p-3 rounded-md bg-critical-soft text-critical text-[13px]">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{partnerError}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-ink block">
                  Chọn tài khoản đối tác được cấp quyền:
                </label>
                <div className="border border-line rounded-xl bg-surface divide-y divide-line overflow-hidden max-h-56 overflow-y-auto">
                  {INITIAL_THIRD_PARTY_ACCOUNTS.map((acc) => {
                    const isSelected = selectedPartnerId === acc.id;
                    const isBrand = acc.partnerType === 'BRAND';
                    const isKoc = acc.partnerType === 'KOC';
                    const isCtv = acc.partnerType === 'CTV';

                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => {
                          setSelectedPartnerId(acc.id);
                          setPartnerEmail(acc.gmail);
                        }}
                        className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                          isSelected ? 'bg-accent-soft text-ink' : 'hover:bg-sunken text-ink'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-xs flex items-center gap-1.5 truncate">
                            {isBrand && <Building className="w-3.5 h-3.5 text-accent shrink-0" />}
                            {isKoc && <Users className="w-3.5 h-3.5 text-ink-2 shrink-0" />}
                            {isCtv && <Video className="w-3.5 h-3.5 text-positive shrink-0" />}
                            <span className="truncate">{acc.displayName}</span>
                          </div>
                          <div className="text-2xs text-ink-3 font-code truncate">{acc.gmail}</div>
                        </div>

                        <Status tone={isBrand ? 'info' : isKoc ? 'warning' : 'positive'}>
                          {acc.partnerType}
                        </Status>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-2xs font-medium text-ink-3 block">Hoặc nhập địa chỉ Gmail khác</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    type="email"
                    value={partnerEmail}
                    onChange={(e) => {
                      setPartnerEmail(e.target.value);
                      setSelectedPartnerId('');
                    }}
                    placeholder="brand.partner@gmail.com"
                    className="pl-9"
                  />
                </div>
              </div>

              <Button
                variant="secondary"
                onClick={() => handlePartnerGmailLogin(partnerEmail || selectedPartnerId)}
                disabled={isLoading}
                className="w-full h-10"
              >
                <GoogleMark className="w-4 h-4" />
                <span>{isLoading ? 'Đang xác thực Gmail…' : 'Đăng nhập bằng Google'}</span>
              </Button>
            </div>
          )}
        </div>
        <footer className="pt-6 pb-2 text-center text-2xs text-ink-3">
          © 2026 Upbase · Khối Marketing B2C · Cổng đăng nhập hệ thống
        </footer>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
