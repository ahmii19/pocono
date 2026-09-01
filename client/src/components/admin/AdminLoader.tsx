'use client';

import React from 'react';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { resolveSiteAssetUrl } from '@/lib/assetResolver';

interface AdminLoaderProps {
  variant?: 'page' | 'table' | 'inline';
  message?: string;
  className?: string;
}

export default function AdminLoader({
  variant = 'page',
  message = 'Loading...',
  className = '',
}: AdminLoaderProps) {
  const { settings } = useSiteSettings();
  const logo = resolveSiteAssetUrl(settings?.branding?.desktopLogoUrl, 'desktopLogo');

  if (variant === 'inline') {
    return (
      <div className={`flex items-center justify-center gap-3 py-6 px-4 text-center ${className}`}>
        <div className="w-2 h-2 rounded-full bg-[#f15e75] animate-ping" />
        <span className="text-xs font-bold text-[#4f5962] tracking-wider uppercase">
          {message}
        </span>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`w-full py-16 px-4 bg-white border border-[#e5e7eb] rounded-md flex flex-col items-center justify-center space-y-4 text-center shadow-xs ${className}`}>
        <div className="relative flex items-center justify-center">
          <img
            src={logo}
            alt={settings?.general?.siteName || 'Pocono.Vacations'}
            className="h-10 w-auto object-contain animate-pulse opacity-90"
          />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <div className="w-2 h-2 rounded-full bg-[#f15e75] animate-ping" />
          <span className="text-xs font-extrabold text-[#4f5962] tracking-wider uppercase">
            {message}
          </span>
        </div>
      </div>
    );
  }

  // variant === 'page'
  return (
    <div className={`w-full min-h-[55vh] flex flex-col items-center justify-center space-y-5 text-center p-8 ${className}`}>
      <div className="relative flex items-center justify-center">
        <img
          src={logo}
          alt={settings?.general?.siteName || 'Pocono.Vacations'}
          className="h-12 sm:h-14 w-auto object-contain animate-pulse"
        />
      </div>

      <div className="flex items-center gap-2 pt-2">
        <div className="w-2.5 h-2.5 rounded-full bg-[#f15e75] animate-ping" />
        <span className="text-xs font-extrabold text-[#4f5962] tracking-wider uppercase">
          {message}
        </span>
      </div>
    </div>
  );
}
