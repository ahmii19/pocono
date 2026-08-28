'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard, Building2, Calendar, MessageSquare, Star, User,
  PlusCircle, DollarSign, Heart, FileText, Compass
} from 'lucide-react';

export default function HostNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [userRole, setUserRole] = useState<string>('HOST');

  useEffect(() => {
    const userStr = localStorage.getItem('pocono_user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u.role) setUserRole(u.role);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // 1. GUEST ROLE: Do not render HostNav for GUEST users
  if (userRole === 'GUEST') {
    return null;
  }

  // 2. ADMIN ROLE SECONDARY NAVIGATION
  if (userRole === 'ADMIN') {
    const adminLinks = [
      { href: '/admin', label: 'Admin Console', icon: LayoutDashboard },
      { href: '/admin/properties', label: 'Properties', icon: Building2 },
      { href: '/admin/users', label: 'Users', icon: User },
      { href: '/admin/messages', label: 'Messages', icon: MessageSquare }
    ];

    return (
      <div className="bg-white border-b border-[#d8dce1] sticky top-[80px] z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center py-3 gap-3">
            <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
              {adminLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-extrabold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-[#fff1f3] text-[#f15e75] border border-[#f15e75]/30 shadow-2xs'
                        : 'text-[#4f5962] hover:bg-gray-100 hover:text-[#2b2b2b]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#f15e75]' : 'text-gray-500'}`} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. HOST ROLE SECONDARY NAVIGATION (DEFAULT)
  const hostLinks = [
    { href: '/host/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/host/properties', label: 'My Properties', icon: Building2 },
    { href: '/host/reservations', label: 'Reservations', icon: Calendar },
    { href: '/host/earnings', label: 'Earnings', icon: DollarSign },
    { href: '/host/messages', label: 'Messages', icon: MessageSquare },
    { href: '/host/reviews', label: 'Reviews', icon: Star },
    { href: '/host/profile', label: 'Profile', icon: User }
  ];

  return (
    <div className="bg-white border-b border-[#d8dce1] sticky top-[80px] z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center py-3 gap-3">
          <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
            {hostLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== '/host/dashboard' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-extrabold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#fff1f3] text-[#f15e75] border border-[#f15e75]/30 shadow-2xs'
                      : 'text-[#4f5962] hover:bg-gray-100 hover:text-[#2b2b2b]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#f15e75]' : 'text-gray-500'}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="shrink-0">
            <Link
              href="/host/properties/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#f15e75] hover:bg-[#d94f64] text-white text-xs font-extrabold rounded-md shadow-sm transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add New Property</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
