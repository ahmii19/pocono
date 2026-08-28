'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CompareDrawer from '@/components/CompareDrawer';

import { SiteSettingsProvider } from '@/context/SiteSettingsContext';

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  if (isAdmin) {
    return (
      <SiteSettingsProvider>
        <main className="min-h-screen w-full flex flex-col">{children}</main>
      </SiteSettingsProvider>
    );
  }

  return (
    <SiteSettingsProvider>
      <Navbar />
      <main className="flex-grow">{children}</main>
      <CompareDrawer />
      <Footer />
    </SiteSettingsProvider>
  );
}
