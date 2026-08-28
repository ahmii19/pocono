'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getAdminReservationById,
  updateAdminReservationStatus,
  verifyPaymentProofAdmin,
  rejectPaymentProofAdmin,
  updateAdminPaymentVerificationStatus
} from '@/lib/api';
import {
  ArrowLeft, Calendar, Building2, User as UserIcon, DollarSign,
  CheckCircle2, AlertCircle, ExternalLink, Clock, ShieldCheck, Check, X, Eye, Upload, FileText, RefreshCw, CreditCard, AlertTriangle
} from 'lucide-react';

export default function AdminReservationDetailPage() {
  const params = useParams();
  const reservationId = params.id as string;

  const [reservation, setReservation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [selectedVerificationStatus, setSelectedVerificationStatus] = useState<string>('NOT_SUBMITTED');
  const [manualVerificationModalOpen, setManualVerificationModalOpen] = useState(false);

  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [processingVerification, setProcessingVerification] = useState(false);
  const [toastNotification, setToastNotification] = useState<{ title: string; message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchReservation();
  }, [reservationId]);

  const fetchReservation = async () => {
    setLoading(true);
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    try {
      const res = await getAdminReservationById(reservationId, token);
      setReservation(res.data);
      if (res.data?.paymentVerificationStatus) {
        setSelectedVerificationStatus(res.data.paymentVerificationStatus);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load reservation details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setError('');
    setSuccess('');
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    try {
      await updateAdminReservationStatus(reservationId, newStatus, token);
      setSuccess(`Reservation status updated to ${newStatus} successfully!`);
      setTimeout(() => setSuccess(''), 4000);
      await fetchReservation();
    } catch (err: any) {
      setError(err.message || 'Error updating status');
    }
  };

  const showToast = (title: string, message: string, type: 'success' | 'error') => {
    setToastNotification({ title, message, type });
    setTimeout(() => {
      setToastNotification(null);
    }, 6000);
  };

  const handleConfirmVerify = async () => {
    if (processingVerification) return;
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    setProcessingVerification(true);
    setError('');
    setSuccess('');

    try {
      await verifyPaymentProofAdmin(reservationId, token);
      setVerifyModalOpen(false);
      showToast(
        'Payment Verified Successfully',
        'Reservation confirmed, invoice marked as PAID, and host earnings synchronized.',
        'success'
      );
      await fetchReservation();
    } catch (err: any) {
      const errMsg = err.message || 'Unable to verify payment. Please try again.';
      setError(errMsg);
      showToast('Payment Verification Failed', errMsg, 'error');
    } finally {
      setProcessingVerification(false);
    }
  };

  const handleConfirmReject = async () => {
    if (processingVerification) return;
    if (!rejectionReasonInput.trim()) {
      setError('Rejection reason is required.');
      return;
    }

    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    setProcessingVerification(true);
    setError('');
    setSuccess('');

    try {
      const res = await rejectPaymentProofAdmin(reservationId, rejectionReasonInput, token);
      setSuccess(res.message || 'Payment proof rejected successfully.');
      showToast('Payment Proof Rejected', 'Guest has been notified to upload replacement payment proof.', 'error');
      setRejectModalOpen(false);
      setRejectionReasonInput('');
      await fetchReservation();
    } catch (err: any) {
      const errMsg = err.message || 'Failed to reject payment proof.';
      setError(errMsg);
      showToast('Action Failed', errMsg, 'error');
    } finally {
      setProcessingVerification(false);
    }
  };

  const handleConfirmManualVerificationStatusChange = async () => {
    if (processingVerification) return;
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    setProcessingVerification(true);
    setError('');
    setSuccess('');

    try {
      await updateAdminPaymentVerificationStatus(reservationId, selectedVerificationStatus, token);
      setManualVerificationModalOpen(false);
      showToast(
        'Payment Verification Status Updated',
        `Payment verification status set to ${selectedVerificationStatus}. Reservation status and financial records remain unchanged.`,
        'success'
      );
      await fetchReservation();
    } catch (err: any) {
      const errMsg = err.message || 'Failed to update payment verification status.';
      setError(errMsg);
      showToast('Action Failed', errMsg, 'error');
    } finally {
      setProcessingVerification(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-[#4f5962] text-sm font-medium">Loading reservation detail from PostgreSQL...</div>;
  }

  if (!reservation) {
    return (
      <div className="p-8 bg-white border border-[#e5e7eb] rounded-md text-center space-y-4 shadow-sm max-w-2xl mx-auto">
        <AlertCircle className="w-8 h-8 text-[#f15e75] mx-auto" />
        <h2 className="text-xl font-bold text-[#2b2b2b]">Reservation Not Found</h2>
        <p className="text-xs text-[#6b7280]">No reservation record matching ID "{reservationId}" exists in PostgreSQL.</p>
        <Link
          href="/admin/reservations"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#f15e75] text-white rounded-md text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Reservations List</span>
        </Link>
      </div>
    );
  }

  const checkIn = new Date(reservation.checkInDate).toLocaleDateString();
  const checkOut = new Date(reservation.checkOutDate).toLocaleDateString();
  const guestName = (reservation.guest?.firstName || reservation.guest?.lastName)
    ? `${reservation.guest?.firstName || ''} ${reservation.guest?.lastName || ''}`.trim()
    : reservation.guest?.email;

  const hostName = (reservation.host?.firstName || reservation.host?.lastName)
    ? `${reservation.host?.firstName || ''} ${reservation.host?.lastName || ''}`.trim()
    : reservation.host?.email;

  const mainImage = reservation.property?.images?.[0]?.imageUrl || '/placeholder.jpg';

  const paymentRecord = reservation.payments?.[0];
  const invoiceRecord = reservation.invoices?.[0];
  const paymentGatewayName = paymentRecord?.gateway || (reservation.paymentMethod?.toUpperCase() || 'PAY_LATER');
  const paymentTxStatus = paymentRecord?.status || 'PENDING';
  const invoiceStatusText = invoiceRecord
    ? (invoiceRecord.paymentStatus === 1 ? 'PAID' : (invoiceRecord.paymentStatus === 2 ? 'FAILED' : 'PENDING'))
    : 'PENDING';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#e5e7eb] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/reservations"
            className="p-2 bg-white border border-[#e5e7eb] text-[#4f5962] hover:text-[#f15e75] rounded-md transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-[#2b2b2b]">Booking Detail</h1>
              <span
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                  reservation.status === 'CONFIRMED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : reservation.status === 'CANCELLED'
                    ? 'bg-[#fff1f3] text-[#f15e75] border border-[#f15e75]/30'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {reservation.status}
              </span>
            </div>
            <p className="text-xs text-[#6b7280]">PostgreSQL Reservation ID: {reservation.id}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#fff1f3] border border-[#f15e75]/30 text-[#f15e75] rounded-md text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* TOP DUAL STATUS CONTROL CARDS - Reservation Status & Payment Verification Status side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CARD A: RESERVATION STATUS DROPDOWN */}
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b border-[#e5e7eb] pb-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#f15e75]" />
              <h3 className="text-xs font-extrabold text-[#2b2b2b] uppercase tracking-wider">
                Reservation Status
              </h3>
            </div>
            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
              reservation.status === 'CONFIRMED'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : reservation.status === 'CANCELLED'
                ? 'bg-[#fff1f3] text-[#f15e75] border border-[#f15e75]/30'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {reservation.status}
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-[#6b7280] font-extrabold uppercase block">
              Reservation Status Dropdown
            </label>
            <select
              value={reservation.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#f15e75]"
            >
              <option value="PENDING">PENDING</option>
              <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="PAID">PAID</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="FAILED">FAILED</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>
            <p className="text-[10px] text-gray-500 italic">
              Updates reservation lifecycle status in PostgreSQL independently.
            </p>
          </div>
        </div>

        {/* CARD B: PAYMENT VERIFICATION STATUS DROPDOWN */}
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b border-[#e5e7eb] pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#f15e75]" />
              <h3 className="text-xs font-extrabold text-[#2b2b2b] uppercase tracking-wider">
                Payment Verification Status
              </h3>
            </div>
            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
              reservation.paymentVerificationStatus === 'VERIFIED'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : reservation.paymentVerificationStatus === 'SUBMITTED'
                ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                : reservation.paymentVerificationStatus === 'REJECTED'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-gray-100 text-gray-700 border border-gray-200'
            }`}>
              {reservation.paymentVerificationStatus || 'NOT_SUBMITTED'}
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-[#6b7280] font-extrabold uppercase block">
              Payment Verification Status Dropdown
            </label>
            <div className="flex gap-2">
              <select
                value={selectedVerificationStatus}
                onChange={(e) => setSelectedVerificationStatus(e.target.value)}
                className="flex-1 bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#f15e75]"
              >
                <option value="NOT_SUBMITTED">NOT_SUBMITTED</option>
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="VERIFIED">VERIFIED</option>
                <option value="REJECTED">REJECTED</option>
              </select>

              <button
                onClick={() => setManualVerificationModalOpen(true)}
                disabled={processingVerification || selectedVerificationStatus === reservation.paymentVerificationStatus}
                className="px-4 py-2 bg-[#f15e75] hover:bg-[#d94f64] disabled:opacity-40 text-white font-extrabold text-xs rounded-md shadow transition-all cursor-pointer shrink-0 flex items-center gap-1"
              >
                {processingVerification ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Update Verification Status</span>
                )}
              </button>
            </div>
            <p className="text-[10px] text-gray-500 italic">
              ℹ Changing Payment Verification Status does not automatically change Reservation Status, Payment, Invoice, or Host Earnings.
            </p>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="md:col-span-2 space-y-6">

          {/* FINANCIAL & PAYMENT GATEWAY STATUS (INFORMATIONAL) */}
          <div className="bg-white border border-[#e5e7eb] rounded-md p-5 shadow-sm space-y-3 text-xs text-[#4f5962]">
            <h3 className="text-sm font-extrabold text-[#2b2b2b] border-b border-[#e5e7eb] pb-2 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#f15e75]" />
              <span>Financial &amp; Payment Gateway Status (Informational)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-gray-50 rounded border border-gray-200 space-y-1">
                <span className="text-[10px] text-[#6b7280] font-bold uppercase block">Payment Gateway</span>
                <span className="font-extrabold text-xs text-[#2b2b2b] uppercase">{paymentGatewayName}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded border border-gray-200 space-y-1">
                <span className="text-[10px] text-[#6b7280] font-bold uppercase block">Payment Transaction Status</span>
                <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded uppercase inline-block ${
                  paymentTxStatus === 'COMPLETED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : paymentTxStatus === 'REFUNDED'
                    ? 'bg-purple-100 text-purple-800'
                    : paymentTxStatus === 'FAILED'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {paymentTxStatus}
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded border border-gray-200 space-y-1">
                <span className="text-[10px] text-[#6b7280] font-bold uppercase block">Invoice Status</span>
                <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded uppercase inline-block ${
                  invoiceStatusText === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800'
                    : invoiceStatusText === 'FAILED'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {invoiceStatusText}
                </span>
              </div>
            </div>
          </div>

          {/* PAYMENT VERIFICATION PROOF DETAILS & ACTIONS */}
          <div className="bg-white border border-[#e5e7eb] rounded-md p-6 shadow-sm space-y-4 text-xs text-[#4f5962]">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-[#e5e7eb] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#f15e75]" />
                <h3 className="text-base font-extrabold text-[#2b2b2b]">Payment Verification Proof Details</h3>
              </div>
              <span className={`px-3 py-1 text-xs font-extrabold rounded-full uppercase ${
                reservation.paymentVerificationStatus === 'VERIFIED'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : reservation.paymentVerificationStatus === 'SUBMITTED'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                  : reservation.paymentVerificationStatus === 'REJECTED'
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : 'bg-gray-100 text-gray-700 border border-gray-200'
              }`}>
                {reservation.paymentVerificationStatus || 'NOT_SUBMITTED'}
              </span>
            </div>

            {/* Proof Submission Data */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] text-[#6b7280] font-bold uppercase block">Transaction / Reference ID</span>
                  <span className="font-mono text-xs font-bold text-[#2b2b2b]">
                    {reservation.paymentTransactionId || 'N/A'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-[#6b7280] font-bold uppercase block">Submission Timestamp</span>
                  <span className="text-xs font-semibold text-[#2b2b2b]">
                    {reservation.paymentSubmittedAt ? new Date(reservation.paymentSubmittedAt).toLocaleString() : 'N/A'}
                  </span>
                </div>

                {reservation.paymentNote && (
                  <div>
                    <span className="text-[10px] text-[#6b7280] font-bold uppercase block">Guest Payment Note</span>
                    <p className="text-xs bg-gray-50 p-2 rounded border border-gray-200 text-[#4f5962]">
                      "{reservation.paymentNote}"
                    </p>
                  </div>
                )}

                {reservation.paymentVerificationStatus === 'VERIFIED' && reservation.paymentVerifiedBy && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 space-y-0.5">
                    <p className="font-bold text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Verified by Admin:</span>
                    </p>
                    <p className="text-[11px] font-medium">{reservation.paymentVerifiedBy.firstName} {reservation.paymentVerifiedBy.lastName} ({reservation.paymentVerifiedBy.email})</p>
                    <p className="text-[10px] text-emerald-600 font-mono">{new Date(reservation.paymentVerifiedAt).toLocaleString()}</p>
                  </div>
                )}

                {reservation.paymentVerificationStatus === 'REJECTED' && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 space-y-1">
                    <p className="font-bold text-xs flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Rejection Reason:</span>
                    </p>
                    <p className="text-xs font-medium bg-white/80 p-2 rounded border border-rose-200">{reservation.paymentRejectionReason}</p>
                    {reservation.paymentRejectedBy && (
                      <p className="text-[10px] text-rose-600">Rejected by Admin: {reservation.paymentRejectedBy.email} on {new Date(reservation.paymentRejectedAt).toLocaleString()}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Proof Image Preview */}
              <div className="space-y-2">
                <span className="text-[10px] text-[#6b7280] font-bold uppercase block">Payment Screenshot / Receipt</span>
                {reservation.paymentProofUrl ? (
                  <div className="relative group rounded-md overflow-hidden border border-[#d8dce1] bg-gray-100 max-h-48 flex items-center justify-center">
                    <img
                      src={reservation.paymentProofUrl}
                      alt="Payment Proof Screenshot"
                      className="max-h-48 w-full object-contain cursor-pointer transition-transform group-hover:scale-105"
                      onClick={() => setImageModalOpen(true)}
                    />
                    <div
                      onClick={() => setImageModalOpen(true)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Click to enlarge</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-gray-50 border border-dashed border-[#d8dce1] rounded-md text-center text-[#9ca3af] space-y-1">
                    <FileText className="w-8 h-8 mx-auto text-gray-300" />
                    <p className="text-xs font-semibold">No payment proof uploaded yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Admin Action A: Full Approval & Verification Workflow */}
            <div className="pt-3 border-t border-[#e5e7eb] flex flex-wrap gap-3 justify-between items-center">
              <div className="text-[11px] text-gray-500 font-semibold">
                Action A: Approve &amp; Verify (Full Confirmation Workflow)
              </div>
              <div className="flex flex-wrap gap-2">
                {reservation.paymentVerificationStatus !== 'VERIFIED' && (
                  <button
                    onClick={() => setRejectModalOpen(true)}
                    disabled={processingVerification}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 border border-rose-200 font-extrabold text-xs rounded-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject Payment Proof</span>
                  </button>
                )}

                {reservation.paymentVerificationStatus === 'VERIFIED' ? (
                  <div className="px-4 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 font-extrabold text-xs rounded-md flex items-center gap-2 cursor-default select-none">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Payment Verified &amp; Booking Confirmed</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setVerifyModalOpen(true)}
                    disabled={processingVerification}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-md shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {processingVerification ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                        <span>Verifying Payment...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 shrink-0" />
                        <span>Approve &amp; Verify Payment</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stay Overview Card */}
          <div className="bg-white border border-[#e5e7eb] rounded-md p-6 shadow-sm space-y-4 text-xs text-[#4f5962]">
            <h3 className="text-sm font-extrabold text-[#2b2b2b] border-b border-[#e5e7eb] pb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#f15e75]" />
              <span>Stay &amp; Schedule Details</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-[10px] text-[#6b7280] font-bold block uppercase">Check-in</span>
                <span className="text-sm font-extrabold text-[#2b2b2b]">{checkIn}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#6b7280] font-bold block uppercase">Check-out</span>
                <span className="text-sm font-extrabold text-[#2b2b2b]">{checkOut}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#6b7280] font-bold block uppercase">Total Nights</span>
                <span className="text-sm font-extrabold text-[#2b2b2b]">{reservation.totalNights} Nights</span>
              </div>
              <div>
                <span className="text-[10px] text-[#6b7280] font-bold block uppercase">Guests</span>
                <span className="text-sm font-extrabold text-[#2b2b2b]">{reservation.guestCount} Guests</span>
              </div>
            </div>
          </div>

          {/* Historical Price Breakdown */}
          <div className="bg-white border border-[#e5e7eb] rounded-md p-6 shadow-sm space-y-4 text-xs text-[#4f5962]">
            <div className="flex justify-between items-center border-b border-[#e5e7eb] pb-2">
              <h3 className="text-sm font-extrabold text-[#2b2b2b] flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#f15e75]" />
                <span>Historical Itemized Price Breakdown</span>
              </h3>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                Immutable Ledger Record
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-[#f8fafc]">
                <span>Base Accommodation ({reservation.totalNights} nights)</span>
                <span className="font-bold text-[#2b2b2b]">${Number(reservation.baseTotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#f8fafc]">
                <span>Cleaning Fee</span>
                <span className="font-bold text-[#2b2b2b]">${Number(reservation.cleaningFee || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#f8fafc]">
                <span>City &amp; Resort Fee</span>
                <span className="font-bold text-[#2b2b2b]">${Number(reservation.cityFee || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#f8fafc]">
                <span>Service &amp; Processing Fee</span>
                <span className="font-bold text-[#2b2b2b]">${Number(reservation.serviceFee || 0).toFixed(2)}</span>
              </div>
              {Number(reservation.extraPricesTotal || 0) > 0 && (
                <div className="flex justify-between py-1 border-b border-[#f8fafc]">
                  <span>Extra Add-ons</span>
                  <span className="font-bold text-[#2b2b2b]">${Number(reservation.extraPricesTotal).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-[#f8fafc]">
                <span>Taxes</span>
                <span className="font-bold text-[#2b2b2b]">${Number(reservation.taxesTotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 pt-3 text-sm border-t border-[#e5e7eb] font-extrabold text-[#2b2b2b]">
                <span>Grand Total Paid / Agreed</span>
                <span className="text-lg text-[#f15e75]">${Number(reservation.grandTotal).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Property & People Cards */}
        <div className="space-y-6 text-xs text-[#4f5962]">
          {/* Property Card */}
          <div className="bg-white border border-[#e5e7eb] rounded-md p-5 shadow-sm space-y-3">
            <h4 className="font-extrabold text-[#2b2b2b] uppercase tracking-wider text-[11px] border-b border-[#e5e7eb] pb-2">
              Booked Property
            </h4>
            {reservation.property ? (
              <div className="space-y-3">
                <div className="aspect-video w-full rounded overflow-hidden bg-gray-100">
                  <img src={mainImage} alt={reservation.property.title} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h5 className="font-bold text-[#2b2b2b]">{reservation.property.title}</h5>
                  <p className="text-[10px] text-[#6b7280] font-mono">Slug: {reservation.property.slug}</p>
                </div>
                <Link
                  href={`/admin/properties/${reservation.property.id}/edit`}
                  className="inline-flex items-center gap-1 text-[#f15e75] font-bold hover:underline text-[11px]"
                >
                  <span>Edit Property in CMS</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <p className="text-gray-400">Property details unassigned.</p>
            )}
          </div>

          {/* Guest Card */}
          <div className="bg-white border border-[#e5e7eb] rounded-md p-5 shadow-sm space-y-3">
            <h4 className="font-extrabold text-[#2b2b2b] uppercase tracking-wider text-[11px] border-b border-[#e5e7eb] pb-2">
              Guest Information
            </h4>
            {reservation.guest ? (
              <div className="space-y-2">
                <div className="font-bold text-[#2b2b2b] text-sm">{guestName}</div>
                <div className="text-[11px] text-[#6b7280]">{reservation.guest.email}</div>
                <div className="text-[11px] text-[#6b7280]">{reservation.guest.phone || 'Phone N/A'}</div>
                <Link
                  href={`/admin/users/${reservation.guest.id}`}
                  className="inline-flex items-center gap-1 text-[#f15e75] font-bold hover:underline text-[11px] pt-1"
                >
                  <span>View Guest User Profile</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <p className="text-gray-400">Guest information unassigned.</p>
            )}
          </div>

          {/* Host Card */}
          <div className="bg-white border border-[#e5e7eb] rounded-md p-5 shadow-sm space-y-3">
            <h4 className="font-extrabold text-[#2b2b2b] uppercase tracking-wider text-[11px] border-b border-[#e5e7eb] pb-2">
              Host Information
            </h4>
            {reservation.host ? (
              <div className="space-y-2">
                <div className="font-bold text-[#2b2b2b] text-sm">{hostName}</div>
                <div className="text-[11px] text-[#6b7280]">{reservation.host.email}</div>
                <Link
                  href={`/admin/users/${reservation.host.id}`}
                  className="inline-flex items-center gap-1 text-[#f15e75] font-bold hover:underline text-[11px] pt-1"
                >
                  <span>View Host Profile</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <p className="text-gray-400">Host information unassigned.</p>
            )}
          </div>
        </div>
      </div>

      {/* Manual Verification Warning Modal */}
      {manualVerificationModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl space-y-4 border border-[#e5e7eb] relative">
            <button onClick={() => setManualVerificationModalOpen(false)} className="absolute right-4 top-4 text-gray-400 hover:text-[#2b2b2b]">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2 bg-amber-50 rounded-full">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-base font-extrabold text-[#2b2b2b]">Change Payment Verification Status?</h3>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 leading-relaxed space-y-2 font-medium">
              <p className="font-bold">
                Warning: Payment verification status is independent from reservation status.
              </p>
              <p>
                You are changing this payment verification status to <strong className="font-extrabold uppercase">{selectedVerificationStatus}</strong>. This will not automatically confirm, cancel, refund, or modify the financial transaction.
              </p>
              {selectedVerificationStatus === 'REJECTED' && reservation.paymentVerificationStatus === 'VERIFIED' && (
                <p className="font-extrabold text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
                  You are changing this payment from VERIFIED to REJECTED. This will not automatically cancel the reservation or modify the payment transaction.
                </p>
              )}
              {selectedVerificationStatus === 'VERIFIED' && reservation.paymentVerificationStatus === 'REJECTED' && (
                <p className="font-extrabold text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200">
                  This will mark the payment as VERIFIED, but it will not automatically confirm the reservation.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setManualVerificationModalOpen(false)}
                disabled={processingVerification}
                className="px-4 py-2 text-xs font-bold text-[#4f5962] hover:bg-gray-100 rounded-md border border-[#e5e7eb]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmManualVerificationStatusChange}
                disabled={processingVerification}
                className="px-5 py-2 text-xs font-extrabold text-white bg-[#f15e75] hover:bg-[#d94f64] rounded-md shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {processingVerification ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <span>Updating Status...</span>
                  </>
                ) : (
                  <span>Confirm Change</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verify Confirmation Modal (Action A) */}
      {verifyModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl space-y-4 border border-[#e5e7eb] relative">
            <button onClick={() => setVerifyModalOpen(false)} className="absolute right-4 top-4 text-gray-400 hover:text-[#2b2b2b]">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 text-emerald-600">
              <div className="p-2 bg-emerald-50 rounded-full">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-[#2b2b2b]">Approve Payment &amp; Confirm Booking</h3>
            </div>

            <p className="text-xs text-[#4f5962] leading-relaxed">
              Are you sure you want to verify this payment proof for <strong>Reservation #{reservation.id.substring(0, 8)}</strong>?
            </p>
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded text-xs space-y-1 text-emerald-900">
              <p className="font-bold">This action will automatically:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                <li>Mark payment verification status as <strong className="font-extrabold">VERIFIED</strong>.</li>
                <li>Transition reservation status to <strong className="font-extrabold">CONFIRMED</strong>.</li>
                <li>Mark Invoice status as <strong className="font-extrabold">PAID</strong>.</li>
                <li>Generate host earnings record with status <strong className="font-extrabold">PENDING</strong>.</li>
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setVerifyModalOpen(false)}
                disabled={processingVerification}
                className="px-4 py-2 text-xs font-bold text-[#4f5962] hover:bg-gray-100 rounded-md border border-[#e5e7eb]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVerify}
                disabled={processingVerification}
                className="px-5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {processingVerification ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <span>Verifying Payment...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Confirm &amp; Verify Payment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl space-y-4 border border-[#e5e7eb] relative">
            <button onClick={() => setRejectModalOpen(false)} className="absolute right-4 top-4 text-gray-400 hover:text-[#2b2b2b]">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-full">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-base font-extrabold text-[#2b2b2b]">Reject Payment Proof</h3>
            </div>

            <p className="text-xs text-[#4f5962]">
              Please provide a clear reason for rejecting the payment proof so the guest can review and re-upload.
            </p>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#2b2b2b]">
                Rejection Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Screenshot is unreadable or transaction amount does not match booking total."
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md p-2.5 text-xs focus:outline-none focus:border-rose-500 font-medium"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                disabled={processingVerification}
                className="px-4 py-2 text-xs font-bold text-[#4f5962] hover:bg-gray-100 rounded-md border border-[#e5e7eb]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={processingVerification || !rejectionReasonInput.trim()}
                className="px-5 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>{processingVerification ? 'Rejecting...' : 'Reject Payment Proof'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {imageModalOpen && reservation.paymentProofUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setImageModalOpen(false)}>
          <div className="relative max-w-4xl max-h-[90vh] p-2" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setImageModalOpen(false)} className="absolute -top-10 right-0 text-white hover:text-gray-300 font-bold text-sm flex items-center gap-1">
              <X className="w-6 h-6" />
              <span>Close</span>
            </button>
            <img src={reservation.paymentProofUrl} alt="Full Payment Proof Screenshot" className="max-h-[85vh] w-auto max-w-full rounded shadow-2xl object-contain bg-white" />
          </div>
        </div>
      )}

      {/* Toast Notification Banner */}
      {toastNotification && (
        <div
          className={`fixed bottom-6 right-6 max-w-md w-full p-4 rounded-lg shadow-2xl border z-50 flex items-start gap-3 transition-all ${
            toastNotification.type === 'success'
              ? 'bg-emerald-950 text-white border-emerald-600'
              : 'bg-rose-950 text-white border-rose-600'
          }`}
        >
          {toastNotification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 space-y-1">
            <h4 className="font-extrabold text-sm">{toastNotification.title}</h4>
            <p className="text-xs text-gray-200 leading-relaxed font-medium">{toastNotification.message}</p>
          </div>
          <button
            onClick={() => setToastNotification(null)}
            className="text-gray-400 hover:text-white shrink-0 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
