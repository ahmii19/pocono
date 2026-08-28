'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAdminCommunities, getCities, deleteAdminCommunity } from '@/lib/api';
import {
  Trees, Plus, Search, Filter, RefreshCw, Edit3, Trash2, ExternalLink,
  CheckCircle2, AlertCircle
} from 'lucide-react';

export default function AdminCommunitiesPage() {
  const [communities, setCommunities] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [errorAlert, setErrorAlert] = useState('');
  const [successAlert, setSuccessAlert] = useState('');

  useEffect(() => {
    getCities().then((res) => setCities(res.data || []));
  }, []);

  useEffect(() => {
    fetchCommunities();
  }, [searchTerm, cityFilter]);

  const fetchCommunities = async () => {
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (searchTerm) params.search = searchTerm;
      if (cityFilter) params.cityId = cityFilter;

      const res = await getAdminCommunities(token, params);
      setCommunities(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCommunity = async (comm: any) => {
    if (!confirm(`Are you sure you want to delete community "${comm.name}"?`)) return;
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    setErrorAlert('');
    setSuccessAlert('');
    try {
      await deleteAdminCommunity(comm.id, token);
      setSuccessAlert(`Community "${comm.name}" deleted successfully!`);
      setTimeout(() => setSuccessAlert(''), 3000);
      fetchCommunities();
    } catch (err: any) {
      setErrorAlert(err.message || 'Error deleting community');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#e5e7eb] pb-6">
        <div>
          <span className="text-[#f15e75] text-xs font-bold uppercase tracking-wider block mb-1">
            PostgreSQL Communities CMS
          </span>
          <h1 className="text-3xl font-extrabold text-[#2b2b2b]">Resort &amp; Sub-Communities</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/communities/new"
            className="px-4 py-2.5 bg-[#f15e75] hover:bg-[#d94f64] text-white font-bold rounded-md text-xs transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Community</span>
          </Link>
          <button
            onClick={fetchCommunities}
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

      {/* Search Toolbar */}
      <div className="bg-white p-4 border border-[#e5e7eb] rounded-md shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#9ca3af]" />
          <input
            type="text"
            placeholder="Search community name, slug, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-[#f15e75]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-4 h-4 text-[#9ca3af]" />
          <span className="text-xs text-[#4f5962] font-semibold">Filter City:</span>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#f15e75] font-semibold max-w-xs"
          >
            <option value="">All Parent Cities ({cities.length})</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Communities Table */}
      {loading ? (
        <div className="p-12 text-center text-[#4f5962] text-sm font-medium">
          Loading Communities Collection from PostgreSQL...
        </div>
      ) : communities.length === 0 ? (
        <div className="p-12 bg-white border border-[#e5e7eb] rounded-md text-center space-y-2 shadow-sm">
          <p className="text-[#2b2b2b] font-bold">No communities found matching search criteria.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#e5e7eb] rounded-md overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs text-[#4f5962]">
            <thead className="bg-[#f8fafc] text-[#6b7280] uppercase text-[10px] font-bold border-b border-[#e5e7eb]">
              <tr>
                <th className="p-4">Image</th>
                <th className="p-4">Community Name</th>
                <th className="p-4">URL Slug</th>
                <th className="p-4">Parent City</th>
                <th className="p-4">Properties Count</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e7eb]">
              {communities.map((comm) => (
                <tr key={comm.id} className="hover:bg-[#fff1f3]/30 transition-colors">
                  <td className="p-4">
                    <div className="w-12 h-10 rounded overflow-hidden bg-gray-100 border border-[#e5e7eb]">
                      <img
                        src={comm.imageUrl || '/placeholder.jpg'}
                        alt={comm.name}
                        className="w-full h-full object-cover"
                        onError={(e: any) => { e.target.src = '/placeholder.jpg'; }}
                      />
                    </div>
                  </td>

                  <td className="p-4">
                    <Link href={`/community/${comm.slug}`} target="_blank" className="font-bold text-[#2b2b2b] hover:text-[#f15e75] flex items-center gap-1">
                      <span>{comm.name}</span>
                      <ExternalLink className="w-3 h-3 text-[#9ca3af]" />
                    </Link>
                  </td>

                  <td className="p-4 font-mono text-[#6b7280]">
                    {comm.slug}
                  </td>

                  <td className="p-4 font-semibold text-[#2b2b2b]">
                    {comm.city?.name || 'Unassigned'}
                  </td>

                  <td className="p-4">
                    <span className="px-2 py-0.5 bg-[#f8fafc] border border-[#e5e7eb] rounded text-xs font-bold text-[#2b2b2b]">
                      {comm._count?.properties || 0} Properties
                    </span>
                  </td>

                  <td className="p-4 text-center space-x-1.5">
                    <Link
                      href={`/admin/communities/${comm.id}/edit`}
                      className="p-1.5 inline-block bg-[#f8fafc] hover:bg-[#fff1f3] text-[#4f5962] hover:text-[#f15e75] border border-[#e5e7eb] rounded-md transition-all"
                      title="Edit Community"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDeleteCommunity(comm)}
                      className="p-1.5 inline-block bg-[#fff1f3] text-[#f15e75] hover:bg-rose-100 rounded-md transition-all"
                      title="Delete Community"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
