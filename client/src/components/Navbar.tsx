'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, ChevronDown, User, Heart, Calendar, MessageSquare, LogOut, SlidersHorizontal, Building2 } from 'lucide-react';
import AuthModal from './AuthModal';
import { useSiteSettings } from '@/context/SiteSettingsContext';

import { resolveSiteAssetUrl } from '@/lib/assetResolver';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: 'login' | 'signup'; intent?: 'guest' | 'host' }>({
    isOpen: false,
    mode: 'login',
    intent: 'guest'
  });

  const checkUserAuth = () => {
    const storedUser = localStorage.getItem('pocono_user');
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch (e) { setUser(null); }
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    checkUserAuth();

    const handleAuthChange = () => {
      checkUserAuth();
    };

    window.addEventListener('pocono_auth_changed', handleAuthChange);
    return () => window.removeEventListener('pocono_auth_changed', handleAuthChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('pocono_token');
    localStorage.removeItem('pocono_user');
    setUser(null);
    window.dispatchEvent(new Event('pocono_auth_changed'));
    window.location.href = '/';
  };

  const openLoginModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setAuthModal({ isOpen: true, mode: 'login', intent: 'guest' });
  };

  const openRegisterModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setAuthModal({ isOpen: true, mode: 'signup', intent: 'guest' });
  };

  const openBecomeHostModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setAuthModal({ isOpen: true, mode: 'signup', intent: 'host' });
  };

  const { settings } = useSiteSettings();
  const desktopLogo = resolveSiteAssetUrl(settings?.branding?.desktopLogoUrl, 'desktopLogo');
  const mobileLogo = resolveSiteAssetUrl(settings?.branding?.mobileLogoUrl, 'mobileLogo');

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-[#d8dce1] text-[#4f5962] shadow-sm">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-[80px]">
            {/* [LEFT] Logo */}
            <Link href="/" className="flex items-center shrink-0">
              {/* Desktop Logo */}
              <img
                src={desktopLogo}
                alt={settings?.general?.siteName || "Pocono.Vacations"}
                className="hidden sm:block h-[42px] w-auto object-contain"
              />
              {/* Mobile Logo */}
              <img
                src={mobileLogo}
                alt={settings?.general?.siteName || "Pocono.Vacations"}
                className="sm:hidden h-[34px] w-auto object-contain"
              />
            </Link>

            {/* [CENTER] Primary Navigation */}
            <nav className="hidden lg:flex items-center gap-6 text-[13px] font-bold">
              <Link href="/" className="hover:text-[#f15e75] transition-colors py-2">Home</Link>
              <Link href="/properties" className="hover:text-[#f15e75] transition-colors py-2">All Homes</Link>
              <Link href="/pet-friendly" className="hover:text-[#f15e75] transition-colors py-2">Pet Friendly</Link>
              <Link href="/lakefront" className="hover:text-[#f15e75] transition-colors py-2">Lakefront</Link>
              <Link href="/local-experiences" className="hover:text-[#f15e75] transition-colors py-2">Local Experiences</Link>

              {/* More Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsMoreOpen(!isMoreOpen)}
                  className="flex items-center gap-1 hover:text-[#f15e75] transition-colors py-2 font-bold focus:outline-none"
                >
                  <span>More</span>
                  <span className="text-[10px]">▼</span>
                </button>
                {isMoreOpen && (
                  <div className="absolute top-full left-0 w-48 bg-white border border-[#d8dce1] rounded-md shadow-lg py-2 z-50">
                    <Link href="/contact-us" onClick={() => setIsMoreOpen(false)} className="block px-4 py-2 text-xs font-semibold text-[#4f5962] hover:bg-gray-50 hover:text-[#f15e75]">Contact Us</Link>
                    <Link href="/blog" onClick={() => setIsMoreOpen(false)} className="block px-4 py-2 text-xs font-semibold text-[#4f5962] hover:bg-gray-50 hover:text-[#f15e75]">Blog</Link>
                  </div>
                )}
              </div>
            </nav>

            {/* [RIGHT AUTH / DASHBOARD AREA] */}
            <div className="hidden lg:flex items-center gap-3 shrink-0">
              {user ? (
                /* LOGGED IN NAVIGATION */
                <div className="flex items-center gap-3">
                  {user.role === 'HOST' ? (
                    <Link
                      href="/host/dashboard"
                      className="px-4 py-2 bg-[#f15e75] hover:bg-[#d94f64] text-white text-[13px] font-extrabold rounded-md transition-colors flex items-center justify-center shadow-xs shrink-0"
                    >
                      Host Dashboard
                    </Link>
                  ) : user.role === 'ADMIN' ? (
                    <Link
                      href="/admin"
                      className="px-4 py-2 bg-[#2b2b2b] hover:bg-black text-white text-[13px] font-extrabold rounded-md transition-colors flex items-center justify-center shadow-xs shrink-0"
                    >
                      Admin Dashboard
                    </Link>
                  ) : (
                    <Link
                      href="/dashboard"
                      className="px-4 py-2 bg-white border border-[#d8dce1] hover:border-[#f15e75] text-[#4f5962] hover:text-[#f15e75] text-[13px] font-extrabold rounded-md transition-colors flex items-center justify-center shadow-2xs shrink-0"
                    >
                      Guest Dashboard
                    </Link>
                  )}

                  {/* User Avatar Menu Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-xs font-bold text-[#4f5962] rounded-md border border-[#d8dce1] transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-[#fff1f3] text-[#f15e75] font-extrabold text-xs flex items-center justify-center border border-[#f15e75]/30">
                        {(user.firstName || user.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span>{user.firstName || user.email.split('@')[0]}</span>
                      <span className="text-[9px]">▼</span>
                    </button>

                    {isUserMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-[#d8dce1] rounded-md shadow-xl py-2 z-50 text-xs">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="font-extrabold text-[#2b2b2b]">{user.firstName} {user.lastName}</p>
                          <p className="text-[11px] text-gray-500 font-mono">{user.email}</p>
                        </div>

                        {user.role === 'HOST' ? (
                          <>
                            <Link href="/host/dashboard" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 font-bold text-[#4f5962] hover:bg-[#fff1f3] hover:text-[#f15e75]">Host Dashboard</Link>
                            <Link href="/host/properties" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 font-bold text-[#4f5962] hover:bg-[#fff1f3] hover:text-[#f15e75]">My Properties</Link>
                            <Link href="/host/messages" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 font-bold text-[#4f5962] hover:bg-[#fff1f3] hover:text-[#f15e75]">Messages</Link>
                          </>
                        ) : user.role === 'ADMIN' ? (
                          <Link href="/admin" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 font-bold text-[#4f5962] hover:bg-[#fff1f3] hover:text-[#f15e75]">Admin Console</Link>
                        ) : (
                          <Link href="/dashboard" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 font-bold text-[#4f5962] hover:bg-[#fff1f3] hover:text-[#f15e75]">Guest Dashboard</Link>
                        )}

                        <div className="border-t border-gray-100 mt-1 pt-1">
                          <button
                            onClick={handleLogout}
                            className="w-full text-left flex items-center gap-2 px-4 py-2 font-bold text-rose-600 hover:bg-rose-50"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Log Out</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* LOGGED OUT NAVIGATION: [Login] [Register] [Become a Host] */
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={openLoginModal}
                    className="px-3.5 py-2 bg-white border border-[#d8dce1] hover:border-[#f15e75] text-[#4f5962] hover:text-[#f15e75] text-[13px] font-extrabold rounded-md transition-colors"
                  >
                    Login
                  </button>
                  <button
                    onClick={openRegisterModal}
                    className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-[#2b2b2b] text-[13px] font-extrabold rounded-md transition-colors"
                  >
                    Register
                  </button>
                  <button
                    onClick={openBecomeHostModal}
                    className="px-4 py-2 bg-[#f15e75] hover:bg-[#d94f64] text-white text-[13px] font-extrabold rounded-md transition-colors shadow-xs"
                  >
                    Become a Host
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex lg:hidden items-center gap-2">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-[#4f5962] hover:text-[#2b2b2b] focus:outline-none"
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isOpen && (
          <div className="lg:hidden bg-white border-b border-[#d8dce1] px-4 pt-2 pb-6 space-y-3 text-sm font-bold text-[#4f5962]">
            <Link href="/" onClick={() => setIsOpen(false)} className="block py-2 hover:text-[#f15e75]">Home</Link>
            <Link href="/properties" onClick={() => setIsOpen(false)} className="block py-2 hover:text-[#f15e75]">All Homes</Link>
            <Link href="/pet-friendly" onClick={() => setIsOpen(false)} className="block py-2 hover:text-[#f15e75]">Pet Friendly</Link>
            <Link href="/lakefront" onClick={() => setIsOpen(false)} className="block py-2 hover:text-[#f15e75]">Lakefront</Link>
            <Link href="/local-experiences" onClick={() => setIsOpen(false)} className="block py-2 hover:text-[#f15e75]">Local Experiences</Link>
            <Link href="/contact-us" onClick={() => setIsOpen(false)} className="block py-2 hover:text-[#f15e75]">Contact Us</Link>
            <Link href="/blog" onClick={() => setIsOpen(false)} className="block py-2 hover:text-[#f15e75]">Blog</Link>
            
            {user ? (
              <div className="pt-3 border-t border-gray-100 space-y-2">
                {user.role === 'HOST' ? (
                  <>
                    <Link href="/host/dashboard" onClick={() => setIsOpen(false)} className="block py-2 text-[#f15e75]">Host Dashboard</Link>
                    <Link href="/host/properties" onClick={() => setIsOpen(false)} className="block py-2">My Properties</Link>
                  </>
                ) : user.role === 'ADMIN' ? (
                  <Link href="/admin" onClick={() => setIsOpen(false)} className="block py-2 text-[#f15e75]">Admin Dashboard</Link>
                ) : (
                  <Link href="/dashboard" onClick={() => setIsOpen(false)} className="block py-2 text-[#f15e75]">Guest Dashboard</Link>
                )}
                <button onClick={handleLogout} className="block w-full text-left py-2 text-rose-600">Log Out</button>
              </div>
            ) : (
              <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
                <button
                  onClick={(e) => { setIsOpen(false); openLoginModal(e); }}
                  className="block w-full text-center py-2.5 bg-gray-100 text-[#4f5962] rounded-md font-bold text-xs"
                >
                  Login / Register
                </button>
                <button
                  onClick={(e) => { setIsOpen(false); openBecomeHostModal(e); }}
                  className="block w-full text-center py-2.5 bg-[#f15e75] text-white rounded-md font-bold text-xs shadow-xs"
                >
                  Become a Host
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Render Auth Modal */}
      <AuthModal
        isOpen={authModal.isOpen}
        initialMode={authModal.mode}
        intent={authModal.intent}
        onClose={() => setAuthModal(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}
