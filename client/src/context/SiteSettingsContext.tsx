'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';

export interface SiteSettings {
  general: {
    siteName: string;
    siteDescription: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
    platformCommissionPercent?: number | string;
  };
  branding: {
    desktopLogoUrl: string;
    mobileLogoUrl: string;
    faviconUrl: string;
    primaryColor: string;
    secondaryColor: string;
  };
  hero: {
    heroHeading: string;
    heroSubtitle: string;
    heroBgImage: string;
    searchEnabled: boolean;
  };
  contact: {
    whatsAppNumber: string;
    phoneNumber: string;
    contactEmail: string;
    ctaText: string;
  };
  social: {
    facebookUrl: string;
    instagramUrl: string;
    youtubeUrl: string;
    twitterUrl: string;
  };
  seo: {
    metaTitle: string;
    metaDescription: string;
    ogImageUrl: string;
  };
  footer: {
    footerText: string;
    copyrightText: string;
  };
  payment: {
    stripeEnabled: boolean;
    paypalEnabled: boolean;
    payLaterEnabled: boolean;
    defaultPaymentGateway: 'stripe' | 'paypal' | 'pay_later' | string;
    payLaterDeadlineHours: number;
    payLaterInstructions: string;
    autoExpirePayLaterReservations: boolean;
  };
}

const DEFAULT_SETTINGS: SiteSettings = {
  general: {
    siteName: "Pocono.Vacations",
    siteDescription: "Luxury Pocono Vacation Rentals & Direct Booking",
    contactEmail: "info@pocono.vacations",
    contactPhone: "(570) 555-0199",
    address: "Pocono Mountains, Pennsylvania, USA",
    platformCommissionPercent: "10.00"
  },
  branding: {
    desktopLogoUrl: "/wp-content/uploads/2026/05/PV6_no-bg-_300.png",
    mobileLogoUrl: "/wp-content/uploads/2026/05/PV6_no-bg-_300.png",
    faviconUrl: "/favicon3.png",
    primaryColor: "#f15e75",
    secondaryColor: "#2b2b2b"
  },
  hero: {
    heroHeading: "Find Your Perfect Pocono Vacation Home",
    heroSubtitle: "Book direct & save on luxury chalets.",
    heroBgImage: "/wp-content/uploads/2018/10/video-thumb.png",
    searchEnabled: true
  },
  contact: {
    whatsAppNumber: "+15705550199",
    phoneNumber: "(570) 555-0199",
    contactEmail: "info@pocono.vacations",
    ctaText: "Book Direct & Save More"
  },
  social: {
    facebookUrl: "https://facebook.com/poconovacations",
    instagramUrl: "https://instagram.com/poconovacations",
    youtubeUrl: "https://youtube.com/poconovacations",
    twitterUrl: "https://twitter.com/poconovacations"
  },
  seo: {
    metaTitle: "Pocono Vacations | Luxury Rental Homes & Chalets",
    metaDescription: "Book direct & save on luxury vacation homes, cabins, and lakefront chalets in the Pocono Mountains.",
    ogImageUrl: "/images/og-image.jpg"
  },
  footer: {
    footerText: "Your premier direct-booking marketplace for luxury mountain cabins, lakefront chalets, and vacation rentals in Lake Harmony, Blakeslee, and the Pocono Mountains.",
    copyrightText: "© 2026 Pocono.Vacations. All Rights Reserved."
  },
  payment: {
    stripeEnabled: true,
    paypalEnabled: true,
    payLaterEnabled: true,
    defaultPaymentGateway: "stripe",
    payLaterDeadlineHours: 48,
    payLaterInstructions: "Please submit your payment proof after completing your reservation request. Your reservation will remain pending until payment verification is reviewed and approved.",
    autoExpirePayLaterReservations: true
  }
};

interface SiteSettingsContextType {
  settings: SiteSettings;
  loading: boolean;
  refetch: () => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextType>({
  settings: DEFAULT_SETTINGS,
  loading: false,
  refetch: async () => {}
});

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSettings = async () => {
    try {
      const res = await fetchApi<{ data: SiteSettings }>('/settings');
      if (res.data) {
        setSettings({
          general: { ...DEFAULT_SETTINGS.general, ...res.data.general },
          branding: { ...DEFAULT_SETTINGS.branding, ...res.data.branding },
          hero: { ...DEFAULT_SETTINGS.hero, ...res.data.hero },
          contact: { ...DEFAULT_SETTINGS.contact, ...res.data.contact },
          social: { ...DEFAULT_SETTINGS.social, ...res.data.social },
          seo: { ...DEFAULT_SETTINGS.seo, ...res.data.seo },
          footer: { ...DEFAULT_SETTINGS.footer, ...res.data.footer },
          payment: { ...DEFAULT_SETTINGS.payment, ...res.data.payment }
        });
      }
    } catch (err) {
      console.warn('[SiteSettingsContext] Failed to load public settings from API, using default fallbacks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && settings.branding?.primaryColor) {
      document.documentElement.style.setProperty('--site-primary-color', settings.branding.primaryColor);
    }
  }, [settings.branding?.primaryColor]);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, refetch: fetchSettings }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
