import type { Metadata } from 'next';
import { Quicksand } from 'next/font/google';
import fs from 'fs';
import path from 'path';
import './globals.css';
import ClientLayoutWrapper from '@/components/ClientLayoutWrapper';

const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-quicksand',
});

export async function generateMetadata(): Promise<Metadata> {
  const fallbackTitle = 'Pocono.Vacations | Luxury Cabin & Chalet Rentals in the Poconos';
  const fallbackDescription = 'Book luxury vacation rentals in Lake Harmony, Blakeslee, Albrightsville, and the Pocono Mountains. Private hot tubs, lakefront views, and mountain chalets.';

  let title = fallbackTitle;
  let description = fallbackDescription;
  let favicon = '/favicon3.png';
  let ogImage = '/images/og-image.jpg';
  let siteName = 'Pocono.Vacations';

  try {
    const settingsPath = path.resolve(process.cwd(), '../server/src/data/siteSettings.json');
    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, 'utf8');
      const data = JSON.parse(raw);

      if (data.general?.siteName && data.general.siteName.trim()) {
        siteName = data.general.siteName.trim();
      }

      // 1. Title Priority: seo.metaTitle -> general.siteName -> fallback
      if (data.seo?.metaTitle && data.seo.metaTitle.trim()) {
        title = data.seo.metaTitle.trim();
      } else if (data.general?.siteName && data.general.siteName.trim()) {
        title = data.general.siteName.trim();
      }

      // 2. Description Priority: seo.metaDescription -> general.siteDescription -> fallback
      if (data.seo?.metaDescription && data.seo.metaDescription.trim()) {
        description = data.seo.metaDescription.trim();
      } else if (data.general?.siteDescription && data.general.siteDescription.trim()) {
        description = data.general.siteDescription.trim();
      }

      if (data.branding?.faviconUrl) favicon = data.branding.faviconUrl;
      if (data.seo?.ogImageUrl) ogImage = data.seo.ogImageUrl;
    }
  } catch (e) {
    // Fallback safely
  }

  return {
    title,
    description,
    icons: {
      icon: favicon,
      shortcut: favicon,
      apple: favicon
    },
    openGraph: {
      title,
      description,
      url: 'https://pocono.vacations',
      siteName,
      images: [{ url: ogImage }],
      type: 'website'
    }
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${quicksand.variable}`}>
      <body className="min-h-screen flex flex-col bg-[#f8f9fa] text-[#2b2b2b] font-sans antialiased relative">
        <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
      </body>
    </html>
  );
}
