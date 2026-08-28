'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Users, ShieldCheck, CheckCircle, AlertCircle, CreditCard, Clock } from 'lucide-react';
import { checkAvailability, createReservation, fetchApi } from '@/lib/api';
import { useSiteSettings } from '@/context/SiteSettingsContext';

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

  const [checkInDate, setCheckInDate] = useState('2026-09-10');
  const [checkOutDate, setCheckOutDate] = useState('2026-09-13');
  const [guestCount, setGuestCount] = useState(2);
  const [selectedExtraPrices, setSelectedExtraPrices] = useState<number[]>([]);
  const [paymentGateway, setPaymentGateway] = useState<'stripe' | 'paypal' | 'pay_later' | null>(getInitialGateway());
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [error, setError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [payLaterSuccessData, setPayLaterSuccessData] = useState<any>(null);

  useEffect(() => {
    const validGw = getInitialGateway();
    if (validGw !== paymentGateway) {
      setPaymentGateway(validGw);
    }
  }, [stripeEnabled, paypalEnabled, payLaterEnabled, defaultGateway]);

  useEffect(() => {
    fetchQuote();
  }, [checkInDate, checkOutDate, guestCount, selectedExtraPrices]);

  const fetchQuote = async () => {
    if (!checkInDate || !checkOutDate) return;
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
      setError(err.message || 'Error checking availability');
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

  const handleBook = async () => {
    const token = localStorage.getItem('pocono_token');
    if (!token) {
      router.push('/login');
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
      setError(err.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  // Pay Later Success State
  if (payLaterSuccessData) {
    return (
      <div className="bg-white border border-amber-300 p-6 rounded-2xl text-center space-y-4 shadow-xl">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-[#2b2b2b]">Reservation Request Submitted</h3>
        <p className="text-gray-600 text-xs font-medium leading-relaxed">
          Your reservation request for <span className="text-[#f15e75] font-extrabold">{property.title}</span> has been created and is awaiting payment verification.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-xs text-left space-y-1.5 text-gray-700">
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
            <span className="font-semibold text-gray-500">Payment Method:</span>
            <span className="font-bold text-[#2b2b2b]">Pay Later</span>
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

        <p className="text-[11px] text-gray-500">
          Please upload your payment receipt via the Guest Dashboard to complete verification.
        </p>

        <button
          onClick={() => router.push('/dashboard?tab=reservations')}
          className="w-full py-3 bg-[#f15e75] hover:bg-[#d94f64] text-white font-extrabold text-xs rounded-xl shadow-md transition-all uppercase tracking-wider"
        >
          Go to My Reservations
        </button>
      </div>
    );
  }

  // Stripe / PayPal Success State
  if (bookingSuccess) {
    return (
      <div className="bg-white border border-[#f15e75]/40 p-6 rounded-2xl text-center space-y-4 shadow-xl">
        <CheckCircle className="w-12 h-12 text-[#f15e75] mx-auto" />
        <h3 className="text-xl font-bold text-[#2b2b2b]">Payment Received — Awaiting Verification</h3>
        <p className="text-gray-600 text-sm font-medium">
          Your payment for <span className="text-[#f15e75] font-semibold">{property.title}</span> has been received successfully. Your reservation is now pending Admin verification.
        </p>
        <button
          onClick={() => router.push('/dashboard?tab=reservations')}
          className="w-full py-3 bg-[#f15e75] hover:bg-[#f58d9d] text-white font-bold rounded-xl shadow-md"
        >
          Go to My Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-xl space-y-6 text-[#2b2b2b]">
      {/* Price Header */}
      <div className="flex justify-between items-baseline border-b border-gray-100 pb-4">
        <div>
          <span className="text-3xl font-extrabold text-[#2b2b2b]">${property.nightlyPrice}</span>
          <span className="text-gray-500 text-sm font-medium"> / night</span>
        </div>
        {property.instantBook && (
          <span className="px-2.5 py-1 bg-[#f15e75]/10 text-[#f15e75] font-extrabold text-xs rounded-md border border-[#f15e75]/20">
            ⚡ Instant Book
          </span>
        )}
      </div>

      {/* Dates Input */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-gray-500 font-extrabold uppercase mb-1">Check-in</label>
            <input
              type="date"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-[#2b2b2b] rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#f15e75] focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 font-extrabold uppercase mb-1">Check-out</label>
            <input
              type="date"
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-[#2b2b2b] rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#f15e75] focus:bg-white"
            />
          </div>
        </div>

        {/* Guest Select */}
        <div>
          <label className="block text-[10px] text-gray-500 font-extrabold uppercase mb-1">Guests</label>
          <select
            value={guestCount}
            onChange={(e) => setGuestCount(Number(e.target.value))}
            className="w-full bg-gray-50 border border-gray-200 text-[#2b2b2b] rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#f15e75] focus:bg-white"
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
          <label className="block text-[10px] text-gray-500 font-extrabold uppercase">Extra Services & Add-ons</label>
          <div className="space-y-1.5">
            {property.extraPrices.map((extra: any) => (
              <label key={extra.id} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedExtraPrices.includes(extra.id)}
                    onChange={() => toggleExtraPrice(extra.id)}
                    className="accent-[#f15e75] rounded"
                  />
                  <span>{extra.name}</span>
                </div>
                <span className="text-[#f15e75] font-extrabold">+${extra.price}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Price Quote Breakdown */}
      {quote && quote.pricingBreakdown && (
        <div className="space-y-2 border-t border-gray-100 pt-3 text-xs">
          <div className="flex justify-between text-gray-600">
            <span>${property.nightlyPrice} x {quote.totalNights} nights</span>
            <span className="font-semibold text-[#2b2b2b]">${quote.pricingBreakdown.baseTotal}</span>
          </div>
          {quote.pricingBreakdown.cleaningFee > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Cleaning Fee</span>
              <span className="font-semibold text-[#2b2b2b]">${quote.pricingBreakdown.cleaningFee}</span>
            </div>
          )}
          {quote.pricingBreakdown.cityFee > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Resort / City Fee</span>
              <span className="font-semibold text-[#2b2b2b]">${quote.pricingBreakdown.cityFee}</span>
            </div>
          )}
          {quote.pricingBreakdown.serviceFee > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Service Fee</span>
              <span className="font-semibold text-[#2b2b2b]">${quote.pricingBreakdown.serviceFee}</span>
            </div>
          )}
          {quote.pricingBreakdown.taxesTotal > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Taxes</span>
              <span className="font-semibold text-[#2b2b2b]">${quote.pricingBreakdown.taxesTotal}</span>
            </div>
          )}
          {quote.pricingBreakdown.extraPricesTotal > 0 && (
            <div className="flex justify-between text-[#f15e75] font-bold">
              <span>Extra add-ons / Parking</span>
              <span>+${quote.pricingBreakdown.extraPricesTotal}</span>
            </div>
          )}
          {quote.pricingBreakdown.securityDeposit > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>Refundable Deposit</span>
              <span>${quote.pricingBreakdown.securityDeposit}</span>
            </div>
          )}

          <div className="flex justify-between pt-3 border-t border-gray-100 text-sm font-extrabold text-[#2b2b2b]">
            <span>Total</span>
            <span className="text-[#f15e75]">${quote.pricingBreakdown.grandTotal}</span>
          </div>
        </div>
      )}

      {/* Payment Gateway Options */}
      <div className="space-y-2 border-t border-gray-100 pt-3">
        <label className="block text-[10px] text-gray-500 font-extrabold uppercase">Select Payment Method</label>
        
        {enabledCount === 0 ? (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Payment methods are currently unavailable. Please contact support for assistance.</span>
          </div>
        ) : (
          <div className={`grid gap-2 ${enabledCount === 3 ? 'grid-cols-3' : enabledCount === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {stripeEnabled && (
              <button
                type="button"
                onClick={() => setPaymentGateway('stripe')}
                className={`py-2 px-2 text-[11px] font-bold rounded-xl border flex items-center justify-center gap-1 transition-all ${
                  paymentGateway === 'stripe'
                    ? 'bg-[#f15e75]/10 border-[#f15e75] text-[#f15e75]'
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
                className={`py-2 px-2 text-[11px] font-bold rounded-xl border flex items-center justify-center gap-1 transition-all ${
                  paymentGateway === 'paypal'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-600'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:text-[#2b2b2b]'
                }`}
              >
                <span className="font-extrabold italic">P</span>
                <span>PayPal</span>
              </button>
            )}

            {payLaterEnabled && (
              <button
                type="button"
                onClick={() => setPaymentGateway('pay_later')}
                className={`py-2 px-2 text-[11px] font-bold rounded-xl border flex items-center justify-center gap-1 transition-all ${
                  paymentGateway === 'pay_later'
                    ? 'bg-sky-500/10 border-sky-500 text-sky-600'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:text-[#2b2b2b]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pay Later</span>
              </button>
            )}
          </div>
        )}

        {/* Dynamic Pay Later Instructions */}
        {paymentGateway === 'pay_later' && payLaterEnabled && (
          <div className="mt-2.5 p-3 bg-sky-50 border border-sky-200 rounded-xl text-sky-950 text-[11px] leading-relaxed font-medium space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-sky-800">
              <Clock className="w-3.5 h-3.5" />
              <span>Pay Later Policy & Instructions</span>
            </div>
            <p>{payLaterInstructions}</p>
            <p className="text-[10px] text-sky-700 font-extrabold pt-0.5">
              ⏱ Payment Proof Deadline: {deadlineHours} Hours after reservation.
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

      {/* Book Button */}
      <button
        onClick={handleBook}
        disabled={loading || (quote && !quote.isAvailable) || enabledCount === 0 || !paymentGateway}
        className="w-full py-3.5 bg-[#f15e75] hover:bg-[#f58d9d] disabled:opacity-50 text-white font-extrabold rounded-xl shadow-lg shadow-[#f15e75]/30 transition-all text-xs uppercase tracking-wider"
      >
        {loading
          ? 'Processing...'
          : enabledCount === 0
          ? 'Payment Methods Unavailable'
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
  );
}
