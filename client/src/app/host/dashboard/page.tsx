'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import HostNav from '@/components/HostNav';
import { getHostDashboard } from '@/lib/api';
import {
  Building2, Calendar, Star, DollarSign, PlusCircle, ArrowRight,
  Clock, CheckCircle2, FileText, AlertCircle, TrendingUp
} from 'lucide-react';

export default function HostDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    const token = localStorage.getItem('pocono_token');
    if (!token) {
      router.push('/become-a-host');
      return;
    }

    try {
      const res = await getHostDashboard(token);
      setStats(res.data);
    } catch (err: any) {
      if (err.message?.includes('Forbidden') || err.message?.includes('Role')) {
        router.push('/become-a-host');
      } else {
        setError(err.message || 'Failed to load Host Dashboard');
      }
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
            <h1 className="text-2xl font-extrabold text-[#2b2b2b]">Host Dashboard</h1>
            <p className="text-xs text-[#4f5962] font-medium mt-1">
              Overview of your property listings, booking reservations, earnings, and guest reviews.
            </p>
          </div>

          <Link
            href="/host/properties/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#f15e75] hover:bg-[#d94f64] text-white text-xs font-extrabold rounded-md shadow-xs transition-all w-fit"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Property</span>
          </Link>
        </div>

        {error && (
          <div className="p-4 bg-[#fff1f3] border border-[#f15e75]/30 text-[#f15e75] rounded-md text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-[#4f5962]">Loading Host Dashboard metrics...</div>
        ) : (
          <>
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Stat 1: Total Revenue */}
              <div className="bg-white border border-[#d8dce1] p-5 rounded-md shadow-2xs space-y-2">
                <div className="flex justify-between items-center text-xs font-extrabold text-[#4f5962] uppercase tracking-wider">
                  <span>Total Earnings</span>
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-[#2b2b2b]">
                  ${Number(stats?.totalRevenue || 0).toLocaleString()}
                </div>
                <p className="text-[11px] text-[#6b7280]">From paid & confirmed guest bookings</p>
              </div>

              {/* Stat 2: Total Properties */}
              <div className="bg-white border border-[#d8dce1] p-5 rounded-md shadow-2xs space-y-2">
                <div className="flex justify-between items-center text-xs font-extrabold text-[#4f5962] uppercase tracking-wider">
                  <span>My Properties</span>
                  <div className="w-8 h-8 rounded-full bg-[#fff1f3] text-[#f15e75] flex items-center justify-center border border-[#f15e75]/30">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-[#2b2b2b]">{stats?.totalProperties || 0}</div>
                <div className="flex items-center gap-2 text-[10px] font-bold">
                  <span className="text-emerald-600">{stats?.publishedProperties || 0} Published</span>
                  <span className="text-amber-600">• {stats?.pendingProperties || 0} Pending</span>
                </div>
              </div>

              {/* Stat 3: Total Reservations */}
              <div className="bg-white border border-[#d8dce1] p-5 rounded-md shadow-2xs space-y-2">
                <div className="flex justify-between items-center text-xs font-extrabold text-[#4f5962] uppercase tracking-wider">
                  <span>Reservations</span>
                  <div className="w-8 h-8 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-200">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-[#2b2b2b]">{stats?.totalReservations || 0}</div>
                <p className="text-[11px] text-sky-700 font-bold">
                  {stats?.upcomingReservations || 0} Upcoming Bookings
                </p>
              </div>

              {/* Stat 4: Reviews & Rating */}
              <div className="bg-white border border-[#d8dce1] p-5 rounded-md shadow-2xs space-y-2">
                <div className="flex justify-between items-center text-xs font-extrabold text-[#4f5962] uppercase tracking-wider">
                  <span>Average Rating</span>
                  <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                    <Star className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-[#2b2b2b] flex items-center gap-1.5">
                  <span>{stats?.averageRating || '0.0'}</span>
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                </div>
                <p className="text-[11px] text-[#6b7280]">Based on {stats?.totalReviews || 0} guest reviews</p>
              </div>
            </div>

            {/* Quick Actions & Property Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Properties Overview */}
              <div className="lg:col-span-2 bg-white border border-[#d8dce1] p-6 rounded-md shadow-2xs space-y-4">
                <div className="flex justify-between items-center border-b border-[#d8dce1] pb-3">
                  <h3 className="text-sm font-extrabold text-[#2b2b2b] flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#f15e75]" />
                    <span>Properties Breakdown</span>
                  </h3>
                  <Link href="/host/properties" className="text-xs font-bold text-[#f15e75] hover:underline flex items-center gap-1">
                    <span>Manage Properties</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-[#f8fafc] border border-[#e5e7eb] rounded-md space-y-1">
                    <span className="text-[10px] font-extrabold text-emerald-700 uppercase">Published</span>
                    <div className="text-xl font-extrabold text-emerald-700">{stats?.publishedProperties || 0}</div>
                  </div>
                  <div className="p-4 bg-[#f8fafc] border border-[#e5e7eb] rounded-md space-y-1">
                    <span className="text-[10px] font-extrabold text-amber-700 uppercase">Pending Review</span>
                    <div className="text-xl font-extrabold text-amber-700">{stats?.pendingProperties || 0}</div>
                  </div>
                  <div className="p-4 bg-[#f8fafc] border border-[#e5e7eb] rounded-md space-y-1">
                    <span className="text-[10px] font-extrabold text-gray-600 uppercase">Drafts</span>
                    <div className="text-xl font-extrabold text-gray-700">{stats?.draftProperties || 0}</div>
                  </div>
                </div>
              </div>

              {/* Quick Navigation Cards */}
              <div className="bg-white border border-[#d8dce1] p-6 rounded-md shadow-2xs space-y-4">
                <h3 className="text-sm font-extrabold text-[#2b2b2b] border-b border-[#d8dce1] pb-3">
                  Quick Actions
                </h3>
                <div className="space-y-2 text-xs font-bold">
                  <Link
                    href="/host/messages"
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-[#fff1f3] text-[#4f5962] hover:text-[#f15e75] rounded-md border border-gray-200 transition-colors"
                  >
                    <span>Rental Inquiries</span>
                    <FileText className="w-4 h-4 text-[#f15e75]" />
                  </Link>
                  <Link
                    href="/host/properties/new"
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-[#fff1f3] text-[#4f5962] hover:text-[#f15e75] rounded-md border border-gray-200 transition-colors"
                  >
                    <span>Submit New Property</span>
                    <PlusCircle className="w-4 h-4 text-[#f15e75]" />
                  </Link>
                  <Link
                    href="/host/reservations"
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-[#fff1f3] text-[#4f5962] hover:text-[#f15e75] rounded-md border border-gray-200 transition-colors"
                  >
                    <span>View Reservations</span>
                    <Calendar className="w-4 h-4 text-[#f15e75]" />
                  </Link>
                  <Link
                    href="/host/reviews"
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-[#fff1f3] text-[#4f5962] hover:text-[#f15e75] rounded-md border border-gray-200 transition-colors"
                  >
                    <span>Guest Reviews</span>
                    <Star className="w-4 h-4 text-[#f15e75]" />
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
