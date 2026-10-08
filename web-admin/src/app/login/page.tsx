'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { USERS } from '@/lib/mockData';
import { BrandLogo } from '@/components/ui';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Quản trị',
  MANAGER: 'Trưởng phòng',
  BRAND_MEMBER: 'Brand',
  CONTENT_MEMBER: 'Content',
  BOOKING_MEMBER: 'Booking',
};

function LarkMark({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
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

  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>(USERS[0].id);
  const [sandboxError, setSandboxError] = useState<string | null>(null);

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

  const larkError =
    errorParam === 'lark_not_configured'
      ? 'Đăng nhập Lark chưa được cấu hình (thiếu LARK_APP_ID, LARK_APP_SECRET). Tạm thời dùng tài khoản thử bên dưới.'
      : errorParam
      ? messageParam || 'Lark chưa xác thực được tài khoản của bạn. Thử đăng nhập lại.'
      : null;

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[380px] space-y-8">
          <BrandLogo height={26} />

          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">Đăng nhập</h1>
            <p className="text-[13.5px] text-ink-2">Dùng tài khoản Lark của Upbase. Quyền truy cập được cấp theo vai trò của bạn.</p>
          </div>

          {larkError && (
            <div role="alert" className="flex items-start gap-2.5 p-3 rounded-md bg-critical-soft text-critical text-[13px]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{larkError}</span>
            </div>
          )}

          <button
            onClick={handleLarkLogin}
            disabled={isLoading}
            className="w-full h-11 px-4 rounded-md bg-primary hover:bg-primary-hover text-white text-sm font-medium flex items-center justify-center gap-2.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <LarkMark />
            {isLoading ? 'Đang chuyển sang Lark…' : 'Đăng nhập bằng Lark'}
          </button>

          <section className="space-y-3 pt-6 border-t border-line" aria-labelledby="sandbox-title">
            <div>
              <h2 id="sandbox-title" className="text-[13.5px] font-medium">Tài khoản thử</h2>
              <p className="text-2xs text-ink-3 mt-0.5">Xem app với vai trò khác, dữ liệu mẫu.</p>
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
              className="w-full h-[34px] px-3 rounded-md border border-line-strong bg-surface hover:bg-sunken text-[13.5px] font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
            >
              Vào bằng tài khoản thử
              <ArrowRight className="w-4 h-4 text-ink-3" />
            </button>
          </section>
        </div>
      </main>

      <footer className="px-4 py-5 text-center text-2xs text-ink-3">© 2026 Upbase · Marketing B2C</footer>
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
