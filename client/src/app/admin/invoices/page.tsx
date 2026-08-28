'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAdminInvoices, deleteAdminInvoice } from '@/lib/api';
import {
  FileText, Search, Filter, RefreshCw, Eye, Trash2, DollarSign,
  CheckCircle2, AlertCircle, Calendar, User as UserIcon, Building2
} from 'lucide-react';

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({ total: 0, paid: 0, pending: 0, failed: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [errorAlert, setErrorAlert] = useState('');
  const [successAlert, setSuccessAlert] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, [searchTerm, statusFilter, typeFilter]);

  const fetchInvoices = async () => {
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (typeFilter !== 'ALL') params.type = typeFilter;

      const res = await getAdminInvoices(token, params);
      setInvoices(res.data || []);
      if (res.metrics) setMetrics(res.metrics);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to archive/delete this invoice record?')) return;
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    setErrorAlert('');
    setSuccessAlert('');
    try {
      await deleteAdminInvoice(id, token);
      setSuccessAlert('Invoice archived safely.');
      setTimeout(() => setSuccessAlert(''), 3000);
      fetchInvoices();
    } catch (err: any) {
      setErrorAlert(err.message || 'Error deleting invoice');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#e5e7eb] pb-6">
        <div>
          <span className="text-[#f15e75] text-xs font-bold uppercase tracking-wider block mb-1">
            PostgreSQL Financial Ledger
          </span>
          <h1 className="text-3xl font-extrabold text-[#2b2b2b]">Invoices Collection</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchInvoices}
            className="p-2.5 bg-white border border-[#e5e7eb] text-[#4f5962] hover:text-[#f15e75] hover:bg-[#fff1f3] rounded-md text-xs font-bold transition-all shadow-sm flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
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

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        <div className="p-4 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-1">
          <span className="text-[11px] text-[#6b7280] font-bold uppercase">Total Invoices</span>
          <div className="text-2xl font-extrabold text-[#2b2b2b]">{metrics.total}</div>
          <span className="text-[10px] text-[#6b7280]">All Billing Records</span>
        </div>
        <div className="p-4 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-1">
          <span className="text-[11px] text-emerald-700 font-bold uppercase">Paid / Settled</span>
          <div className="text-2xl font-extrabold text-emerald-700">{metrics.paid}</div>
          <span className="text-[10px] text-[#6b7280]">Completed Payments</span>
        </div>
        <div className="p-4 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-1">
          <span className="text-[11px] text-amber-600 font-bold uppercase">Pending</span>
          <div className="text-2xl font-extrabold text-amber-600">{metrics.pending}</div>
          <span className="text-[10px] text-[#6b7280]">Awaiting Settlement</span>
        </div>
        <div className="p-4 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-1">
          <span className="text-[11px] text-[#f15e75] font-bold uppercase">Failed / Cancelled</span>
          <div className="text-2xl font-extrabold text-[#f15e75]">{metrics.failed}</div>
          <span className="text-[10px] text-[#6b7280]">Unpaid Invoices</span>
        </div>
        <div className="p-4 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-1">
          <span className="text-[11px] text-[#2b2b2b] font-bold uppercase">Total Invoiced</span>
          <div className="text-xl font-extrabold text-[#f15e75]">${Number(metrics.totalRevenue).toFixed(2)}</div>
          <span className="text-[10px] text-[#6b7280]">Cumulative Ledger</span>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white p-4 border border-[#e5e7eb] rounded-md shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#9ca3af]" />
          <input
            type="text"
            placeholder="Search invoice ID, guest email, property..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-[#f15e75]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          <Filter className="w-4 h-4 text-[#9ca3af]" />
          <span className="text-xs text-[#4f5962] font-semibold">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#f15e75] font-semibold"
          >
            <option value="ALL">All Types</option>
            <option value="Reservation">Reservation</option>
            <option value="Membership">Membership</option>
          </select>
          <span className="text-xs text-[#4f5962] font-semibold">Payment Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#f15e75] font-semibold"
          >
            <option value="ALL">All Statuses</option>
            <option value="1">PAID (Status 1)</option>
            <option value="0">PENDING (Status 0)</option>
            <option value="2">FAILED (Status 2)</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      {loading ? (
        <div className="p-12 text-center text-[#4f5962] text-sm font-medium">
          Loading Invoices Collection from PostgreSQL...
        </div>
      ) : invoices.length === 0 ? (
        <div className="p-12 bg-white border border-[#e5e7eb] rounded-md text-center space-y-2 shadow-sm">
          <p className="text-[#2b2b2b] font-bold">No invoice records found matching criteria.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#e5e7eb] rounded-md overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs text-[#4f5962]">
            <thead className="bg-[#f8fafc] text-[#6b7280] uppercase text-[10px] font-bold border-b border-[#e5e7eb]">
              <tr>
                <th className="p-4">Invoice ID</th>
                <th className="p-4">Type</th>
                <th className="p-4">Billing User / Guest</th>
                <th className="p-4">Property / Reservation</th>
                <th className="p-4">Res. Status</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Payment Status</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e7eb]">
              {invoices.map((inv) => {
                const userName = (inv.user?.firstName || inv.user?.lastName)
                  ? `${inv.user?.firstName || ''} ${inv.user?.lastName || ''}`.trim()
                  : inv.user?.email;
                const isReservation = inv.invoiceType === 'Reservation';
                const resStatus = inv.reservation?.status;
                const resStatusStyle = resStatus === 'CONFIRMED'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : resStatus === 'COMPLETED'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : resStatus === 'CANCELLED'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200';

                return (
                  <tr key={inv.id} className="hover:bg-[#fff1f3]/30 transition-colors">
                    <td className="p-4">
                      <Link href={`/admin/invoices/${inv.id}`} className="font-mono font-bold text-[#2b2b2b] hover:text-[#f15e75] block truncate max-w-[140px]">
                        {inv.id.substring(0, 8).toUpperCase()}…
                      </Link>
                      {inv.wpInvoiceId && (
                        <span className="text-[10px] text-[#9ca3af]">WP #{inv.wpInvoiceId}</span>
                      )}
                    </td>

                    <td className="p-4">
                      <span className={`px-2 py-0.5 border text-[10px] font-bold rounded uppercase ${
                        isReservation ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}>
                        {inv.invoiceType || 'Reservation'}
                      </span>
                    </td>

                    <td className="p-4">
                      {inv.user ? (
                        <div>
                          <Link href={`/admin/users/${inv.user.id}`} className="font-bold text-[#2b2b2b] hover:text-[#f15e75]">
                            {userName}
                          </Link>
                          <span className="text-[10px] text-[#6b7280] block">{inv.user.email}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </td>

                    <td className="p-4">
                      {inv.reservation?.property ? (
                        <div>
                          <span className="font-bold text-[#2b2b2b] block truncate max-w-[180px]">
                            {inv.reservation.property.title}
                          </span>
                          <Link href={`/admin/reservations/${inv.reservation.id}`} className="text-[10px] text-[#f15e75] font-mono hover:underline">
                            Res: {inv.reservation.id.substring(0, 8)}…
                          </Link>
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A (Membership)</span>
                      )}
                    </td>

                    <td className="p-4">
                      {isReservation && resStatus ? (
                        <span className={`px-2 py-0.5 border text-[10px] font-bold rounded uppercase ${resStatusStyle}`}>
                          {resStatus}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-[10px]">—</span>
                      )}
                    </td>

                    <td className="p-4 font-extrabold text-[#2b2b2b]">
                      ${Number(inv.totalAmount).toFixed(2)}
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          inv.paymentStatus === 1
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : inv.paymentStatus === 2
                            ? 'bg-[#fff1f3] text-[#f15e75] border border-[#f15e75]/30'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {inv.paymentStatus === 1 ? 'PAID' : inv.paymentStatus === 2 ? 'FAILED' : 'PENDING'}
                      </span>
                    </td>

                    <td className="p-4 text-[#6b7280]">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>

                    <td className="p-4 text-center space-x-1.5">
                      <Link
                        href={`/admin/invoices/${inv.id}`}
                        className="p-1.5 inline-block bg-[#f8fafc] hover:bg-[#fff1f3] text-[#4f5962] hover:text-[#f15e75] border border-[#e5e7eb] rounded-md transition-all"
                        title="View Invoice Detail"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(inv.id)}
                        className="p-1.5 inline-block bg-[#fff1f3] text-[#f15e75] hover:bg-rose-100 rounded-md transition-all"
                        title="Archive Invoice"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
