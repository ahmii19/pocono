'use client';

import Link from 'next/link';
import { Home, Mail, Phone, MapPin, Heart } from 'lucide-react';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { resolveSiteAssetUrl } from '@/lib/assetResolver';

export default function Footer() {
  const { settings } = useSiteSettings();

  const logoUrl = resolveSiteAssetUrl(settings?.branding?.desktopLogoUrl, 'footerLogo');
  const footerText = settings?.footer?.footerText || 'Your premier direct-booking marketplace for luxury mountain cabins, lakefront chalets, and vacation rentals in Lake Harmony, Blakeslee, and the Pocono Mountains.';
  const address = settings?.general?.address || 'Pocono Mountains, Pennsylvania, USA';
  const email = settings?.general?.contactEmail || 'support@pocono.vacations';
  const copyright = settings?.footer?.copyrightText || `© ${new Date().getFullYear()} ${settings?.general?.siteName || 'Pocono.Vacations'}. All Rights Reserved.`;

  return (
    <footer className="bg-white text-[#4f5962] pt-16 pb-8 border-t border-[#d8dce1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-[#d8dce1]">
          {/* Column 1: Brand Info */}
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <img
                src={logoUrl}
                alt={settings?.general?.siteName || "Pocono.Vacations"}
                className="w-[180px] h-auto object-contain"
              />
            </Link>
            <p className="text-xs text-[#4f5962] leading-relaxed font-medium">
              {footerText}
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-[#2b2b2b] uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2.5 text-xs font-semibold">
              <li><Link href="/" className="hover:text-[#54c4d9] transition-colors">Home</Link></li>
              <li><Link href="/properties" className="hover:text-[#54c4d9] transition-colors">All Homes</Link></li>
              <li><Link href="/pet-friendly" className="hover:text-[#54c4d9] transition-colors">Pet Friendly Rentals</Link></li>
              <li><Link href="/lakefront" className="hover:text-[#54c4d9] transition-colors">Lakefront Cabins</Link></li>
              <li><Link href="/local-experiences" className="hover:text-[#54c4d9] transition-colors">Local Pocono Experiences</Link></li>
            </ul>
          </div>

          {/* Column 3: Popular Destinations */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-[#2b2b2b] uppercase tracking-wider">Popular Destinations</h4>
            <ul className="space-y-2.5 text-xs font-semibold">
              <li><Link href="/city/lake-harmony" className="hover:text-[#54c4d9] transition-colors">Lake Harmony Vacation Homes</Link></li>
              <li><Link href="/city/blakeslee" className="hover:text-[#54c4d9] transition-colors">Blakeslee Cabins</Link></li>
              <li><Link href="/city/albrightsville" className="hover:text-[#54c4d9] transition-colors">Albrightsville Chalets</Link></li>
              <li><Link href="/city/pocono-lake" className="hover:text-[#54c4d9] transition-colors">Pocono Lake Rentals</Link></li>
              <li><Link href="/city/tannersville" className="hover:text-[#54c4d9] transition-colors">Tannersville Ski Chalets</Link></li>
            </ul>
          </div>

          {/* Column 4: Direct Contact & Security */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-[#2b2b2b] uppercase tracking-wider">Book Direct & Save</h4>
            <p className="text-xs text-[#4f5962] font-medium leading-relaxed">
              {settings?.contact?.ctaText || 'Save up to 15% on traveler service fees by booking directly with verified local hosts in the Poconos.'}
            </p>
            <div className="space-y-2 text-xs text-[#4f5962] font-semibold">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#f15e75] shrink-0" />
                <span>{address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#f15e75] shrink-0" />
                <span>{email}</span>
              </div>
              {settings?.general?.contactPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#f15e75] shrink-0" />
                  <span>{settings.general.contactPhone}</span>
                </div>
              )}
            </div>

            {/* Social Media Links */}
            {settings?.social && (
              <div className="pt-2 flex items-center gap-3 text-xs text-gray-500">
                {settings.social.facebookUrl && (
                  <a href={settings.social.facebookUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#f15e75] font-bold">Facebook</a>
                )}
                {settings.social.instagramUrl && (
                  <a href={settings.social.instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#f15e75] font-bold">Instagram</a>
                )}
                {settings.social.youtubeUrl && (
                  <a href={settings.social.youtubeUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#f15e75] font-bold">YouTube</a>
                )}
                {settings.social.twitterUrl && (
                  <a href={settings.social.twitterUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#f15e75] font-bold">X / Twitter</a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#7a7a7a]">
          <p>{copyright}</p>
          <div className="flex items-center gap-1 font-medium">
            <span>Built for the Pocono Mountain Community</span>
            <Heart className="w-3.5 h-3.5 text-[#f15e75] fill-[#f15e75]" />
          </div>
        </div>
      </div>
    </footer>
  );
}
