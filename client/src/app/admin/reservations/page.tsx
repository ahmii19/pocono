'use client';

import AdminLoader from '@/components/admin/AdminLoader';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getAdminReservations,
  updateAdminReservationStatus,
  updateAdminPaymentVerificationStatus,
  rejectPaymentProofAdmin
} from '@/lib/api';
import {
  Calendar, Search, Filter, RefreshCw, Eye, CheckCircle2, AlertCircle,
  Building2, User as UserIcon, DollarSign, Clock, FileText, ChevronRight, X
} from 'lucide-react';

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({ total: 0, confirmed: 0, pending: 0, cancelled: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentVerificationFilter, setPaymentVerificationFilter] = useState('ALL');
  const [checkInFrom, setCheckInFrom] = useState('');
  const [checkInTo, setCheckInTo] = useState('');
  const [errorAlert, setErrorAlert] = useState('');
  const [successAlert, setSuccessAlert] = useState('');

  // Cancellation Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedCancelReservation, setSelectedCancelReservation] = useState<any | null>(null);
  const [cancellationReasonInput, setCancellationReasonInput] = useState('');
  const [cancelNotifyGuest, setCancelNotifyGuest] = useState(true);
  const [cancelNotifyHost, setCancelNotifyHost] = useState(true);

  // Rejection Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRejectReservation, setSelectedRejectReservation] = useState<any | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [rejectNotifyGuest, setRejectNotifyGuest] = useState(true);
  const [rejectNotifyHost, setRejectNotifyHost] = useState(true);

  // Processing Action Guard
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    fetchReservations();
  }, [searchTerm, statusFilter, paymentVerificationFilter, checkInFrom, checkInTo]);

  const fetchReservations = async () => {
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (paymentVerificationFilter !== 'ALL') params.paymentVerificationStatus = paymentVerificationFilter;
      if (checkInFrom) params.checkInFrom = checkInFrom;
      if (checkInTo) params.checkInTo = checkInTo;

      const res = await getAdminReservations(token, params);
      setReservations(res.data || []);
      if (res.metrics) setMetrics(res.metrics);
    } catch (e) {
      console.error('Error fetching admin reservations:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (reservation: any, newStatus: string) => {
    if (newStatus === 'CANCELLED') {
      setSelectedCancelReservation(reservation);
      setCancellationReasonInput('');
      setCancelNotifyGuest(true);
      setCancelNotifyHost(reservation?.property?.host?.role === 'HOST');
      setCancelModalOpen(true);
      return;
    }

    setErrorAlert('');
    setSuccessAlert('');
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    try {
      await updateAdminReservationStatus(reservation.id, newStatus, token);
      setSuccessAlert(`Booking status updated to ${newStatus} successfully!`);
      setTimeout(() => setSuccessAlert(''), 3000);
      fetchReservations();
    } catch (err: any) {
      setErrorAlert(err.message || 'Error updating reservation status');
    }
  };

  const handlePaymentVerificationStatusChange = async (reservation: any, newVerificationStatus: string) => {
    if (newVerificationStatus === 'REJECTED') {
      setSelectedRejectReservation(reservation);
      setRejectionReasonInput('');
      setRejectNotifyGuest(true);
      setRejectNotifyHost(reservation?.property?.host?.role === 'HOST');
      setRejectModalOpen(true);
      return;
    }

    setErrorAlert('');
    setSuccessAlert('');
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    try {
      await updateAdminPaymentVerificationStatus(reservation.id, newVerificationStatus, token);
      setSuccessAlert(`Payment verification status updated to ${newVerificationStatus} successfully!`);
      setTimeout(() => setSuccessAlert(''), 3000);
      fetchReservations();
    } catch (err: any) {
      setErrorAlert(err.message || 'Error updating payment verification status');
    }
  };

  const handleConfirmCancel = async () => {
    if (!selectedCancelReservation || processingAction) return;
    if (!cancellationReasonInput.trim()) {
      setErrorAlert('Cancellation reason is required.');
      return;
    }

    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    setProcessingAction(true);
    setErrorAlert('');
    setSuccessAlert('');

    try {
      await updateAdminReservationStatus(selectedCancelReservation.id, 'CANCELLED', token, {
        reason: cancellationReasonInput,
        notifyGuest: cancelNotifyGuest,
        notifyHost: cancelNotifyHost
      });
      setSuccessAlert('Reservation status updated to CANCELLED successfully!');
      setTimeout(() => setSuccessAlert(''), 4000);
      setCancelModalOpen(false);
      setSelectedCancelReservation(null);
      setCancellationReasonInput('');
      await fetchReservations();
    } catch (err: any) {
      setErrorAlert(err.message || 'Error cancelling reservation');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedRejectReservation || processingAction) return;
    if (!rejectionReasonInput.trim()) {
      setErrorAlert('Rejection reason is required.');
      return;
    }

    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    setProcessingAction(true);
    setErrorAlert('');
    setSuccessAlert('');

    try {
      const res = await rejectPaymentProofAdmin(selectedRejectReservation.id, rejectionReasonInput, token, {
        notifyGuest: rejectNotifyGuest,
        notifyHost: rejectNotifyHost
      });
      setSuccessAlert(res.message || 'Payment proof rejected successfully.');
      setTimeout(() => setSuccessAlert(''), 4000);
      setRejectModalOpen(false);
      setSelectedRejectReservation(null);
      setRejectionReasonInput('');
      await fetchReservations();
    } catch (err: any) {
      setErrorAlert(err.message || 'Error rejecting payment proof');
    } finally {
      setProcessingAction(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#e5e7eb] pb-6">
        <div>
          <span className="text-[#f15e75] text-xs font-bold uppercase tracking-wider block mb-1">
            PostgreSQL Reservation Management
          </span>
          <h1 className="text-3xl font-extrabold text-[#2b2b2b]">Reservations &amp; Bookings</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPaymentVerificationFilter('SUBMITTED')}
            className={`px-3 py-2 text-xs font-extrabold rounded-md border transition-all flex items-center gap-1.5 cursor-pointer ${
              paymentVerificationFilter === 'SUBMITTED'
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Awaiting Verification ({metrics.awaitingVerification || 0})</span>
          </button>
          <button
            onClick={fetchReservations}
            className="p-2.5 bg-white border border-[#e5e7eb] text-[#4f5962] hover:text-[#f15e75] hover:bg-[#fff1f3] rounded-md text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {errorAlert && (
        <div className="p-3 bg-[#fff1f3] border border-[#f15e75]/30 text-[#f15e75] rounded-md text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorAlert}</span>
        </div>
      )}

      {successAlert && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successAlert}</span>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-md border border-[#e5e7eb] shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-[#6b7280] uppercase block">Total Bookings</span>
          <span className="text-2xl font-extrabold text-[#2b2b2b]">{metrics.total || reservations.length}</span>
        </div>
        <div className="bg-white p-4 rounded-md border border-[#e5e7eb] shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-amber-600 uppercase block">Pending</span>
          <span className="text-2xl font-extrabold text-amber-600">{metrics.pending || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-md border border-[#e5e7eb] shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-amber-700 uppercase block">Awaiting Proof Verification</span>
          <span className="text-2xl font-extrabold text-amber-700">{metrics.awaitingVerification || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-md border border-[#e5e7eb] shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-600 uppercase block">Confirmed</span>
          <span className="text-2xl font-extrabold text-emerald-600">{metrics.confirmed || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-md border border-[#e5e7eb] shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-blue-600 uppercase block">Completed</span>
          <span className="text-2xl font-extrabold text-blue-600">{metrics.completed || 0}</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-md border border-[#e5e7eb] shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[#9ca3af]" />
            <input
              type="text"
              placeholder="Search by ID, property, or guest..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md text-xs focus:outline-none focus:border-[#f15e75] font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#9ca3af]" />
              <span className="text-xs text-[#4f5962] font-semibold">Payment Verification:</span>
              <select
                value={paymentVerificationFilter}
                onChange={(e) => setPaymentVerificationFilter(e.target.value)}
                className="bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#f15e75] font-semibold"
              >
                <option value="ALL">All Payment States</option>
                <option value="SUBMITTED">SUBMITTED (Awaiting Review)</option>
                <option value="VERIFIED">VERIFIED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="NOT_SUBMITTED">NOT SUBMITTED</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#4f5962] font-semibold">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#f15e75] font-semibold"
              >
                <option value="ALL">All Statuses</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="PENDING">PENDING</option>
                <option value="PAID">PAID</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="REFUNDED">REFUNDED</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Reservation Table */}
      {loading ? (
        <AdminLoader variant="table" message="Loading Reservations Collection..." />
      ) : reservations.length === 0 ? (
        <div className="p-12 bg-white border border-[#e5e7eb] rounded-md text-center space-y-2 shadow-xs">
          <p className="text-[#2b2b2b] font-bold">No reservations match your filter criteria.</p>
          <p className="text-xs text-[#6b7280]">Try clearing search parameters or date filters.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#e5e7eb] rounded-md overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#4f5962] min-w-[1000px]">
              <thead className="bg-[#f8fafc] text-[#6b7280] uppercase text-[10px] font-bold border-b border-[#e5e7eb]">
                <tr>
                  <th className="p-4">Booking ID</th>
                  <th className="p-4">Property</th>
                  <th className="p-4">Guest</th>
                  <th className="p-4">Dates &amp; Stay</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Payment Verification</th>
                  <th className="p-4">Booking Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb]">
                {reservations.map((r) => {
                  const checkIn = new Date(r.checkInDate).toLocaleDateString();
                  const checkOut = new Date(r.checkOutDate).toLocaleDateString();
                  const guestName = (r.guest?.firstName || r.guest?.lastName)
                    ? `${r.guest?.firstName || ''} ${r.guest?.lastName || ''}`.trim()
                    : r.guest?.email;

                  return (
                    <tr key={r.id} className="hover:bg-[#fff1f3]/30 transition-colors">
                      <td className="p-4">
                        <span className="font-mono font-bold text-[#2b2b2b] block">#{r.id.substring(0, 8)}</span>
                        <span className="text-[10px] text-[#9ca3af] block">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </td>

                      <td className="p-4">
                        {r.property ? (
                          <div>
                            <Link
                              href={`/admin/properties/${r.property.id}/edit`}
                              className="font-bold text-[#2b2b2b] hover:text-[#f15e75] block truncate max-w-[200px]"
                            >
                              {r.property.title}
                            </Link>
                            <span className="text-[10px] text-[#6b7280] font-mono">Slug: {r.property.slug}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </td>

                      <td className="p-4">
                        {r.guest ? (
                          <div>
                            <Link
                              href={`/admin/users/${r.guest.id}`}
                              className="font-bold text-[#2b2b2b] hover:text-[#f15e75] block"
                            >
                              {guestName}
                            </Link>
                            <span className="text-[10px] text-[#6b7280] block">{r.guest.email}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Guest N/A</span>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-[#2b2b2b]">
                          {checkIn} → {checkOut}
                        </div>
                        <span className="text-[10px] text-[#6b7280]">
                          {r.totalNights} night{r.totalNights === 1 ? '' : 's'} ({r.guestCount} guest{r.guestCount === 1 ? '' : 's'})
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="font-extrabold text-[#2b2b2b] text-sm">${Number(r.grandTotal).toFixed(2)}</span>
                      </td>

                      <td className="p-4">
                        <select
                          value={r.paymentVerificationStatus || 'NOT_SUBMITTED'}
                          onChange={(e) => handlePaymentVerificationStatusChange(r, e.target.value)}
                          className={`border rounded-md px-2 py-1 text-[11px] font-bold uppercase cursor-pointer focus:outline-none ${
                            r.paymentVerificationStatus === 'VERIFIED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : r.paymentVerificationStatus === 'SUBMITTED'
                              ? 'bg-amber-50 text-amber-700 border-amber-300'
                              : r.paymentVerificationStatus === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border-rose-300'
                              : 'bg-gray-50 text-gray-700 border-gray-300'
                          }`}
                        >
                          <option value="NOT_SUBMITTED">NOT_SUBMITTED</option>
                          <option value="SUBMITTED">SUBMITTED</option>
                          <option value="VERIFIED">VERIFIED</option>
                          <option value="REJECTED">REJECTED</option>
                        </select>
                      </td>

                      <td className="p-4">
                        <select
                          value={r.status}
                          onChange={(e) => handleStatusChange(r, e.target.value)}
                          className={`border rounded-md px-2 py-1 text-[11px] font-bold uppercase cursor-pointer focus:outline-none ${
                            r.status === 'CONFIRMED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : r.status === 'CANCELLED'
                              ? 'bg-[#fff1f3] text-[#f15e75] border-[#f15e75]/30'
                              : r.status === 'COMPLETED'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          <option value="CONFIRMED">CONFIRMED</option>
                          <option value="PENDING">PENDING</option>
                          <option value="PAID">PAID</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="CANCELLED">CANCELLED</option>
                          <option value="REFUNDED">REFUNDED</option>
                        </select>
                      </td>

                      <td className="p-4 text-center">
                        <Link
                          href={`/admin/reservations/${r.id}`}
                          className="px-3 py-1.5 bg-[#f8fafc] hover:bg-[#fff1f3] text-[#4f5962] hover:text-[#f15e75] border border-[#e5e7eb] rounded-md transition-all text-xs font-bold inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Detail</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelModalOpen && selectedCancelReservation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl space-y-4 border border-[#e5e7eb] relative text-xs">
            <button
              onClick={() => { setCancelModalOpen(false); setSelectedCancelReservation(null); }}
              className="absolute right-4 top-4 text-gray-400 hover:text-[#2b2b2b]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-full">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-base font-extrabold text-[#2b2b2b]">Cancel Reservation?</h3>
            </div>

            <p className="text-xs text-[#4f5962]">
              Are you sure you want to cancel this reservation? This action will mark the booking as CANCELLED and reconcile financial records.
            </p>

            {/* Summary Box */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded text-xs space-y-1.5 text-[#4f5962]">
              <div className="flex justify-between">
                <span className="text-[10px] uppercase font-bold text-gray-500">Reservation ID:</span>
                <span className="font-mono font-bold text-[#2b2b2b]">#{selectedCancelReservation.id.substring(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] uppercase font-bold text-gray-500">Property:</span>
                <span className="font-bold text-[#2b2b2b] truncate max-w-[200px]">{selectedCancelReservation.property?.title || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] uppercase font-bold text-gray-500">Guest:</span>
                <span className="font-bold text-[#2b2b2b]">{selectedCancelReservation.guest?.firstName ? `${selectedCancelReservation.guest.firstName} ${selectedCancelReservation.guest.lastName || ''}`.trim() : selectedCancelReservation.guest?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] uppercase font-bold text-gray-500">Dates:</span>
                <span className="font-semibold text-[#2b2b2b]">
                  {new Date(selectedCancelReservation.checkInDate).toLocaleDateString()} → {new Date(selectedCancelReservation.checkOutDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Cancellation Reason */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#2b2b2b]">
                Cancellation Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="State the clear reason for cancelling this booking..."
                value={cancellationReasonInput}
                onChange={(e) => setCancellationReasonInput(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md p-2.5 text-xs focus:outline-none focus:border-rose-500 font-medium"
              />
            </div>

            {/* Notification Checkboxes */}
            <div className="space-y-2 pt-2 border-t border-[#e5e7eb]">
              <label className="block text-[10px] font-extrabold text-[#6b7280] uppercase tracking-wider">
                Notification Options
              </label>

              {selectedCancelReservation.guest?.email && (
                <label className="flex items-center gap-2 text-xs font-semibold text-[#2b2b2b] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cancelNotifyGuest}
                    onChange={(e) => setCancelNotifyGuest(e.target.checked)}
                    className="w-4 h-4 text-[#f15e75] rounded border-gray-300 focus:ring-[#f15e75]"
                  />
                  <span>Notify Guest ({selectedCancelReservation.guest.email})</span>
                </label>
              )}

              {selectedCancelReservation.property?.host?.role === 'HOST' && selectedCancelReservation.property?.host?.email && (
                <label className="flex items-center gap-2 text-xs font-semibold text-[#2b2b2b] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cancelNotifyHost}
                    onChange={(e) => setCancelNotifyHost(e.target.checked)}
                    className="w-4 h-4 text-[#f15e75] rounded border-gray-300 focus:ring-[#f15e75]"
                  />
                  <span>Notify Host ({selectedCancelReservation.property.host.email})</span>
                </label>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setCancelModalOpen(false); setSelectedCancelReservation(null); }}
                disabled={processingAction}
                className="px-4 py-2 text-xs font-bold text-[#4f5962] hover:bg-gray-100 rounded-md border border-[#e5e7eb]"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={processingAction || !cancellationReasonInput.trim()}
                className="px-5 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {processingAction ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Confirm Cancellation</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModalOpen && selectedRejectReservation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl space-y-4 border border-[#e5e7eb] relative text-xs">
            <button
              onClick={() => { setRejectModalOpen(false); setSelectedRejectReservation(null); }}
              className="absolute right-4 top-4 text-gray-400 hover:text-[#2b2b2b]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-full">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-base font-extrabold text-[#2b2b2b]">Reject Payment Proof?</h3>
            </div>

            <p className="text-xs text-[#4f5962]">
              Please provide a clear reason for rejecting the payment proof so the guest can review and re-upload.
            </p>

            {/* Summary Box */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded text-xs space-y-1.5 text-[#4f5962]">
              <div className="flex justify-between">
                <span className="text-[10px] uppercase font-bold text-gray-500">Reservation ID:</span>
                <span className="font-mono font-bold text-[#2b2b2b]">#{selectedRejectReservation.id.substring(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] uppercase font-bold text-gray-500">Property:</span>
                <span className="font-bold text-[#2b2b2b] truncate max-w-[200px]">{selectedRejectReservation.property?.title || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] uppercase font-bold text-gray-500">Guest:</span>
                <span className="font-bold text-[#2b2b2b]">{selectedRejectReservation.guest?.firstName ? `${selectedRejectReservation.guest.firstName} ${selectedRejectReservation.guest.lastName || ''}`.trim() : selectedRejectReservation.guest?.email}</span>
              </div>
            </div>

            {/* Rejection Reason */}
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

            {/* Notification Checkboxes */}
            <div className="space-y-2 pt-2 border-t border-[#e5e7eb]">
              <label className="block text-[10px] font-extrabold text-[#6b7280] uppercase tracking-wider">
                Notification Options
              </label>

              {selectedRejectReservation.guest?.email && (
                <label className="flex items-center gap-2 text-xs font-semibold text-[#2b2b2b] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rejectNotifyGuest}
                    onChange={(e) => setRejectNotifyGuest(e.target.checked)}
                    className="w-4 h-4 text-[#f15e75] rounded border-gray-300 focus:ring-[#f15e75]"
                  />
                  <span>Notify Guest ({selectedRejectReservation.guest.email})</span>
                </label>
              )}

              {selectedRejectReservation.property?.host?.role === 'HOST' && selectedRejectReservation.property?.host?.email && (
                <label className="flex items-center gap-2 text-xs font-semibold text-[#2b2b2b] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rejectNotifyHost}
                    onChange={(e) => setRejectNotifyHost(e.target.checked)}
                    className="w-4 h-4 text-[#f15e75] rounded border-gray-300 focus:ring-[#f15e75]"
                  />
                  <span>Notify Host ({selectedRejectReservation.property.host.email})</span>
                </label>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setRejectModalOpen(false); setSelectedRejectReservation(null); }}
                disabled={processingAction}
                className="px-4 py-2 text-xs font-bold text-[#4f5962] hover:bg-gray-100 rounded-md border border-[#e5e7eb]"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={processingAction || !rejectionReasonInput.trim()}
                className="px-5 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {processingAction ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <span>Confirm Rejection</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
