'use client';

import { useSiteSettings } from '@/context/SiteSettingsContext';
import { resolveSiteAssetUrl } from '@/lib/assetResolver';

interface GlobalPageLoaderProps {
  message?: string;
}

export default function GlobalPageLoader({ message = 'Loading...' }: GlobalPageLoaderProps) {
  const { settings } = useSiteSettings();
  const logo = resolveSiteAssetUrl(settings?.branding?.desktopLogoUrl, 'desktopLogo');

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-xs transition-opacity duration-300">
      <div className="flex flex-col items-center space-y-4 text-center px-4">
        {/* Reused Pocono Vacations Navbar Logo */}
        <div className="relative flex items-center justify-center">
          <img
            src={logo}
            alt={settings?.general?.siteName || "Pocono.Vacations"}
            className="h-12 sm:h-14 w-auto object-contain animate-pulse"
          />
        </div>

        {/* Elegant Minimal Loading Indicator & Text */}
        <div className="flex items-center gap-2 pt-2">
          <div className="w-2 h-2 rounded-full bg-[#f15e75] animate-ping" />
          <span className="text-xs font-extrabold text-[#4f5962] tracking-wider uppercase">
            {message}
          </span>
        </div>
      </div>
    </div>
  );
}
