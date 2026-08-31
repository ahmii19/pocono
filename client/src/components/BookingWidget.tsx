'use client';

import { useState } from 'react';
import { Sparkles, Calendar, Users, ShieldCheck, CheckCircle2, CreditCard, Clock, Lock } from 'lucide-react';
import BookingModal from '@/components/BookingModal';
import AuthModal from '@/components/AuthModal';

export default function BookingWidget({ property }: { property: any }) {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleBookNowClick = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('pocono_token') : null;
    if (!token) {
      // User is NOT logged in: Open Login Modal
      setIsAuthModalOpen(true);
    } else {
      // User IS logged in: Open Booking Modal
      setIsBookingModalOpen(true);
    }
  };

  const handleAuthSuccess = () => {
    // Automatically continue to Booking Modal after login
    setIsAuthModalOpen(false);
    setIsBookingModalOpen(true);
  };

  return (
    <>
      <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-xl space-y-6 text-[#2b2b2b]">
        {/* Price & Badge Header */}
        <div className="flex justify-between items-baseline border-b border-gray-100 pb-4">
          <div>
            <span className="text-3xl font-extrabold text-[#2b2b2b]">${property.nightlyPrice}</span>
            <span className="text-gray-500 text-sm font-medium"> / night</span>
          </div>
          {property.instantBook && (
            <span className="px-2.5 py-1 bg-[#f15e75]/10 text-[#f15e75] font-extrabold text-xs rounded-md border border-[#f15e75]/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Instant Book</span>
            </span>
          )}
        </div>

        {/* Feature & Guarantee Highlights */}
        <div className="space-y-3 text-xs text-gray-600 font-medium">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#f15e75] shrink-0" />
            <span>Direct Booking Rate (Save 15% vs Third-Party Fees)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#f15e75] shrink-0" />
            <span>Verified Pocono Mountain Vacation Rental</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-[#f15e75] shrink-0" />
            <span>Server-Validated &amp; SSL Encrypted Checkout</span>
          </div>
        </div>

        {/* PRIMARY BOOK NOW CTA BUTTON */}
        <button
          onClick={handleBookNowClick}
          className="w-full py-4 bg-[#f15e75] hover:bg-[#d94f64] active:scale-[0.99] text-white font-extrabold rounded-xl shadow-lg shadow-[#f15e75]/30 transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
        >
          <Calendar className="w-4 h-4" />
          <span>Book Now</span>
        </button>

        <p className="text-[11px] text-center text-gray-500 font-medium">
          Select dates &amp; guests in the next step
        </p>
      </div>

      {/* Auth Modal for Logged-out users */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        customSubtitle="Please login to continue with your booking."
      />

      {/* Booking & Payment Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        property={property}
      />
    </>
  );
}
