'use client';

import React, { useState } from 'react';
import { getBrandLogoUrl } from '../../lib/brandLogos';
import { Avatar } from './data';

export interface BrandAvatarProps {
  name: string;
  id?: string;
  code?: string;
  size?: number;
  className?: string;
  rounded?: 'full' | 'md' | 'lg' | 'sm';
}

/**
 * Avatar hiển thị Logo thương hiệu chính thức nếu có trong hệ thống,
 * tự động fallback về chữ viết tắt chuẩn UX nếu chưa có ảnh hoặc tải lỗi.
 */
export function BrandAvatar({
  name,
  id,
  code,
  size = 28,
  className = '',
  rounded = 'md',
}: BrandAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const logoUrl = getBrandLogoUrl(id || code || name);

  const roundedClass = {
    full: 'rounded-full',
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
  }[rounded];

  if (!logoUrl || hasError) {
    return <Avatar name={name} size={size} className={className} />;
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
