'use client';

import AdminLoader from '@/components/admin/AdminLoader';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAdminEarnings, updateAdminEarningStatus, fetchApi } from '@/lib/api';
import {
  DollarSign, Clock, CheckCircle2, AlertCircle, Filter, ArrowUpRight,
  ChevronLeft, ChevronRight, FileText, Building2, User, Shield
} from 'lucide-react';

export default function AdminEarningsPage() {
  const router = useRouter();
  const [earnings, setEarnings] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [hosts, setHosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [hostFilter, setHostFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('pocono_token');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchHosts(token);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('pocono_token');
    if (token) fetchEarningsList(token, page, statusFilter, hostFilter);
  }, [page, statusFilter, hostFilter]);

  const fetchHosts = async (token: string) => {
    try {
      const res = await fetchApi<{ data: any[] }>('/admin/users?role=HOST', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHosts(res.data || []);
    } catch (e) {
      // ignore
    }
  };

  const fetchEarningsList = async (token: string, currentPage: number, status: string, hostId: string) => {
    setLoading(true);
    try {
      const res = await getAdminEarnings(token, {
        page: currentPage,
        limit: 20,
        status,
        hostId
      });
      setEarnings(res.data || []);
      setSummary(res.summary || null);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin earnings list');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (earningId: string, newStatus: string) => {
    const token = localStorage.getItem('pocono_token');
    if (!token) return;

    setUpdatingId(earningId);
    try {
      await updateAdminEarningStatus(earningId, newStatus, token);
      fetchEarningsList(token, page, statusFilter, hostFilter);
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#2b2b2b]">
      {/* Top Admin Header */}
      <header className="bg-[#2b2b2b] text-white py-4 px-6 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-[#f15e75]" />
          <h1 className="font-extrabold text-lg">Pocono.Vacations Admin Console</h1>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold">
          <Link href="/admin" className="text-gray-300 hover:text-white transition-all">Overview</Link>
          <Link href="/admin/properties" className="text-gray-300 hover:text-white transition-all">Properties</Link>
          <Link href="/admin/reservations" className="text-gray-300 hover:text-white transition-all">Reservations</Link>
          <Link href="/admin/earnings" className="text-[#f15e75] font-extrabold underline underline-offset-4">Earnings</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#d8dce1] pb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#2b2b2b]">Platform & Host Earnings Management</h1>
            <p className="text-xs text-[#4f5962] font-medium mt-1">
              Global accounting overview of platform commission revenues, host net earnings, and payout status.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-[#fff1f3] border border-[#f15e75]/30 text-[#f15e75] rounded-md text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 5 Financial Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Platform Revenue */}
          <div className="bg-white border border-[#d8dce1] p-4 rounded-md shadow-2xs space-y-1">
            <div className="flex justify-between items-center text-[10px] font-extrabold text-[#4f5962] uppercase tracking-wider">
              <span>Platform Revenue (10%)</span>
              <DollarSign className="w-3.5 h-3.5 text-[#f15e75]" />
            </div>
            <div className="text-xl font-extrabold text-[#f15e75]">
              ${Number(summary?.totalPlatformRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Total Host Net */}
          <div className="bg-white border border-[#d8dce1] p-4 rounded-md shadow-2xs space-y-1">
            <div className="flex justify-between items-center text-[10px] font-extrabold text-[#4f5962] uppercase tracking-wider">
              <span>Total Host Earnings</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-extrabold text-[#2b2b2b]">
              ${Number(summary?.totalHostEarnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Pending */}
          <div className="bg-white border border-[#d8dce1] p-4 rounded-md shadow-2xs space-y-1">
            <div className="flex justify-between items-center text-[10px] font-extrabold text-[#4f5962] uppercase tracking-wider">
              <span>Pending</span>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-xl font-extrabold text-amber-700">
              ${Number(summary?.pendingHostEarnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Available */}
          <div className="bg-white border border-[#d8dce1] p-4 rounded-md shadow-2xs space-y-1">
            <div className="flex justify-between items-center text-[10px] font-extrabold text-[#4f5962] uppercase tracking-wider">
              <span>Available for Payout</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
            </div>
            <div className="text-xl font-extrabold text-sky-700">
              ${Number(summary?.availableHostEarnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Paid Out */}
          <div className="bg-white border border-[#d8dce1] p-4 rounded-md shadow-2xs space-y-1">
            <div className="flex justify-between items-center text-[10px] font-extrabold text-[#4f5962] uppercase tracking-wider">
              <span>Paid Out</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="text-xl font-extrabold text-purple-700">
              ${Number(summary?.paidHostEarnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-white border border-[#d8dce1] p-4 rounded-md shadow-2xs flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#4f5962]">
              <Filter className="w-3.5 h-3.5 text-[#f15e75]" />
              <span>Filters:</span>
            </div>

            {/* Host Filter */}
            <select
              value={hostFilter}
              onChange={(e) => { setHostFilter(e.target.value); setPage(1); }}
              className="bg-gray-50 border border-[#d8dce1] text-[#2b2b2b] text-xs font-bold rounded-md px-3 py-1.5 focus:outline-none focus:border-[#f15e75]"
            >
              <option value="ALL">All Hosts</option>
              {hosts.map((h) => (
                <option key={h.id} value={h.id}>{h.firstName || h.lastName ? `${h.firstName || ''} ${h.lastName || ''}`.trim() : h.email}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-gray-50 border border-[#d8dce1] text-[#2b2b2b] text-xs font-bold rounded-md px-3 py-1.5 focus:outline-none focus:border-[#f15e75]"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="AVAILABLE">Available</option>
              <option value="PAID">Paid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="text-xs font-bold text-[#6b7280] self-end sm:self-center">
            Total Records: <span className="text-[#2b2b2b]">{totalCount}</span>
          </div>
        </div>

        {/* Global Earnings Table */}
        <div className="bg-white border border-[#d8dce1] rounded-md shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#d8dce1] flex justify-between items-center bg-gray-50/50">
            <h3 className="font-extrabold text-[#2b2b2b] text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#f15e75]" />
              <span>All Host Earnings & Commission Records</span>
            </h3>
          </div>

          {loading ? (
            <AdminLoader variant="table" message="Loading Host Earnings Ledger..." />
          ) : earnings.length === 0 ? (
            <div className="p-12 text-center text-xs font-bold text-[#4f5962]">No host earnings records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-[#d8dce1] text-[#4f5962] font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Host</th>
                    <th className="py-3 px-4">Property</th>
                    <th className="py-3 px-4 text-right">Gross Total</th>
                    <th className="py-3 px-4 text-right">Commission (10%)</th>
                    <th className="py-3 px-4 text-right">Host Net Earning</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d8dce1]">
                  {earnings.map((e) => {
                    const gross = Number(e.grossAmount || 0);
                    const comm = Number(e.commissionAmount || 0);
                    const net = Number(e.netAmount || 0);
                    const hostName = e.host?.firstName || e.host?.lastName ? `${e.host.firstName || ''} ${e.host.lastName || ''}`.trim() : e.host?.email || 'Host';

                    return (
                      <tr key={e.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-[#4f5962] whitespace-nowrap">
                          {new Date(e.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-[#2b2b2b]">
                          {hostName}
                        </td>

                        <td className="py-3.5 px-4 font-extrabold text-[#2b2b2b]">
                          {e.property?.title || 'Property'}
                        </td>

                        <td className="py-3.5 px-4 text-right font-bold text-[#4f5962]">
                          ${gross.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-bold text-rose-600">
                          -${comm.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-extrabold text-[#2b2b2b] text-sm">
                          ${net.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-1 text-[10px] font-bold rounded uppercase ${
                            e.status === 'PAID'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : e.status === 'AVAILABLE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : e.status === 'CANCELLED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {e.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {e.status !== 'PAID' && e.status !== 'CANCELLED' ? (
                            <button
                              onClick={() => handleStatusChange(e.id, 'PAID')}
                              disabled={updatingId === e.id}
                              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded text-[11px] transition-all disabled:opacity-50 cursor-pointer"
                            >
                              {updatingId === e.id ? 'Updating...' : 'Mark as PAID'}
                            </button>
                          ) : (
                            <span className="text-[11px] text-[#6b7280] font-bold">No Action</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-[#d8dce1] bg-gray-50 flex justify-between items-center text-xs">
              <span className="text-[#6b7280] font-bold">
                Page {page} of {totalPages}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded border border-[#d8dce1] bg-white text-[#4f5962] disabled:opacity-40 hover:bg-gray-100 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded border border-[#d8dce1] bg-white text-[#4f5962] disabled:opacity-40 hover:bg-gray-100 transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
