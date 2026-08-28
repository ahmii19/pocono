'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthModal from '@/components/AuthModal';
import { Building2, ShieldCheck, DollarSign, ArrowRight } from 'lucide-react';

export default function BecomeAHostPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('pocono_user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setUser(u);
        if (u.role === 'HOST') {
          router.push('/host/dashboard');
        } else if (u.role === 'GUEST') {
          router.push('/dashboard');
        }
      } catch (e) {}
    }
  }, [router]);

  if (user?.role === 'GUEST') {
    return null;
  }

  return (
    <div className="bg-[#f8fafc] min-h-screen text-[#2b2b2b]">
      {/* Hero Header */}
      <div className="bg-white border-b border-[#d8dce1] py-16">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-6">
          <span className="px-3.5 py-1 bg-[#fff1f3] text-[#f15e75] text-xs font-extrabold rounded-full uppercase tracking-wider border border-[#f15e75]/30">
            Host Partner Program
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#2b2b2b] tracking-tight">
            Earn Money Renting Your Pocono Vacation Home
          </h1>
          <p className="text-base text-[#4f5962] max-w-2xl mx-auto font-medium">
            Join Pocono.Vacations direct booking network. Manage your properties, reservations, pricing, and guest reviews with zero extra hassle.
          </p>

          <div className="pt-4">
            {user ? (
              user.role === 'HOST' ? (
                <Link
                  href="/host/dashboard"
                  className="px-8 py-4 bg-[#f15e75] hover:bg-[#d94f64] text-white font-extrabold rounded-md text-sm shadow-md transition-all flex items-center justify-center gap-2 mx-auto max-w-xs"
                >
                  <span>Go to Host Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <div className="space-y-3">
                  <Link
                    href="/contact-us"
                    className="px-8 py-4 bg-[#f15e75] hover:bg-[#d94f64] text-white font-extrabold rounded-md text-sm shadow-md transition-all flex items-center justify-center gap-2 mx-auto max-w-md"
                  >
                    <span>Contact Administrator to Request Host Status</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <p className="text-xs text-[#7a7a7a]">
                    Host account status is verified and granted by Pocono.Vacations Administrators.
                  </p>
                </div>
              )
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="px-8 py-4 bg-[#f15e75] hover:bg-[#d94f64] text-white font-extrabold rounded-md text-sm shadow-md transition-all flex items-center justify-center gap-2 mx-auto"
              >
                <span>Register to Become a Host</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="max-w-6xl mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white border border-[#d8dce1] p-6 rounded-md shadow-2xs space-y-3 text-center">
          <div className="w-12 h-12 bg-[#fff1f3] text-[#f15e75] rounded-full flex items-center justify-center mx-auto border border-[#f15e75]/30">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#2b2b2b]">List Unlimited Properties</h3>
          <p className="text-xs text-[#4f5962] font-medium leading-relaxed">
            Create listings with rich photo galleries, custom nightly rates, cleaning fees, and amenity options.
          </p>
        </div>

        <div className="bg-white border border-[#d8dce1] p-6 rounded-md shadow-2xs space-y-3 text-center">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
            <DollarSign className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#2b2b2b]">Direct Guest Bookings</h3>
          <p className="text-xs text-[#4f5962] font-medium leading-relaxed">
            Receive direct guest reservations with automated pricing calculation, tax management, and earnings tracking.
          </p>
        </div>

        <div className="bg-white border border-[#d8dce1] p-6 rounded-md shadow-2xs space-y-3 text-center">
          <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center mx-auto border border-sky-200">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#2b2b2b]">Full Host Dashboard Control</h3>
          <p className="text-xs text-[#4f5962] font-medium leading-relaxed">
            Manage your properties, review reservation histories, manage guest messages, and respond to reviews all in one place.
          </p>
        </div>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        initialMode="signup"
        intent="host"
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}
