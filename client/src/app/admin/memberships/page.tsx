'use client';

import AdminLoader from '@/components/admin/AdminLoader';

import { useState, useEffect } from 'react';
import { getMembershipPlans } from '@/lib/api';
import { Award } from 'lucide-react';

export default function AdminMembershipsPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMembershipPlans().then(res => setPlans(res.data || [])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="border-b border-[#e5e7eb] pb-4">
        <h1 className="text-2xl font-extrabold text-[#2b2b2b]">Membership Package Plans</h1>
        <p className="text-xs text-[#6b7280]">Total {plans.length} active host subscription packages</p>
      </div>

      {loading ? (
        <AdminLoader variant="table" message="Loading Membership Plans..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(p => (
            <div key={p.id} className="p-6 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-[#2b2b2b] text-lg">{p.name}</h3>
                <span className="px-2.5 py-1 bg-[#fff1f3] text-[#f15e75] border border-[#f15e75]/20 rounded-md text-xs font-bold">${p.price}</span>
              </div>
              <p className="text-xs text-[#6b7280]">{p.description || 'Host listing package'}</p>
              <div className="pt-3 border-t border-[#e5e7eb] text-xs text-[#4f5962] space-y-1">
                <div>Listings Allowed: <span className="font-bold text-[#2b2b2b]">{p.maxListings || 'Unlimited'}</span></div>
                <div>Featured Listings: <span className="font-bold text-[#2b2b2b]">{p.featuredListings || 0}</span></div>
                <div>Billing Cycle: <span className="font-bold text-[#f15e75]">{p.billingPeriod || 'Monthly'}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
