'use client';

import React, { useState } from 'react';
import { getBrandLogoUrl } from '../../lib/brandLogos';
import { Avatar } from './data';

export interface BrandAvatarProps {
  name?: string;
  brandName?: string;
  id?: string;
  brandId?: string;
  code?: string;
  size?: number;
  className?: string;
  rounded?: 'full' | 'md' | 'lg' | 'sm';
  fallback?: React.ReactNode;
}

/**
 * Avatar hiển thị Logo thương hiệu chính thức nếu có trong hệ thống,
 * tự động fallback về chữ viết tắt chuẩn UX nếu chưa có ảnh hoặc tải lỗi.
 */
export function BrandAvatar({
  name,
  brandName,
  id,
  brandId,
  code,
  size = 28,
  className = '',
  rounded = 'md',
  fallback,
}: BrandAvatarProps) {
  const displayName = brandName || name || 'Brand';
  const lookupKey = brandId || id || code || displayName;
  const [hasError, setHasError] = useState(false);
  const logoUrl = getBrandLogoUrl(lookupKey);

  const roundedClass = {
    full: 'rounded-full',
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
  }[rounded];

  if (!logoUrl || hasError) {
    if (fallback) return <>{fallback}</>;
    return <Avatar name={displayName} size={size} className={className} />;
  }

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 bg-white border border-slate-200/90 shadow-2xs overflow-hidden select-none transition-transform hover:scale-105 ${roundedClass} ${className}`}
      style={{ width: size, height: size }}
      title={name}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt={name}
        className="w-full h-full object-contain p-0.5"
        onError={() => setHasError(true)}
        loading="lazy"
      />
    </span>
  );
}
