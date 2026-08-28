'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createAdminCommunity, getCities } from '@/lib/api';
import { ArrowLeft, Save, Trees, AlertCircle } from 'lucide-react';

export default function AdminNewCommunityPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [cityId, setCityId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCities().then((res) => setCities(res.data || []));
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, '-')) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const token = localStorage.getItem('pocono_admin_token');
    if (!token) {
      setError('Admin authentication required.');
      setLoading(false);
      return;
    }

    try {
      await createAdminCommunity({ name, slug, cityId: cityId || null, imageUrl }, token);
      router.push('/admin/communities');
    } catch (err: any) {
      setError(err.message || 'Error creating community');
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-2xl font-extrabold text-[#2b2b2b]">Create New Community</h1>
            <p className="text-xs text-[#6b7280]">Add a resort or sub-community to PostgreSQL</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#fff1f3] border border-[#f15e75]/30 text-[#f15e75] rounded-md text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
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
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Big Bass Lake"
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
            placeholder="e.g. big-bass-lake"
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
            placeholder="http://localhost:5000/wp-content/uploads/..."
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
            <span>{loading ? 'Saving...' : 'Save & Create Community'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
