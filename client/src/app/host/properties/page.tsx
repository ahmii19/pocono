'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import HostNav from '@/components/HostNav';
import SafeImage from '@/components/SafeImage';
import { getHostProperties, deleteHostProperty } from '@/lib/api';
import {
  Building2, PlusCircle, Edit3, Image as ImageIcon, Eye, Trash2,
  Search, AlertCircle, CheckCircle2, AlertTriangle, X
} from 'lucide-react';

export default function HostPropertiesPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, [statusFilter]);

  const fetchProperties = async () => {
    setLoading(true);
    const token = localStorage.getItem('pocono_token');
    if (!token) return;

    try {
      const res = await getHostProperties(token, { search, status: statusFilter });
      setProperties(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch host properties');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProperties();
  };

  const handleDeleteProperty = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setError('');
    setSuccess('');

    const token = localStorage.getItem('pocono_token');
    if (!token) return;

    try {
      const res = await deleteHostProperty(deleteTarget.id, token);
      setSuccess(res.message || 'Property removed successfully.');
      setTimeout(() => setSuccess(''), 3000);
      setDeleteTarget(null);
      fetchProperties();
    } catch (err: any) {
      setError(err.message || 'Error removing property');
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#2b2b2b]">
      <HostNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#d8dce1] pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-[#2b2b2b]">My Properties</h1>
            <p className="text-xs text-[#4f5962] font-medium mt-1">
              Manage your vacation rental listings, submit new properties for review, and update media photo galleries.
            </p>
          </div>

          <Link
            href="/host/properties/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#f15e75] hover:bg-[#d94f64] text-white text-xs font-extrabold rounded-md shadow-xs transition-all w-fit"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Property</span>
          </Link>
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

        {/* Filters Bar */}
        <div className="bg-white border border-[#d8dce1] p-4 rounded-md shadow-2xs flex flex-col sm:flex-row justify-between items-center gap-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full sm:w-auto flex-grow max-w-md">
            <div className="relative flex-grow">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search my properties by title or address..."
                className="w-full pl-9 pr-3 py-2 bg-[#f8fafc] border border-[#d8dce1] text-[#2b2b2b] rounded-md text-xs font-medium focus:outline-none focus:border-[#f15e75]"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-[#f15e75] text-white rounded-md text-xs font-bold hover:bg-[#d94f64] transition-colors"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-bold text-[#4f5962]">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#f8fafc] border border-[#d8dce1] text-[#2b2b2b] rounded-md px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#f15e75]"
            >
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </div>

        {/* Properties List / Cards */}
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-[#4f5962]">Loading your property listings...</div>
        ) : properties.length === 0 ? (
          <div className="bg-white border border-[#d8dce1] rounded-md p-12 text-center space-y-3 shadow-2xs">
            <Building2 className="w-10 h-10 text-[#f15e75] mx-auto opacity-70" />
            <h3 className="text-lg font-bold text-[#2b2b2b]">No Properties Found</h3>
            <p className="text-xs text-[#6b7280]">You have not created any property listings matching this filter yet.</p>
            <Link
              href="/host/properties/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#f15e75] text-white rounded-md text-xs font-extrabold"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit Your First Property</span>
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-[#d8dce1] rounded-md shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8fafc] border-b border-[#d8dce1] text-[#4f5962] uppercase font-extrabold text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3.5">Property</th>
                    <th className="p-3.5">Location</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Price</th>
                    <th className="p-3.5">Guests</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e7eb] font-medium text-[#2b2b2b]">
                  {properties.map((p) => {
                    const leadImage = p.images && p.images.length > 0
                      ? p.images.find((img: any) => img.isFeatured)?.imageUrl || p.images[0].imageUrl
                      : '/placeholder.jpg';

                    return (
                      <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-12 rounded-md overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                              <SafeImage src={leadImage} alt={p.title} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <h4 className="font-bold text-[#2b2b2b] hover:text-[#f15e75] transition-colors">
                                <Link href={`/listing/${p.slug}`}>{p.title}</Link>
                              </h4>
                              <span className="text-[10px] text-gray-400 font-mono">ID: {p.id.substring(0, 8)}</span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 text-[#4f5962]">
                          {p.city ? p.city.name : 'Poconos'}{p.community ? `, ${p.community.name}` : ''}
                        </td>

                        <td className="p-3.5 text-[#4f5962]">
                          {p.propertyType ? p.propertyType.name : 'N/A'}
                        </td>

                        <td className="p-3.5 font-bold text-[#2b2b2b]">
                          ${p.nightlyPrice} <span className="text-[10px] font-normal text-gray-500">/ night</span>
                        </td>

                        <td className="p-3.5 text-[#4f5962]">
                          {p.maxGuests} Guests ({p.bedrooms} BR)
                        </td>

                        <td className="p-3.5">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide inline-block w-fit ${
                                p.status === 'PUBLISHED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : p.status === 'PENDING_REVIEW'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                                  : p.status === 'REJECTED'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-gray-100 text-gray-600 border border-gray-200'
                              }`}
                            >
                              {p.status === 'PENDING_REVIEW' ? 'PENDING REVIEW' : p.status}
                            </span>
                            {p.status === 'PENDING_REVIEW' && (
                              <span className="text-[10px] text-amber-600 font-medium">
                                Submitted & awaiting admin approval
                              </span>
                            )}
                            {p.status === 'REJECTED' && (
                              <span className="text-[10px] text-rose-600 font-medium">
                                Submission declined by admin
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/listing/${p.slug}`}
                              target="_blank"
                              className="p-1.5 text-[#4f5962] hover:text-[#f15e75] hover:bg-[#fff1f3] rounded transition-colors"
                              title="View Listing"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>

                            <Link
                              href={`/host/properties/${p.id}/media`}
                              className="p-1.5 text-[#4f5962] hover:text-[#f15e75] hover:bg-[#fff1f3] rounded transition-colors"
                              title="Manage Media Gallery"
                            >
                              <ImageIcon className="w-4 h-4" />
                            </Link>

                            <Link
                              href={`/host/properties/${p.id}/edit`}
                              className="p-1.5 text-[#4f5962] hover:text-[#f15e75] hover:bg-[#fff1f3] rounded transition-colors"
                              title="Edit Property"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Link>

                            <button
                              onClick={() => setDeleteTarget(p)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                              title="Delete Property"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-[#d8dce1] rounded-md max-w-md w-full p-6 space-y-4 shadow-xl relative">
              <button
                onClick={() => setDeleteTarget(null)}
                className="absolute right-4 top-4 text-gray-400 hover:text-[#2b2b2b]"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-lg font-extrabold text-[#2b2b2b]">Remove Property Listing?</h3>
              </div>

              <p className="text-xs text-[#4f5962]">
                Are you sure you want to remove property "{deleteTarget.title}"?
              </p>

              <div className="pt-3 border-t border-[#d8dce1] flex justify-end gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleteLoading}
                  className="px-4 py-2 bg-white border border-[#d8dce1] text-[#4f5962] rounded-md text-xs font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProperty}
                  disabled={deleteLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-extrabold"
                >
                  {deleteLoading ? 'Removing...' : 'Remove Property'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
