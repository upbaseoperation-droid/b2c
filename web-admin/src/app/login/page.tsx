'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowRight, Building, Users, Video, KeyRound, Check, Mail, Sparkles } from 'lucide-react';
import { USERS } from '@/lib/mockData';
import { INITIAL_THIRD_PARTY_ACCOUNTS } from '@/lib/thirdPartyAccessData';
import { BrandLogo } from '@/components/ui';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Quản trị',
  MANAGER: 'Trưởng phòng',
  BRAND_MEMBER: 'Brand PIC',
  CONTENT_MEMBER: 'Content',
  BOOKING_MEMBER: 'Booking',
  BRAND_PARTNER: 'Đối tác Brand (Gmail)',
  KOC_PARTNER: 'KOC / KOL (Gmail)',
  CTV_PARTNER: 'Cộng tác viên (Gmail)',
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
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <span className="text-[13px] text-ink-3">Đang tải…</span>
    </div>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  const messageParam = searchParams.get('message');
  const returnTo = searchParams.get('returnTo') || '/';

  const [activePortalTab, setActivePortalTab] = useState<'INTERNAL' | 'GMAIL_PARTNER'>('INTERNAL');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>(USERS[0].id);
  const [sandboxError, setSandboxError] = useState<string | null>(null);

  // Partner Gmail state
  const [partnerEmail, setPartnerEmail] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(INITIAL_THIRD_PARTY_ACCOUNTS[0]?.id || '');
  const [partnerError, setPartnerError] = useState<string | null>(null);

  // Đã đăng nhập thì chuyển thẳng vào app
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.authenticated) router.replace(returnTo);
      } catch (err) {
        console.error('Error checking auth:', err);
      }
    }
    checkAuth();
  }, [router, returnTo]);

  const handleLarkLogin = () => {
    setIsLoading(true);
    window.location.href = `/api/auth/lark/login?returnTo=${encodeURIComponent(returnTo)}`;
  };

  const handleSandboxLogin = async (userId: string) => {
    setIsLoading(true);
    setSandboxError(null);
    try {
      const res = await fetch('/api/auth/lark/sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(returnTo);
      } else {
        setSandboxError(data.error || 'Không đăng nhập được bằng tài khoản thử. Thử lại sau ít phút.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      setSandboxError('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
      setIsLoading(false);
    }
  };

  // Xử lý đăng nhập Gmail bên thứ 3 (Brand / KOC / CTV)
  const handlePartnerGmailLogin = async (accountIdOrEmail?: string) => {
    setIsLoading(true);
    setPartnerError(null);
    try {
      const payload: any = {};
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
        router.push(returnTo);
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
      ? 'Đăng nhập Lark chưa được cấu hình (thiếu LARK_APP_ID, LARK_APP_SECRET). Tạm thời dùng tài khoản thử bên dưới.'
      : errorParam
      ? messageParam || 'Lark chưa xác thực được tài khoản của bạn. Thử đăng nhập lại.'
      : null;

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px] space-y-6">
          <BrandLogo height={26} />

          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">Hệ Thống Đăng Nhập</h1>
            <p className="text-[13.5px] text-ink-2">
              Dành cho nhân sự UpBase và các bên thứ 3 (Brand, KOC, CTV).
            </p>
          </div>

          {/* Portal Switcher Tabs */}
          <div className="flex rounded-xl bg-sunken p-1 border border-line text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActivePortalTab('INTERNAL')}
              className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                activePortalTab === 'INTERNAL'
                  ? 'bg-surface text-ink shadow-xs'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              <LarkMark className="w-3.5 h-3.5" />
              <span>Nội Bộ UpBase (Lark)</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePortalTab('GMAIL_PARTNER')}
              className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                activePortalTab === 'GMAIL_PARTNER'
                  ? 'bg-surface text-purple-700 shadow-xs'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              <GoogleMark className="w-3.5 h-3.5" />
              <span>Đối Tác (Gmail SSO)</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: INTERNAL STAFF (LARK SSO & SANDBOX)                                */}
          {/* ========================================================================= */}
          {activePortalTab === 'INTERNAL' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {larkError && (
                <div role="alert" className="flex items-start gap-2.5 p-3 rounded-md bg-critical-soft text-critical text-[13px]">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{larkError}</span>
                </div>
              )}

              <button
                onClick={handleLarkLogin}
                disabled={isLoading}
                className="w-full h-11 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-medium flex items-center justify-center gap-2.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
              >
                <LarkMark />
                {isLoading ? 'Đang chuyển sang Lark…' : 'Đăng nhập bằng Lark SSO'}
              </button>

              <section className="space-y-3 pt-6 border-t border-line" aria-labelledby="sandbox-title">
                <div>
                  <h2 id="sandbox-title" className="text-[13.5px] font-medium">Tài khoản thử nhân sự</h2>
                  <p className="text-2xs text-ink-3 mt-0.5">Xem app với các vai trò nội bộ mẫu.</p>
                </div>

                <div className="border border-line rounded-xl bg-surface divide-y divide-line overflow-hidden" role="radiogroup" aria-label="Chọn tài khoản thử">
                  {USERS.slice(0, 4).map((u) => {
                    const isSelected = selectedUser === u.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setSelectedUser(u.id)}
                        className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${isSelected ? 'bg-sunken' : 'hover:bg-canvas'}`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center ${isSelected ? 'border-accent' : 'border-line-strong'}`}
                          aria-hidden="true"
                        >
                          {isSelected && <span className="w-2 h-2 rounded-full bg-accent" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.5px] font-medium truncate">{u.name}</span>
                          <span className="block text-2xs text-ink-3 truncate">{u.roleTitle}</span>
                        </span>
                        <span className="text-2xs text-ink-3 shrink-0">{ROLE_LABEL[u.role] ?? u.role}</span>
                      </button>
                    );
                  })}
                </div>

                {sandboxError && (
                  <p role="alert" className="text-[13px] text-critical">{sandboxError}</p>
                )}

                <button
                  type="button"
                  onClick={() => handleSandboxLogin(selectedUser)}
                  disabled={isLoading}
                  className="w-full h-[36px] px-3 rounded-xl border border-line-strong bg-surface hover:bg-sunken text-[13.5px] font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
                >
                  Vào bằng tài khoản thử
                  <ArrowRight className="w-4 h-4 text-ink-3" />
                </button>
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: THIRD-PARTY PARTNERS (BRAND, KOC, CTV VIA GMAIL SSO)               */}
          {/* ========================================================================= */}
          {activePortalTab === 'GMAIL_PARTNER' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-purple-50/70 border border-purple-200/80 rounded-xl p-3.5 text-xs text-purple-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Cổng Đăng Nhập Phân Quyền Bên Thứ 3</span>
                </div>
                <p className="text-2xs text-purple-700 leading-relaxed">
                  Đăng nhập bằng tài khoản Gmail đã được UpBase cấp quyền. Hệ thống sẽ tự động chuyển bạn vào đúng không gian làm việc của mình (Brand Hub, KOC Hub hoặc CTV Hub).
                </p>
              </div>

              {partnerError && (
                <div role="alert" className="flex items-start gap-2.5 p-3 rounded-md bg-critical-soft text-critical text-[13px]">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{partnerError}</span>
                </div>
              )}

              {/* Quick Select Partner Whitelist */}
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
                          isSelected ? 'bg-purple-50/70 text-purple-900' : 'hover:bg-sunken text-ink'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-xs flex items-center gap-1.5 truncate">
                            {isBrand && <Building className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                            {isKoc && <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                            {isCtv && <Video className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                            <span className="truncate">{acc.displayName}</span>
                          </div>
                          <div className="text-2xs text-ink-3 font-mono truncate">{acc.gmail}</div>
                        </div>

                        <span className={`text-3xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                          isBrand ? 'bg-purple-100 text-purple-800 border-purple-200' :
                          isKoc ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}>
                          {acc.partnerType}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Or Type Custom Gmail */}
              <div className="space-y-1.5">
                <label className="text-2xs font-semibold text-ink-3">Hoặc gõ địa chỉ Gmail khác:</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={partnerEmail}
                    onChange={(e) => {
                      setPartnerEmail(e.target.value);
                      setSelectedPartnerId('');
                    }}
                    placeholder="ví dụ: brand.partner@gmail.com"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-line-strong bg-surface text-ink placeholder-ink-3 focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              {/* Google Login Submit Button */}
              <button
                type="button"
                onClick={() => handlePartnerGmailLogin(partnerEmail || selectedPartnerId)}
                disabled={isLoading}
                className="w-full h-11 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-xs text-sm font-semibold flex items-center justify-center gap-2.5 transition cursor-pointer disabled:opacity-60"
              >
                <GoogleMark className="w-4 h-4" />
                <span>{isLoading ? 'Đang xác thực Gmail…' : 'Đăng Nhập Bằng Google Gmail'}</span>
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="px-4 py-5 text-center text-2xs text-ink-3">© 2026 Upbase · Marketing B2C · Third-Party Multi-Tenant SSO</footer>
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
