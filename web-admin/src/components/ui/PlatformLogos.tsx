import React from 'react';

export function FacebookLogo({ className = 'w-4 h-4 shrink-0' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-label="Facebook" role="img">
      <circle cx="12" cy="12" r="10" fill="#1877F2" />
      <path
        d="M13.5 8.5h2V6h-2.5c-2 0-3 1.2-3 3v2H8v2.5h2V20h3v-6.5h2.2l.3-2.5H13V9.3c0-.6.3-.8.5-.8z"
        fill="white"
      />
    </svg>
  );
}

export function ThreadsLogo({ className = 'w-4 h-4 shrink-0' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-label="Threads" role="img">
      <circle cx="12" cy="12" r="10" fill="#111827" />
      <path
        d="M14.6 11.2c-.1-.7-.4-1.2-.8-1.5-.4-.4-1-.5-1.7-.5-.9 0-1.6.3-2.1.8-.5.6-.8 1.4-.8 2.5 0 1 .3 1.8.8 2.4.5.5 1.2.8 2.1.8.7 0 1.3-.2 1.8-.6.5-.4.8-1 .9-1.7h1.4c-.1 1.1-.6 2-1.4 2.6-.8.7-1.8 1-3 1-1.3 0-2.4-.4-3.2-1.3-.8-.9-1.2-2.1-1.2-3.7 0-1.5.4-2.8 1.3-3.7.8-.9 2-1.4 3.4-1.4 1.3 0 2.3.4 3 1.2.7.8 1.1 1.9 1.1 3.3v1.8c0 .8.2 1.4.5 1.8.4.4.8.6 1.4.6.4 0 .8-.1 1.1-.3v1.2c-.4.2-.9.3-1.4.3-1 0-1.8-.4-2.3-1.1-.4-.6-.6-1.4-.6-2.4v-1.7zm-1.4.9c0 .6-.1 1.1-.4 1.4-.3.4-.7.6-1.2.6-.5 0-.9-.2-1.2-.6-.3-.4-.4-1-.4-1.7 0-.7.1-1.2.4-1.6.3-.4.7-.6 1.2-.6.5 0 .9.2 1.2.6.2.4.4.8.4 1.3z"
        fill="white"
      />
    </svg>
  );
}

export function InstagramLogo({ className = 'w-4 h-4 shrink-0' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-label="Instagram" role="img">
      <defs>
        <radialGradient id="ig-gradient-logo" cx="20%" cy="105%" r="120%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="15%" stopColor="#fdf497" />
          <stop offset="50%" stopColor="#fd5949" />
          <stop offset="70%" stopColor="#d6249f" />
          <stop offset="100%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig-gradient-logo)" />
      <rect x="6.5" y="6.5" width="11" height="11" rx="3" stroke="white" strokeWidth="1.6" fill="none" />
      <circle cx="12" cy="12" r="2.8" stroke="white" strokeWidth="1.6" fill="none" />
      <circle cx="15.5" cy="8.5" r="0.8" fill="white" />
    </svg>
  );
}

export function ShopeeLogo({ className = 'w-4 h-4 shrink-0' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-label="Shopee" role="img">
      <path
        d="M19.5 7.5h-2.25a5.25 5.25 0 0 0-10.5 0H4.5A1.5 1.5 0 0 0 3 9l1.5 12A1.5 1.5 0 0 0 6 22.5h12a1.5 1.5 0 0 0 1.5-1.5L21 9a1.5 1.5 0 0 0-1.5-1.5z"
        fill="#EE4D2D"
      />
      <path
        d="M8.5 7.5a3.5 3.5 0 1 1 7 0"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M13.8 12c-.3-.2-.8-.4-1.3-.4-.8 0-1.4.3-1.4.8 0 .5.4.7 1.2.9l.4.1c1.2.3 1.9.8 1.9 1.8 0 1.2-1 2-2.5 2-1 0-1.7-.3-2.1-.6l.4-1.2c.4.3 1 .5 1.7.5.8 0 1.3-.3 1.3-.8 0-.5-.4-.7-1.1-.9l-.4-.1c-1.2-.3-1.9-.8-1.9-1.8 0-1.2 1-1.9 2.4-1.9.9 0 1.5.2 1.9.5l-.5 1z"
        fill="white"
      />
    </svg>
  );
}

export function TikTokLogo({ className = 'w-4 h-4 shrink-0' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-label="TikTok" role="img">
      <circle cx="12" cy="12" r="10" fill="#000000" />
      <path
        d="M15.5 6.5c.8.9 1.8 1.4 3 1.5v2.2c-1.1 0-2.1-.4-3-1v4.8c0 2.5-2 4.5-4.5 4.5S6.5 16.5 6.5 14s2-4.5 4.5-4.5c.3 0 .6 0 .9.1v2.3c-.3-.1-.6-.2-.9-.2-1.3 0-2.3 1-2.3 2.3s1 2.3 2.3 2.3 2.3-1 2.3-2.3V5h2.2c0 .6.2 1.1.5 1.5z"
        fill="white"
      />
    </svg>
  );
}

export function LazadaLogo({ className = 'w-4 h-4 shrink-0' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-label="Lazada" role="img">
      <defs>
        <linearGradient id="lzd-heart-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f32759" />
          <stop offset="50%" stopColor="#ff5934" />
          <stop offset="100%" stopColor="#0f146d" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5.5" fill="#0F146D" />
      <path
        d="M12 6.5 C10.2 4.8 7.3 5.4 6.5 7.6 C5.6 10 7.8 13.5 12 17.5 C16.2 13.5 18.4 10 17.5 7.6 C16.7 5.4 13.8 4.8 12 6.5 Z"
        fill="url(#lzd-heart-grad)"
      />
      <circle cx="12" cy="10.5" r="2.2" fill="#ffffff" opacity="0.9" />
    </svg>
  );
}

export function LiveLogo({ className = 'w-4 h-4 shrink-0' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-label="Livestream" role="img">
      <rect x="2" y="2" width="20" height="20" rx="5.5" fill="#DC2626" />
      <polygon points="10,8 16,12 10,16" fill="white" />
      <circle cx="6" cy="6" r="1.5" fill="#FCA5A5" />
    </svg>
  );
}

export function SelfChannelLogo({ className = 'w-4 h-4 shrink-0' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-label="Kênh Tự Xây" role="img">
      <rect x="2" y="2" width="20" height="20" rx="5.5" fill="#2563EB" />
      <path
        d="M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-5 9.5c0-1.8 3.3-2.8 5-2.8s5 1 5 2.8V17H7v-.5z"
        fill="white"
      />
    </svg>
  );
}

export type PlatformKey =
  | 'FACEBOOK'
  | 'THREADS'
  | 'INSTA'
  | 'INSTAGRAM'
  | 'SHOPEE'
  | 'SHOPEE_MALL'
  | 'TIKTOK'
  | 'TIKTOK_SHOP'
  | 'LAZADA'
  | 'LIVE'
  | 'SELF'
  | string;

export function PlatformLogo({
  platform,
  className = 'w-4 h-4 shrink-0',
}: {
  platform: PlatformKey;
  className?: string;
}) {
  const p = (platform || '').toUpperCase();
  if (p.includes('SHOPEE')) return <ShopeeLogo className={className} />;
  if (p.includes('TIKTOK')) return <TikTokLogo className={className} />;
  if (p.includes('LAZADA')) return <LazadaLogo className={className} />;
  if (p.includes('LIVE')) return <LiveLogo className={className} />;
  if (p.includes('SELF') || p.includes('TỰ XÂY')) return <SelfChannelLogo className={className} />;
  if (p.includes('FB') || p.includes('FACEBOOK')) return <FacebookLogo className={className} />;
  if (p.includes('THREAD')) return <ThreadsLogo className={className} />;
  if (p.includes('INSTA')) return <InstagramLogo className={className} />;
  return null;
}

/**
 * Trả về tên ngắn gọn chuẩn nghiệp vụ cho từng sàn/kênh:
 * TIKTOK_SHOP -> "TikTok", SHOPEE_MALL -> "Shopee", LAZADA -> "Lazada"
 */
export function getPlatformShortLabel(raw?: string): string {
  const v = (raw || '').toUpperCase();
  if (v.includes('SHOPEE')) return 'Shopee';
  if (v.includes('TIKTOK')) return 'TikTok';
  if (v.includes('LAZADA')) return 'Lazada';
  if (v.includes('LIVE')) return 'Live';
  if (v.includes('SELF') || v.includes('TỰ XÂY')) return 'Tự xây';
  if (v.includes('FB') || v.includes('FACEBOOK')) return 'FB';
  if (v.includes('THREAD')) return 'Threads';
  if (v.includes('INSTA')) return 'Insta';
  return raw || 'Khác';
}

export interface PlatformBadgeProps {
  platform: string;
  variant?: 'badge' | 'icon-only' | 'pill';
  showLabel?: boolean;
  className?: string;
  iconClassName?: string;
}

/**
 * Badge phân loại sàn thương mại / kênh nội dung:
 * Ưu tiên hiển thị LOGO biểu tượng để vừa ngắn chữ, vừa đẹp mắt, chuyên nghiệp.
 */
export function PlatformBadge({
  platform,
  variant = 'badge',
  showLabel = true,
  className = '',
  iconClassName = 'w-3.5 h-3.5',
}: PlatformBadgeProps) {
  const shortLabel = getPlatformShortLabel(platform);
  const v = (platform || '').toUpperCase();

  // Style màu theo sàn
  let themeStyles = 'bg-slate-100 text-slate-700 border-slate-200/80';
  if (v.includes('SHOPEE')) {
    themeStyles = 'bg-orange-50/80 text-orange-700 border-orange-200/70 hover:bg-orange-100/60';
  } else if (v.includes('TIKTOK')) {
    themeStyles = 'bg-zinc-100 text-zinc-900 border-zinc-200/90 hover:bg-zinc-200/60';
  } else if (v.includes('LAZADA')) {
    themeStyles = 'bg-indigo-50/80 text-indigo-700 border-indigo-200/70 hover:bg-indigo-100/60';
  } else if (v.includes('LIVE')) {
    themeStyles = 'bg-rose-50/80 text-rose-700 border-rose-200/70 hover:bg-rose-100/60';
  } else if (v.includes('SELF') || v.includes('TỰ XÂY')) {
    themeStyles = 'bg-blue-50/80 text-blue-700 border-blue-200/70 hover:bg-blue-100/60';
  }

  if (variant === 'icon-only' || !showLabel) {
    return (
      <span
        title={platform}
        className={`inline-flex items-center justify-center p-0.5 rounded-sm transition-colors ${className}`}
      >
        <PlatformLogo platform={platform} className={iconClassName} />
      </span>
    );
  }

  return (
    <span
      title={platform}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-2xs font-medium tracking-tight whitespace-nowrap select-none transition-colors ${themeStyles} ${className}`}
    >
      <PlatformLogo platform={platform} className={iconClassName} />
      <span>{shortLabel}</span>
    </span>
  );
}
