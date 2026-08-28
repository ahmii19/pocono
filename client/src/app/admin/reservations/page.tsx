'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAdminReservations, updateAdminReservationStatus, updateAdminPaymentVerificationStatus } from '@/lib/api';
import {
  Calendar, Search, Filter, RefreshCw, Eye, CheckCircle2, AlertCircle,
  Building2, User as UserIcon, DollarSign, Clock, FileText, ChevronRight
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

  const handleStatusChange = async (id: string, newStatus: string) => {
    setErrorAlert('');
    setSuccessAlert('');
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    try {
      await updateAdminReservationStatus(id, newStatus, token);
      setSuccessAlert(`Booking status updated to ${newStatus} successfully!`);
      setTimeout(() => setSuccessAlert(''), 3000);
      fetchReservations();
    } catch (err: any) {
      setErrorAlert(err.message || 'Error updating reservation status');
    }
  };

  const handlePaymentVerificationStatusChange = async (id: string, newVerificationStatus: string) => {
    setErrorAlert('');
    setSuccessAlert('');
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    try {
      await updateAdminPaymentVerificationStatus(id, newVerificationStatus, token);
      setSuccessAlert(`Payment verification status updated to ${newVerificationStatus} successfully!`);
      setTimeout(() => setSuccessAlert(''), 3000);
      fetchReservations();
    } catch (err: any) {
      setErrorAlert(err.message || 'Error updating payment verification status');
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
        <div className="p-12 text-center text-[#4f5962] text-sm font-medium">
          Loading Reservations Collection from PostgreSQL...
        </div>
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
                          onChange={(e) => handlePaymentVerificationStatusChange(r.id, e.target.value)}
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
                          onChange={(e) => handleStatusChange(r.id, e.target.value)}
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
    </div>
  );
}
