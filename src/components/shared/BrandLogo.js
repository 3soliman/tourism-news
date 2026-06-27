'use client';

import React from 'react';
import Image from 'next/image';
import { BRAND } from '@/config/brand';

const SIZE_MAP = {
  xs: { icon: 32, full: 36 },
  sm: { icon: 38, full: 44 },
  md: { icon: 44, full: 52 },
  lg: { icon: 52, full: 64 },
  xl: { icon: 68, full: 80 },
  header: { icon: 40, full: 46 },
  footer: { icon: 40, full: 54 },
  admin: { icon: 38, full: 42 },
  auth: { icon: 48, full: 58 },
  loading: { icon: 68, full: 76 }
};

/**
 * @param {'icon' | 'full'} variant — icon-only mark, or logo with company name
 * @param {keyof typeof SIZE_MAP} size
 */
const BrandLogo = ({
  variant = 'icon',
  size = 'md',
  className = '',
  priority = false,
  ...imgProps
}) => {
  const dimensions = SIZE_MAP[size] || SIZE_MAP.md;
  const isFull = variant === 'full';
  const src = isFull ? BRAND.logos.full : BRAND.logos.icon;
  const height = isFull ? dimensions.full : dimensions.icon;
  const width = isFull ? Math.round(height * 3.2) : height;

  return (
    <Image
      src={src}
      alt={BRAND.name}
      width={width}
      height={height}
      priority={priority}
      className={`brand-logo brand-logo--${variant} brand-logo--${size} ${className}`.trim()}
      style={{ width: isFull ? 'auto' : height, height, maxWidth: isFull ? 220 : height }}
      {...imgProps}
    />
  );
};

export default BrandLogo;
