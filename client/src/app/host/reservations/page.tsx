'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import HostNav from '@/components/HostNav';
import { getHostReservations } from '@/lib/api';
import { Calendar, Building2, User, DollarSign, Search, AlertCircle } from 'lucide-react';

export default function HostReservationsPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchReservations();
  }, [statusFilter]);

  const fetchReservations = async () => {
    setLoading(true);
    const token = localStorage.getItem('pocono_token');
    if (!token) return;

    try {
      const res = await getHostReservations(token, { status: statusFilter });
      setReservations(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch host reservations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#2b2b2b]">
      <HostNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center border-b border-[#d8dce1] pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-[#2b2b2b]">Property Reservations</h1>
            <p className="text-xs text-[#4f5962] font-medium mt-1">
              Guest bookings for your property listings. Financial booking values are strictly immutable.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-[#fff1f3] border border-[#f15e75]/30 text-[#f15e75] rounded-md text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-white border border-[#d8dce1] p-4 rounded-md shadow-2xs flex justify-between items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-[#4f5962]">Filter Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#f8fafc] border border-[#d8dce1] text-[#2b2b2b] rounded-md px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#f15e75]"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PAID">Paid</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <span className="text-xs font-bold text-[#4f5962]">Total Bookings: {reservations.length}</span>
        </div>

        {/* Reservations Table */}
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-[#4f5962]">Loading guest reservations...</div>
        ) : reservations.length === 0 ? (
          <div className="bg-white border border-[#d8dce1] rounded-md p-12 text-center space-y-3 shadow-2xs">
            <Calendar className="w-10 h-10 text-[#f15e75] mx-auto opacity-70" />
            <h3 className="text-lg font-bold text-[#2b2b2b]">No Reservations Found</h3>
            <p className="text-xs text-[#6b7280]">There are currently no guest bookings for your properties under this filter.</p>
          </div>
        ) : (
          <div className="bg-white border border-[#d8dce1] rounded-md shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8fafc] border-b border-[#d8dce1] text-[#4f5962] uppercase font-extrabold text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3.5">Booking ID</th>
                    <th className="p-3.5">Property</th>
                    <th className="p-3.5">Guest</th>
                    <th className="p-3.5">Check-In</th>
                    <th className="p-3.5">Check-Out</th>
                    <th className="p-3.5">Nights</th>
                    <th className="p-3.5">Total Amount</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e7eb] font-medium text-[#2b2b2b]">
                  {reservations.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-3.5 font-mono text-gray-500 font-bold">
                        #{r.id.substring(0, 8)}
                      </td>

                      <td className="p-3.5">
                        <h4 className="font-bold text-[#2b2b2b] hover:text-[#f15e75] transition-colors">
                          <Link href={`/listing/${r.property?.slug}`}>{r.property?.title}</Link>
                        </h4>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#fff1f3] text-[#f15e75] font-extrabold text-[10px] flex items-center justify-center shrink-0 border border-[#f15e75]/30">
                            {(r.guest?.firstName || r.guest?.email || 'G').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-[#2b2b2b]">
                              {r.guest ? `${r.guest.firstName || ''} ${r.guest.lastName || ''}`.trim() : 'Guest'}
                            </p>
                            <p className="text-[10px] text-gray-400">{r.guest?.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 text-[#4f5962] font-semibold">
                        {new Date(r.checkIn).toLocaleDateString()}
                      </td>

                      <td className="p-3.5 text-[#4f5962] font-semibold">
                        {new Date(r.checkOut).toLocaleDateString()}
                      </td>

                      <td className="p-3.5 text-[#4f5962]">
                        {r.totalNights || 1} nights ({r.numGuests || 1} guests)
                      </td>

                      <td className="p-3.5 font-extrabold text-emerald-700">
                        ${Number(r.totalPrice).toFixed(2)}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r.status === 'CONFIRMED' || r.status === 'PAID' || r.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : r.status === 'CANCELLED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
