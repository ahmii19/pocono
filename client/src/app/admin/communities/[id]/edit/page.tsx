'use client';

import AdminLoader from '@/components/admin/AdminLoader';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getAdminCommunityById, updateAdminCommunity, getCities } from '@/lib/api';
import { ArrowLeft, Save, Trees, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AdminEditCommunityPage() {
  const router = useRouter();
  const params = useParams();
  const commId = params.id as string;

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [cityId, setCityId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, [commId]);

  const loadData = async () => {
    setInitialLoading(true);
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    try {
      const [commRes, citiesRes] = await Promise.all([
        getAdminCommunityById(commId, token),
        getCities()
      ]);

      const comm = commRes.data;
      if (comm) {
        setName(comm.name || '');
        setSlug(comm.slug || '');
        setCityId(comm.cityId ? String(comm.cityId) : '');
        setImageUrl(comm.imageUrl || '');
      }
      setCities(citiesRes.data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load community details');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const token = localStorage.getItem('pocono_admin_token');
    if (!token) {
      setError('Admin authentication required.');
      setLoading(false);
      return;
    }

    try {
      await updateAdminCommunity(commId, { name, slug, cityId: cityId || null, imageUrl }, token);
      setSuccess('Community updated successfully in PostgreSQL!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error updating community');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="p-8 text-center text-[#4f5962] text-sm font-medium">Loading community details...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#e5e7eb] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/communities"
            className="p-2 bg-white border border-[#e5e7eb] text-[#4f5962] hover:text-[#f15e75] rounded-md transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-[#2b2b2b]">Edit Community</h1>
            <p className="text-xs text-[#6b7280]">Updating PostgreSQL Community ID: {commId}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#fff1f3] border border-[#f15e75]/30 text-[#f15e75] rounded-md text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-[#e5e7eb] rounded-md shadow-sm p-6 space-y-4 text-xs text-[#4f5962]">
        <div>
          <label className="block font-bold text-[#2b2b2b] mb-1">Community Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
          />
        </div>

        <div>
          <label className="block font-bold text-[#2b2b2b] mb-1">URL Slug *</label>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 font-mono focus:outline-none focus:border-[#f15e75]"
          />
        </div>

        <div>
          <label className="block font-bold text-[#2b2b2b] mb-1">Parent City / Region</label>
          <select
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 font-semibold focus:outline-none focus:border-[#f15e75]"
          >
            <option value="">Select Parent City</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-bold text-[#2b2b2b] mb-1">Community Image URL</label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
          />
        </div>

        <div className="pt-4 border-t border-[#e5e7eb] flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-[#f15e75] hover:bg-[#d94f64] text-white font-bold rounded-md text-xs transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving Changes...' : 'Save Community Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
