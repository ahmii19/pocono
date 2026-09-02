'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles, Calendar, Users, ShieldCheck, CheckCircle2, CheckCircle,
  AlertCircle, CreditCard, Clock, Lock
} from 'lucide-react';
import { checkAvailability, createReservation, fetchApi } from '@/lib/api';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import BookingModal from '@/components/BookingModal';
import AuthModal from '@/components/AuthModal';

export default function BookingWidget({ property }: { property: any }) {
  const router = useRouter();
  const { settings } = useSiteSettings();

  const stripeEnabled = settings.payment?.stripeEnabled !== false;
  const paypalEnabled = settings.payment?.paypalEnabled !== false;
  const payLaterEnabled = settings.payment?.payLaterEnabled !== false;
  const defaultGateway = settings.payment?.defaultPaymentGateway || 'stripe';
  const deadlineHours = settings.payment?.payLaterDeadlineHours || 48;
  const payLaterInstructions = settings.payment?.payLaterInstructions || 'Please submit your payment proof after completing your reservation request. Your reservation will remain pending until payment verification is reviewed and approved.';

  const enabledCount = (stripeEnabled ? 1 : 0) + (paypalEnabled ? 1 : 0) + (payLaterEnabled ? 1 : 0);

  const getInitialGateway = () => {
    if (defaultGateway === 'stripe' && stripeEnabled) return 'stripe';
    if (defaultGateway === 'paypal' && paypalEnabled) return 'paypal';
    if (defaultGateway === 'pay_later' && payLaterEnabled) return 'pay_later';
    if (stripeEnabled) return 'stripe';
    if (paypalEnabled) return 'paypal';
    if (payLaterEnabled) return 'pay_later';
    return null;
  };

  // Date Helpers: Default to 7 days out -> 10 days out
  const getDefaultDates = () => {
    const today = new Date();
    const inDate = new Date(today);
    inDate.setDate(today.getDate() + 7);

    const outDate = new Date(today);
    outDate.setDate(today.getDate() + 10);

    return {
      checkIn: inDate.toISOString().split('T')[0],
      checkOut: outDate.toISOString().split('T')[0]
    };
  };

  const initialDates = getDefaultDates();
  const [checkInDate, setCheckInDate] = useState(initialDates.checkIn);
  const [checkOutDate, setCheckOutDate] = useState(initialDates.checkOut);
  const [guestCount, setGuestCount] = useState(2);
  const [selectedExtraPrices, setSelectedExtraPrices] = useState<number[]>([]);
  const [paymentGateway, setPaymentGateway] = useState<'stripe' | 'paypal' | 'pay_later' | null>(getInitialGateway());
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [error, setError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [payLaterSuccessData, setPayLaterSuccessData] = useState<any>(null);

  // Modals for Mobile Flow
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authIntent, setAuthIntent] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    const validGw = getInitialGateway();
    if (validGw !== paymentGateway) {
      setPaymentGateway(validGw);
    }
  }, [stripeEnabled, paypalEnabled, payLaterEnabled, defaultGateway]);

  // Recalculate price quote whenever dates, guests, or extra prices change
  useEffect(() => {
    fetchQuote();
  }, [checkInDate, checkOutDate, guestCount, selectedExtraPrices]);

  const fetchQuote = async () => {
    if (!checkInDate || !checkOutDate) return;

    if (new Date(checkOutDate) <= new Date(checkInDate)) {
      setError('Check-out date must be after Check-in date.');
      setQuote(null);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await checkAvailability({
        propertyId: property.id,
        checkInDate,
        checkOutDate,
        guestCount,
        selectedExtraPrices
      });
      setQuote(res.data);
    } catch (err: any) {
      setError(err.message || 'Error checking availability for selected dates.');
      setQuote(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleExtraPrice = (extraId: number) => {
    if (selectedExtraPrices.includes(extraId)) {
      setSelectedExtraPrices(selectedExtraPrices.filter(id => id !== extraId));
    } else {
      setSelectedExtraPrices([...selectedExtraPrices, extraId]);
    }
  };

  const handlePayLaterBooking = async (token: string) => {
    const res = await fetchApi<{ data: { reservationId: string; grandTotal: number; status: string } }>('/payments/pay-later/create-reservation', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        propertyId: property.id,
        checkInDate,
        checkOutDate,
        guestCount,
        selectedExtraPrices
      })
    });
    if (res.data?.reservationId) {
      setPayLaterSuccessData(res.data);
    }
  };

  // Direct Desktop Booking/Payment Submission
  const handleDesktopBookSubmit = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('pocono_token') : null;
    if (!token) {
      setAuthIntent('desktop');
      setIsAuthModalOpen(true);
      return;
    }

    if (new Date(checkOutDate) <= new Date(checkInDate)) {
      setError('Check-out date must be after Check-in date.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (paymentGateway === 'stripe') {
        const res = await fetchApi<{ data: { checkoutUrl: string } }>('/payments/stripe/create-checkout-session', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            propertyId: property.id,
            checkInDate,
            checkOutDate,
            guestCount,
            selectedExtraPrices
          })
        });
        if (res.data?.checkoutUrl) {
          window.location.href = res.data.checkoutUrl;
          return;
        }
      } else if (paymentGateway === 'paypal') {
        const res = await fetchApi<{ data: { orderId: string; reservationId: string } }>('/payments/paypal/create-order', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            propertyId: property.id,
            checkInDate,
            checkOutDate,
            guestCount,
            selectedExtraPrices
          })
        });
        if (res.data?.orderId && res.data?.reservationId) {
          await fetchApi('/payments/paypal/capture-order', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              orderId: res.data.orderId,
              reservationId: res.data.reservationId
            })
          });
          setBookingSuccess(true);
          return;
        }
      } else if (paymentGateway === 'pay_later') {
        await handlePayLaterBooking(token);
        return;
      }

      await createReservation({
        propertyId: property.id,
        checkInDate,
        checkOutDate,
        guestCount,
        selectedExtraPrices
      }, token);
      setBookingSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Booking submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Mobile Floating CTA Click Handler
  const handleMobileBookNowClick = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('pocono_token') : null;
    if (!token) {
      setAuthIntent('mobile');
      setIsAuthModalOpen(true);
    } else {
      setIsBookingModalOpen(true);
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false);
    if (authIntent === 'mobile') {
      setIsBookingModalOpen(true);
    } else {
      // Continue direct desktop booking submission after login
      handleDesktopBookSubmit();
    }
  };

  // Calculate local fallback nights & price calculation if quote is loading
  const nightsCount = checkInDate && checkOutDate && new Date(checkOutDate) > new Date(checkInDate)
    ? Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const nightlyRate = Number(property.nightlyPrice || 0);
  const cleaningFee = Number(property.cleaningFee || 0);
  const securityDeposit = Number(property.securityDeposit || 0);
  const baseSubtotal = nightlyRate * nightsCount;

  return (
    <>
      <div className="hidden md:block bg-white border border-gray-200 p-6 rounded-2xl shadow-xl space-y-6 text-[#2b2b2b]">
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

        {/* ============================================================ */}
        {/* DIRECT DESKTOP BOOKING & PAYMENT SECTION                     */}
        {/* ============================================================ */}
        {payLaterSuccessData ? (
          /* Pay Later Success State */
          <div className="bg-white border border-amber-300 p-5 rounded-2xl text-center space-y-3 shadow-lg">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#2b2b2b]">Reservation Submitted</h3>
            <p className="text-gray-600 text-xs font-medium leading-relaxed">
              Your reservation request for <span className="text-[#f15e75] font-extrabold">{property.title}</span> has been created and is awaiting payment verification.
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-xs text-left space-y-2 text-gray-700">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-500">Reservation ID:</span>
                <span className="font-mono font-bold text-[#2b2b2b]">#{payLaterSuccessData.reservationId.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-500">Dates:</span>
                <span className="font-bold text-[#2b2b2b]">{checkInDate} → {checkOutDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-500">Total Amount:</span>
                <span className="font-bold text-[#f15e75]">${payLaterSuccessData.grandTotal}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-500">Payment Status:</span>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold rounded uppercase">
                  Pending Payment
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-500">Payment Deadline:</span>
                <span className="font-bold text-[#f15e75]">{deadlineHours} Hours</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200/70 rounded-xl text-left text-amber-900 text-xs leading-relaxed font-medium">
              <span className="font-bold block mb-0.5 text-amber-950">Guest Instructions:</span>
              <span>{payLaterInstructions}</span>
            </div>

            <button
              type="button"
              onClick={() => router.push('/dashboard?tab=reservations')}
              className="w-full py-3 bg-[#f15e75] hover:bg-[#d94f64] text-white font-extrabold text-xs rounded-xl shadow-md transition-all uppercase tracking-wider cursor-pointer"
            >
              Go to My Reservations
            </button>
          </div>
        ) : bookingSuccess ? (
          /* Stripe / PayPal Success State */
          <div className="bg-white border border-[#f15e75]/40 p-5 rounded-2xl text-center space-y-3 shadow-lg">
            <CheckCircle className="w-10 h-10 text-[#f15e75] mx-auto" />
            <h3 className="text-lg font-bold text-[#2b2b2b]">Payment Received</h3>
            <p className="text-gray-600 text-xs font-medium">
              Your payment for <span className="text-[#f15e75] font-semibold">{property.title}</span> has been received successfully. Your reservation is pending verification.
            </p>
            <button
              type="button"
              onClick={() => router.push('/dashboard?tab=reservations')}
              className="w-full py-3 bg-[#f15e75] hover:bg-[#f58d9d] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
            >
              Go to My Dashboard
            </button>
          </div>
        ) : (
          /* MAIN DIRECT BOOKING & PAYMENT FORM */
          <div className="space-y-4 pt-2 border-t border-gray-100">
            {/* Date Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-gray-500 font-extrabold uppercase mb-1">
                  Check-in Date *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-[#2b2b2b] rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#f15e75] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-gray-500 font-extrabold uppercase mb-1">
                  Check-out Date *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-[#2b2b2b] rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#f15e75] focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Guest Selector */}
            <div>
              <label className="block text-[11px] text-gray-500 font-extrabold uppercase mb-1">
                Number of Guests *
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                <select
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 text-[#2b2b2b] rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#f15e75] focus:bg-white"
                >
                  {Array.from({ length: property.maxGuests || 10 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>{num} Guest{num > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Extra Services & Add-ons */}
            {property.extraPrices && property.extraPrices.length > 0 && (
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <label className="block text-[11px] text-gray-500 font-extrabold uppercase">
                  Extra Services &amp; Add-ons
                </label>
                <div className="space-y-1.5">
                  {property.extraPrices.map((extra: any) => (
                    <label key={extra.id} className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedExtraPrices.includes(extra.id)}
                          onChange={() => toggleExtraPrice(extra.id)}
                          className="accent-[#f15e75] w-3.5 h-3.5 rounded"
                        />
                        <span>{extra.name}</span>
                      </div>
                      <span className="text-[#f15e75] font-extrabold">+${extra.price}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Price Breakdown Quote */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2.5 text-xs">
              <h4 className="font-extrabold text-[#2b2b2b] uppercase text-[11px] tracking-wider border-b border-gray-200 pb-1.5">
                Price Breakdown ({nightsCount} Night{nightsCount === 1 ? '' : 's'})
              </h4>

              {quote && quote.pricingBreakdown ? (
                <div className="space-y-1.5 text-gray-600">
                  <div className="flex justify-between">
                    <span>${property.nightlyPrice} × {quote.totalNights} nights</span>
                    <span className="font-bold text-[#2b2b2b]">${quote.pricingBreakdown.baseTotal}</span>
                  </div>
                  {quote.pricingBreakdown.cleaningFee > 0 && (
                    <div className="flex justify-between">
                      <span>Cleaning Fee</span>
                      <span className="font-bold text-[#2b2b2b]">${quote.pricingBreakdown.cleaningFee}</span>
                    </div>
                  )}
                  {quote.pricingBreakdown.securityDeposit > 0 && (
                    <div className="flex justify-between">
                      <span>Refundable Deposit</span>
                      <span className="font-bold text-[#2b2b2b]">${quote.pricingBreakdown.securityDeposit}</span>
                    </div>
                  )}
                  {quote.pricingBreakdown.cityFee > 0 && (
                    <div className="flex justify-between">
                      <span>Resort / City Fee</span>
                      <span className="font-bold text-[#2b2b2b]">${quote.pricingBreakdown.cityFee}</span>
                    </div>
                  )}
                  {quote.pricingBreakdown.extraPricesTotal > 0 && (
                    <div className="flex justify-between text-[#f15e75] font-bold">
                      <span>Extra add-ons</span>
                      <span>+${quote.pricingBreakdown.extraPricesTotal}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-2 border-t border-gray-200 text-sm font-extrabold text-[#2b2b2b]">
                    <span>Total</span>
                    <span className="text-[#f15e75] text-base">${quote.pricingBreakdown.grandTotal}</span>
                  </div>
                </div>
              ) : (
                /* Fallback Local Calculation */
                <div className="space-y-1.5 text-gray-600">
                  <div className="flex justify-between">
                    <span>${nightlyRate} × {nightsCount} nights</span>
                    <span className="font-bold text-[#2b2b2b]">${baseSubtotal}</span>
                  </div>
                  {cleaningFee > 0 && (
                    <div className="flex justify-between">
                      <span>Cleaning Fee</span>
                      <span className="font-bold text-[#2b2b2b]">${cleaningFee}</span>
                    </div>
                  )}
                  {securityDeposit > 0 && (
                    <div className="flex justify-between">
                      <span>Refundable Deposit</span>
                      <span className="font-bold text-[#2b2b2b]">${securityDeposit}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-2 border-t border-gray-200 text-sm font-extrabold text-[#2b2b2b]">
                    <span>Total</span>
                    <span className="text-[#f15e75] text-base">${baseSubtotal + cleaningFee + securityDeposit}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2 border-t border-gray-100 pt-3">
              <label className="block text-[11px] text-gray-500 font-extrabold uppercase">
                Select Payment Method *
              </label>

              {enabledCount === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Payment methods are currently unavailable. Please contact support.</span>
                </div>
              ) : (
                <div className={`grid gap-2 ${enabledCount === 3 ? 'grid-cols-3' : enabledCount === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {stripeEnabled && (
                    <button
                      type="button"
                      onClick={() => setPaymentGateway('stripe')}
                      className={`py-2.5 px-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        paymentGateway === 'stripe'
                          ? 'bg-[#f15e75]/10 border-[#f15e75] text-[#f15e75] ring-2 ring-[#f15e75]/20'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:text-[#2b2b2b]'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Stripe</span>
                    </button>
                  )}

                  {paypalEnabled && (
                    <button
                      type="button"
                      onClick={() => setPaymentGateway('paypal')}
                      className={`py-2.5 px-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        paymentGateway === 'paypal'
                          ? 'bg-amber-500/10 border-amber-500 text-amber-600 ring-2 ring-amber-500/20'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:text-[#2b2b2b]'
                      }`}
                    >
                      <span className="font-extrabold italic text-sm">P</span>
                      <span>PayPal</span>
                    </button>
                  )}

                  {payLaterEnabled && (
                    <button
                      type="button"
                      onClick={() => setPaymentGateway('pay_later')}
                      className={`py-2.5 px-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        paymentGateway === 'pay_later'
                          ? 'bg-sky-500/10 border-sky-500 text-sky-600 ring-2 ring-sky-500/20'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:text-[#2b2b2b]'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Pay Later</span>
                    </button>
                  )}
                </div>
              )}

              {paymentGateway === 'pay_later' && payLaterEnabled && (
                <div className="mt-2 p-3 bg-sky-50 border border-sky-200 rounded-xl text-sky-950 text-xs leading-relaxed font-medium space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-sky-800">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Pay Later Policy</span>
                  </div>
                  <p>{payLaterInstructions}</p>
                  <p className="text-[11px] text-sky-700 font-extrabold pt-0.5">
                    ⏱ Deadline: {deadlineHours} Hours to submit payment proof.
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Direct Payment / Reservation Action Button */}
            <button
              type="button"
              onClick={handleDesktopBookSubmit}
              disabled={loading || (quote && !quote.isAvailable) || enabledCount === 0 || !paymentGateway || nightsCount <= 0}
              className="w-full py-4 bg-[#f15e75] hover:bg-[#d94f64] disabled:opacity-50 text-white font-extrabold rounded-xl shadow-lg shadow-[#f15e75]/30 transition-all text-xs sm:text-sm uppercase tracking-wider cursor-pointer"
            >
              {loading
                ? 'Processing Request...'
                : quote && !quote.isAvailable
                ? 'Dates Not Available'
                : paymentGateway === 'stripe'
                ? 'Pay with Stripe Sandbox'
                : paymentGateway === 'paypal'
                ? 'Pay with PayPal Sandbox'
                : 'Submit Pay Later Request'}
            </button>

            <p className="text-[11px] text-center text-gray-500 font-medium">
              Server-Validated Pricing • SSL Encrypted Checkout
            </p>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MOBILE-ONLY FLOATING BOOK NOW CTA                            */}
      {/* ============================================================ */}
      <div className="fixed bottom-5 right-4 z-40 md:hidden flex items-center">
        <button
          type="button"
          onClick={handleMobileBookNowClick}
          aria-label={`Book ${property?.title || 'property'} now`}
          className="flex items-center gap-2 px-5 py-3.5 bg-[#f15e75] hover:bg-[#d94f64] active:scale-95 text-white font-extrabold text-xs uppercase tracking-wider rounded-full shadow-2xl shadow-[#f15e75]/50 border border-white/30 transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#f15e75]/50 cursor-pointer"
        >
          <Calendar className="w-4 h-4 shrink-0" />
          <span>Book Now</span>
          {property?.nightlyPrice && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[11px] font-bold ml-0.5">
              ${property.nightlyPrice}/nt
            </span>
          )}
        </button>
      </div>

      {/* Auth Modal for Logged-out users */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        customSubtitle="Please login to continue with your booking."
      />

      {/* Booking & Payment Modal (Preserved for Mobile Flow) */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        property={property}
      />
    </>
  );
}
