'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import HostNav from '@/components/HostNav';
import { getHostEarnings, getHostEarningsSummary, getHostProperties } from '@/lib/api';
import {
  DollarSign, Clock, CheckCircle2, AlertCircle, Filter, ArrowUpRight,
  ChevronLeft, ChevronRight, FileText, Building2, Calendar
} from 'lucide-react';

export default function HostEarningsPage() {
  const router = useRouter();
  const [earnings, setEarnings] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [propertyFilter, setPropertyFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('pocono_token');
    if (!token) {
      router.push('/become-a-host');
      return;
    }
    fetchProperties(token);
    fetchSummary(token);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('pocono_token');
    if (token) fetchEarningsList(token, page, statusFilter, propertyFilter);
  }, [page, statusFilter, propertyFilter]);

  const fetchProperties = async (token: string) => {
    try {
      const res = await getHostProperties(token);
      setProperties(res.data || []);
    } catch (e) {
      // ignore
    }
  };

  const fetchSummary = async (token: string) => {
    try {
      const res = await getHostEarningsSummary(token);
      setSummary(res.data);
    } catch (err: any) {
      if (err.message?.includes('Forbidden') || err.message?.includes('Role')) {
        router.push('/become-a-host');
      } else {
        setError(err.message || 'Failed to load earnings summary');
      }
    }
  };

  const fetchEarningsList = async (token: string, currentPage: number, status: string, propId: string) => {
    setLoading(true);
    try {
      const res = await getHostEarnings(token, {
        page: currentPage,
        limit: 15,
        status,
        propertyId: propId
      });
      setEarnings(res.data || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load earnings list');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#2b2b2b]">
      <HostNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#d8dce1] pb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#2b2b2b]">Host Earnings</h1>
            <p className="text-xs text-[#4f5962] font-medium mt-1">
              Track your net host income, pending payouts, available funds, and 10% platform commission breakdown.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-[#fff1f3] border border-[#f15e75]/30 text-[#f15e75] rounded-md text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 4 Financial Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Total Earnings */}
          <div className="bg-white border border-[#d8dce1] p-5 rounded-md shadow-2xs space-y-2">
            <div className="flex justify-between items-center text-xs font-extrabold text-[#4f5962] uppercase tracking-wider">
              <span>Total Net Earnings</span>
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-[#2b2b2b]">
              ${Number(summary?.totalEarnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-[#6b7280]">Total net income after platform commission</p>
          </div>

          {/* Card 2: Pending Earnings */}
          <div className="bg-white border border-[#d8dce1] p-5 rounded-md shadow-2xs space-y-2">
            <div className="flex justify-between items-center text-xs font-extrabold text-[#4f5962] uppercase tracking-wider">
              <span>Pending Earnings</span>
              <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-amber-700">
              ${Number(summary?.pendingEarnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-[#6b7280]">Confirmed bookings awaiting guest stay completion</p>
          </div>

          {/* Card 3: Available Earnings */}
          <div className="bg-white border border-[#d8dce1] p-5 rounded-md shadow-2xs space-y-2">
            <div className="flex justify-between items-center text-xs font-extrabold text-[#4f5962] uppercase tracking-wider">
              <span>Available Balance</span>
              <div className="w-8 h-8 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-200">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-sky-700">
              ${Number(summary?.availableEarnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-[#6b7280]">Completed stays ready for admin payout</p>
          </div>

          {/* Card 4: Paid Out */}
          <div className="bg-white border border-[#d8dce1] p-5 rounded-md shadow-2xs space-y-2">
            <div className="flex justify-between items-center text-xs font-extrabold text-[#4f5962] uppercase tracking-wider">
              <span>Paid Out</span>
              <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-purple-700">
              ${Number(summary?.paidEarnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-[#6b7280]">Total earnings disbursed to host</p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-white border border-[#d8dce1] p-4 rounded-md shadow-2xs flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#4f5962]">
              <Filter className="w-3.5 h-3.5 text-[#f15e75]" />
              <span>Filters:</span>
            </div>

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

            {/* Property Filter */}
            <select
              value={propertyFilter}
              onChange={(e) => { setPropertyFilter(e.target.value); setPage(1); }}
              className="bg-gray-50 border border-[#d8dce1] text-[#2b2b2b] text-xs font-bold rounded-md px-3 py-1.5 focus:outline-none focus:border-[#f15e75]"
            >
              <option value="ALL">All Properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          <div className="text-xs font-bold text-[#6b7280] self-end sm:self-center">
            Total Records: <span className="text-[#2b2b2b]">{totalCount}</span>
          </div>
        </div>

        {/* Earnings History Table */}
        <div className="bg-white border border-[#d8dce1] rounded-md shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#d8dce1] flex justify-between items-center bg-gray-50/50">
            <h3 className="font-extrabold text-[#2b2b2b] text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#f15e75]" />
              <span>Earnings Breakdown</span>
            </h3>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs font-bold text-[#4f5962]">Loading host earnings data...</div>
          ) : earnings.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <p className="text-sm font-bold text-[#4f5962]">No earnings records found.</p>
              <p className="text-xs text-[#6b7280]">Host earnings will automatically appear here once admin confirms guest reservations.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-[#d8dce1] text-[#4f5962] font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Property</th>
                    <th className="py-3 px-4">Reservation Ref</th>
                    <th className="py-3 px-4 text-right">Gross Amount</th>
                    <th className="py-3 px-4 text-right">Commission (10%)</th>
                    <th className="py-3 px-4 text-right">Host Net Earning</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d8dce1]">
                  {earnings.map((e) => {
                    const gross = Number(e.grossAmount || 0);
                    const comm = Number(e.commissionAmount || 0);
                    const net = Number(e.netAmount || 0);

                    return (
                      <tr key={e.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-[#4f5962] whitespace-nowrap">
                          {new Date(e.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-[#2b2b2b]">
                            {e.property?.title || 'Vacation Property'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[#6b7280]">
                          #{e.reservationId.substring(0, 8)}
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
