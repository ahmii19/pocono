'use client';

import { useState, useEffect } from 'react';
import { getAdminUsers } from '@/lib/api';
import { UserCheck } from 'lucide-react';

export default function AdminHostsPage() {
  const [hosts, setHosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('pocono_admin_token');
    if (token) {
      getAdminUsers(token)
        .then(res => setHosts((res.data || []).filter((u: any) => u.role === 'HOST')))
        .finally(() => setLoading(false));
    }
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="border-b border-[#e5e7eb] pb-4">
        <h1 className="text-2xl font-extrabold text-[#2b2b2b]">Host Directory</h1>
        <p className="text-xs text-[#6b7280]">Total {hosts.length} verified property owners</p>
      </div>

      {loading ? (
        <div className="text-[#4f5962] text-sm font-medium">Loading hosts...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hosts.map(h => (
            <div key={h.id} className="p-6 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#fff1f3] text-[#f15e75] font-bold flex items-center justify-center text-lg border border-[#f15e75]/20">
                  {h.firstName?.[0] || 'H'}
                </div>
                <div>
                  <h3 className="font-bold text-[#2b2b2b] text-base">{h.firstName || ''} {h.lastName || ''}</h3>
                  <span className="text-xs text-[#6b7280]">{h.email}</span>
                </div>
              </div>
              <div className="pt-3 border-t border-[#e5e7eb] flex justify-between text-xs text-[#6b7280]">
                <span>Listings: {h._count?.properties || 0}</span>
                <span className="text-[#f15e75] font-bold">Verified Host</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
