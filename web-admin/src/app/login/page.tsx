'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Lock,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { USERS } from '@/lib/mockData';
import { UserProfile } from '@/lib/types';

function LoginFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-slate-100 flex items-center justify-center font-sans">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-bold text-white text-base shadow-lg animate-pulse">
          UB
        </div>
        <span className="text-xs text-slate-400">Đang tải cổng xác thực Lark...</span>
      </div>
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
  const [larkConfigured, setLarkConfigured] = useState<boolean | null>(null);

  // Kiểm tra trạng thái cấu hình Lark và session hiện tại
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        setLarkConfigured(Boolean(data.larkConfigured));
        if (data.authenticated) {
          router.replace(returnTo);
        }
      } catch (err) {
        console.error('Error checking auth:', err);
      }
    }
    checkAuth();
  }, [router, returnTo]);

  // Đăng nhập trực tiếp bằng Lark SSO (OAuth)
  const handleLarkLogin = () => {
    setIsLoading(true);
    window.location.href = `/api/auth/lark/login?returnTo=${encodeURIComponent(returnTo)}`;
  };

  // Đăng nhập sandbox / demo
  const handleSandboxLogin = async (userId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/lark/sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (data.success) {
        router.push(returnTo);
      } else {
        alert(data.error || 'Đăng nhập sandbox thất bại');
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert('Đã có lỗi xảy ra khi đăng nhập sandbox');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Decorative ambient background glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="px-6 py-4 flex items-center justify-between z-10 border-b border-slate-800/80 backdrop-blur-md bg-slate-900/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-blue-500/20">
            UB
          </div>
          <div>
            <span className="text-sm font-bold text-white tracking-tight block">
              UpBase B2C Ops Hub
            </span>
            <span className="text-[11px] text-slate-400 block font-normal">
              Hệ thống Quản trị &amp; Điều hành Phòng Marketing B2C
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Lark Suite Workspace
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 z-10">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Product Value & SSO Explanations */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              Đăng nhập tập trung Lark SSO
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Điều hành B2C bằng <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-300">
                Dữ liệu &amp; Năng lực Thực
              </span>
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              Truy cập an toàn vào danh mục 35+ Store, giám sát SLA thời gian thực, bảng phân bổ công việc theo độ khó và đánh giá 4P minh bạch.
            </p>

            {/* Feature Highlights */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-white">Xác thực 1 chạm với Lark Enterprise</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tự động nhận diện tài khoản UpBase (@upbase.vn), không cần nhớ mật khẩu riêng biệt.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-white">Phân quyền tự động theo vai trò (RBAC)</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tự động cấp quyền Trưởng phòng (Manager), Brand PIC, Content Lead hoặc Booking Specialist.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Authentication Card */}
          <div className="lg:col-span-6">
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative space-y-6">
              
              {/* Header inside Card */}
              <div className="text-center space-y-2">
                {/* Lark Suite Logo Icon representation */}
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-[#3370FF] to-[#00D6B9] flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Đăng Nhập Lark Workspace
                </h3>
                <p className="text-xs text-slate-400">
                  Sử dụng tài khoản công ty UpBase để tiếp tục
                </p>
              </div>

              {/* Error Alert Display */}
              {errorParam && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <div>
                    <span className="font-semibold block">Thông báo xác thực:</span>
                    <span className="text-[11px] text-rose-200">
                      {errorParam === 'lark_not_configured' 
                        ? 'Chưa cấu hình LARK_APP_ID và LARK_APP_SECRET trong file .env.local. Bạn có thể sử dụng chế độ Đăng nhập Demo Sandbox bên dưới.' 
                        : messageParam || 'Xác thực qua Lark không thành công. Vui lòng thử lại.'}
                    </span>
                  </div>
                </div>
              )}

              {/* Primary Action Button: Real Lark SSO */}
              <div className="space-y-3">
                <button
                  onClick={handleLarkLogin}
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 active:scale-[0.99] transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                  <span>
                    {isLoading ? 'Đang chuyển hướng Lark...' : 'Đăng nhập bằng Lark SSO'}
                  </span>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </button>

                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>Tổ chức: <strong className="text-slate-300">UpBase Vietnam</strong></span>
                  <span className="flex items-center gap-1 text-cyan-400">
                    <Lock className="w-3 h-3" /> OAuth 2.0 Secure
                  </span>
                </div>
              </div>

              {/* Sandbox / Fast Login Divider */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-700"></div>
                <span className="flex-shrink mx-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Hoặc chọn tài khoản thử nghiệm
                </span>
                <div className="flex-grow border-t border-slate-700"></div>
              </div>

              {/* Quick Persona Picker (Sandbox Mode) */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Chế độ Sandbox (Thử nghiệm nhanh theo vai trò):</span>
                  <span className="text-[10px] bg-slate-700/80 px-2 py-0.5 rounded text-cyan-300">Không cần API Key</span>
                </label>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {USERS.slice(0, 4).map((u) => {
                    const isSelected = selectedUser === u.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setSelectedUser(u.id)}
                        className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500/80 text-white shadow-xs'
                            : 'bg-slate-900/40 border-slate-700/50 text-slate-300 hover:bg-slate-700/30'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSelected ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {u.avatar}
                          </div>
                          <div className="truncate min-w-0">
                            <span className="text-xs font-bold block truncate leading-tight">
                              {u.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate leading-tight mt-0.5">
                              {u.roleTitle}
                            </span>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase shrink-0 ${
                          u.role === 'MANAGER'
                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                            : u.role === 'BRAND_MEMBER'
                            ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                            : u.role === 'CONTENT_MEMBER'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                        }`}>
                          {u.role.replace('_MEMBER', '')}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => handleSandboxLogin(selectedUser)}
                  disabled={isLoading}
                  className="w-full py-2 px-3 rounded-xl border border-slate-600 bg-slate-700 hover:bg-slate-600 active:scale-[0.99] font-semibold text-xs text-white transition flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <span>Đăng nhập thử với nhân sự đã chọn</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                </button>
              </div>

              {/* Integration Guide Note */}
              <div className="pt-2 border-t border-slate-700/60 text-center">
                <p className="text-[11px] text-slate-400">
                  Cấu hình kết nối Lark chính thức tại{' '}
                  <code className="text-cyan-300 px-1 py-0.5 bg-slate-900 rounded font-mono text-[10px]">
                    .env.local
                  </code>
                </p>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-slate-800/80 text-center text-xs text-slate-400 bg-slate-900/40">
        <p>© 2026 UpBase Digital Transformation Team · B2C Operations Hub · Bảo mật tiêu chuẩn doanh nghiệp</p>
      </footer>
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

