'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldAlert, LayoutDashboard, Building2, Users, Calendar,
  Star, MapPin, Trees, Home, ListFilter, Sliders, FileText,
  MessageSquare, Image as ImageIcon, LayoutTemplate, Settings, LogOut, Menu, X
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (pathname === '/admin/login') {
      setLoading(false);
      return;
    }

    const adminToken = localStorage.getItem('pocono_admin_token');
    const storedAdminUser = localStorage.getItem('pocono_admin_user');

    if (!adminToken || !storedAdminUser) {
      router.push('/admin/login');
      return;
    }

    try {
      const parsed = JSON.parse(storedAdminUser);
      if (parsed.role !== 'ADMIN') {
        router.push('/admin/login');
        return;
      }
      setUser(parsed);
      setLoading(false);
    } catch (e) {
      router.push('/admin/login');
    }
  }, [pathname, router]);

  const handleLogout = () => {
    // Clear dedicated ADMIN session keys ONLY
    localStorage.removeItem('pocono_admin_token');
    localStorage.removeItem('pocono_admin_user');
    router.push('/admin/login');
  };

  // If viewing the Admin Login page, render directly without sidebar layout
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-[#4f5962] text-sm font-medium">
        Verifying Admin Security Privileges...
      </div>
    );
  }

  const navItems = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/properties', label: 'Properties', icon: Building2 },
    { href: '/admin/reservations', label: 'Reservations', icon: Calendar },
    { href: '/admin/reviews', label: 'Reviews', icon: Star },
    { href: '/admin/cities', label: 'Cities', icon: MapPin },
    { href: '/admin/communities', label: 'Communities', icon: Trees },
    { href: '/admin/property-types', label: 'Property Types', icon: Home },
    { href: '/admin/amenities', label: 'Amenities', icon: ListFilter },
    { href: '/admin/facilities', label: 'Facilities', icon: Sliders },
    { href: '/admin/invoices', label: 'Invoices', icon: FileText },
    { href: '/admin/messages', label: 'Messages', icon: MessageSquare },
    { href: '/admin/media', label: 'Media Library', icon: ImageIcon },
    { href: '/admin/homepage', label: 'Homepage', icon: LayoutTemplate },
    { href: '/admin/settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#2b2b2b] flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-[#e5e7eb] p-6 space-y-6 shrink-0 shadow-sm">
        <div className="flex items-center gap-3 border-b border-[#e5e7eb] pb-5">
          <div className="p-2.5 bg-[#fff1f3] text-[#f15e75] rounded-lg border border-[#f15e75]/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#2b2b2b]">Admin Panel</h2>
            <span className="text-[10px] text-[#f15e75] font-bold uppercase tracking-wider block">Super Administrator</span>
          </div>
        </div>

        <nav className="flex-grow space-y-1 overflow-y-auto max-h-[calc(100vh-210px)] pr-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-md text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#f15e75] text-white shadow-sm'
                    : 'text-[#4f5962] hover:bg-[#fff1f3] hover:text-[#f15e75]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-[#e5e7eb]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-[#f15e75] hover:bg-[#fff1f3] rounded-md text-xs font-bold transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out Admin</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header Bar */}
      <div className="md:hidden bg-white border-b border-[#e5e7eb] p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-[#f15e75]" />
          <span className="font-bold text-[#2b2b2b] text-sm">Pocono Admin</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-[#4f5962]">
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-[#e5e7eb] p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2 px-3 text-xs font-bold text-[#4f5962] hover:text-[#f15e75] hover:bg-[#fff1f3] rounded-md"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto bg-[#f8fafc]">
        {children}
      </main>
    </div>
  );
}
