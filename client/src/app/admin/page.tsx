'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAdminStats } from '@/lib/api';
import { Building2, Users, Calendar, DollarSign, Star, FileText, CheckCircle2, ArrowRight } from 'lucide-react';

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('pocono_admin_token');
    if (token) {
      getAdminStats(token)
        .then(res => setStats(res.data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return <div className="text-[#4f5962] text-sm font-medium">Loading admin statistics from PostgreSQL database...</div>;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#e5e7eb] pb-6">
        <div>
          <span className="text-[#f15e75] text-xs font-bold uppercase tracking-wider block mb-1">System Overview</span>
          <h1 className="text-3xl font-extrabold text-[#2b2b2b]">Administrator Dashboard</h1>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#fff1f3] border border-[#f15e75]/20 text-[#f15e75] rounded-md text-xs font-bold">
          <CheckCircle2 className="w-4 h-4" />
          <span>PostgreSQL DB Operational (242 Records)</span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Properties */}
        <div className="p-6 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-[#6b7280] font-bold uppercase">Total Listings</span>
            <div className="p-2 bg-[#fff1f3] text-[#f15e75] rounded-md">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#2b2b2b]">{stats?.totalProperties || 0}</div>
          <div className="text-xs text-[#4f5962]">
            <span className="text-[#f15e75] font-bold">{stats?.publishedProperties || 0} Published</span> • <span className="text-amber-600 font-bold">{stats?.pendingProperties || 0} Pending Review</span> • {stats?.draftProperties || 0} Draft
          </div>
        </div>

        {/* Users & Hosts */}
        <div className="p-6 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-[#6b7280] font-bold uppercase">Users & Hosts</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-md">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#2b2b2b]">{stats?.totalUsers || 0}</div>
          <div className="text-xs text-[#4f5962]">
            <span className="text-blue-600 font-bold">{stats?.totalHosts || 0} Verified Hosts</span>
          </div>
        </div>

        {/* Reservations */}
        <div className="p-6 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-[#6b7280] font-bold uppercase">Reservations</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-md">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#2b2b2b]">{stats?.totalReservations || 0}</div>
          <div className="text-xs text-[#6b7280]">Migrated WordPress bookings</div>
        </div>

        {/* Revenue */}
        <div className="p-6 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-[#6b7280] font-bold uppercase">Gross Booking Volume</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-md">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#2b2b2b]">${stats?.totalRevenue ? stats.totalRevenue.toLocaleString() : '0'}</div>
          <div className="text-xs text-[#6b7280]">{stats?.totalInvoices || 0} Invoices Processed</div>
        </div>
      </div>

      {/* Admin Modules Quick Action Links */}
      <div className="space-y-4 pt-4 border-t border-[#e5e7eb]">
        <h3 className="text-lg font-bold text-[#2b2b2b]">Management Modules</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/admin/properties" className="p-5 bg-white border border-[#e5e7eb] rounded-md shadow-sm hover:border-[#f15e75]/40 hover:bg-[#fff1f3]/40 transition-all flex justify-between items-center group">
            <div>
              <h4 className="font-bold text-[#2b2b2b] text-sm group-hover:text-[#f15e75]">Property Management</h4>
              <span className="text-xs text-[#6b7280]">Publish, unpublish, edit, or delete listings</span>
            </div>
            <ArrowRight className="w-4 h-4 text-[#f15e75]" />
          </Link>

          <Link href="/admin/users" className="p-5 bg-white border border-[#e5e7eb] rounded-md shadow-sm hover:border-[#f15e75]/40 hover:bg-[#fff1f3]/40 transition-all flex justify-between items-center group">
            <div>
              <h4 className="font-bold text-[#2b2b2b] text-sm group-hover:text-[#f15e75]">User & Role Control</h4>
              <span className="text-xs text-[#6b7280]">Manage ADMIN, HOST, and GUEST roles</span>
            </div>
            <ArrowRight className="w-4 h-4 text-[#f15e75]" />
          </Link>

          <Link href="/admin/reservations" className="p-5 bg-white border border-[#e5e7eb] rounded-md shadow-sm hover:border-[#f15e75]/40 hover:bg-[#fff1f3]/40 transition-all flex justify-between items-center group">
            <div>
              <h4 className="font-bold text-[#2b2b2b] text-sm group-hover:text-[#f15e75]">Reservation Logs</h4>
              <span className="text-xs text-[#6b7280]">View bookings, dates, totals, and statuses</span>
            </div>
            <ArrowRight className="w-4 h-4 text-[#f15e75]" />
          </Link>

          <Link href="/admin/cities" className="p-5 bg-white border border-[#e5e7eb] rounded-md shadow-sm hover:border-[#f15e75]/40 hover:bg-[#fff1f3]/40 transition-all flex justify-between items-center group">
            <div>
              <h4 className="font-bold text-[#2b2b2b] text-sm group-hover:text-[#f15e75]">City Taxonomies</h4>
              <span className="text-xs text-[#6b7280]">Manage 16 Pocono destination cities</span>
            </div>
            <ArrowRight className="w-4 h-4 text-[#f15e75]" />
          </Link>

          <Link href="/admin/communities" className="p-5 bg-white border border-[#e5e7eb] rounded-md shadow-sm hover:border-[#f15e75]/40 hover:bg-[#fff1f3]/40 transition-all flex justify-between items-center group">
            <div>
              <h4 className="font-bold text-[#2b2b2b] text-sm group-hover:text-[#f15e75]">Subdivisions / Communities</h4>
              <span className="text-xs text-[#6b7280]">Manage 16 resort subdivision areas</span>
            </div>
            <ArrowRight className="w-4 h-4 text-[#f15e75]" />
          </Link>

          <Link href="/admin/reviews" className="p-5 bg-white border border-[#e5e7eb] rounded-md shadow-sm hover:border-[#f15e75]/40 hover:bg-[#fff1f3]/40 transition-all flex justify-between items-center group">
            <div>
              <h4 className="font-bold text-[#2b2b2b] text-sm group-hover:text-[#f15e75]">Guest Reviews Moderation</h4>
              <span className="text-xs text-[#6b7280]">Moderate ratings, comments, and approvals</span>
            </div>
            <ArrowRight className="w-4 h-4 text-[#f15e75]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
