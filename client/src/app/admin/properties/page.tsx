'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SafeImage from '@/components/SafeImage';
import {
  getAdminProperties, updateAdminPropertyStatus, updateAdminPropertyFeatured,
  deleteAdminProperty, getCities, getCommunities, getPropertyTypes, getAdminUsers
} from '@/lib/api';
import {
  Building2, Plus, Search, Filter, Trash2, Edit3, Eye, Star,
  CheckCircle2, AlertCircle, RefreshCw, X, MapPin, User, ShieldCheck,
  Check, Ban, Image as ImageIcon, Archive
} from 'lucide-react';

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [featuredFilter, setFeaturedFilter] = useState('ALL');
  const [hostFilter, setHostFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('');
  const [communityFilter, setCommunityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Taxonomies & Hosts
  const [cities, setCities] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<any[]>([]);
  const [hosts, setHosts] = useState<any[]>([]);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteStep, setDeleteStep] = useState<'select' | 'permanent-confirm'>('select');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadTaxonomiesAndHosts();
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [searchQuery, statusFilter, featuredFilter, hostFilter, cityFilter, communityFilter, typeFilter]);

  const loadTaxonomiesAndHosts = async () => {
    const token = localStorage.getItem('pocono_admin_token');
    try {
      const [cRes, commRes, tRes, uRes] = await Promise.all([
        getCities(), getCommunities(), getPropertyTypes(),
        token ? getAdminUsers(token, { role: 'HOST' }) : Promise.resolve({ data: [] })
      ]);
      setCities(cRes.data || []);
      setCommunities(commRes.data || []);
      setPropertyTypes(tRes.data || []);
      setHosts(uRes.data || []);
    } catch (e) {
      console.error('Taxonomy/Host load error:', e);
    }
  };

  const fetchProperties = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    try {
      const params: Record<string, any> = { limit: 100 };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (hostFilter !== 'ALL') params.hostId = hostFilter;
      if (featuredFilter !== 'ALL') params.isFeatured = featuredFilter === 'featured';
      if (cityFilter) params.city = cityFilter;
      if (communityFilter) params.community = communityFilter;
      if (typeFilter) params.propertyType = typeFilter;

      const res = await getAdminProperties(token, params);
      setProperties(res.data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch admin properties');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    setError('');
    setSuccess('');

    try {
      const res = await updateAdminPropertyStatus(id, newStatus, token);
      setSuccess(res.message || `Property status updated to ${newStatus}`);
      setTimeout(() => setSuccess(''), 3000);
      fetchProperties();
    } catch (err: any) {
      setError(err.message || 'Error updating property status');
    }
  };

  const handleToggleFeatured = async (id: string, currentFeatured: boolean) => {
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    setError('');
    setSuccess('');

    try {
      const res = await updateAdminPropertyFeatured(id, !currentFeatured, token);
      setSuccess(res.message || 'Property featured status updated');
      setTimeout(() => setSuccess(''), 3000);
      fetchProperties();
    } catch (err: any) {
      setError(err.message || 'Error updating featured status');
    }
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteStep('select');
    setDeleteConfirmText('');
  };

  const confirmDelete = async (mode: 'soft' | 'permanent') => {
    if (!deleteTarget) return;
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    setDeleteLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await deleteAdminProperty(deleteTarget.id, token, mode);
      setSuccess(res.message || (mode === 'permanent' ? 'Property permanently deleted.' : 'Property soft-deleted.'));
      setTimeout(() => setSuccess(''), 3000);
      closeDeleteModal();
      fetchProperties();
    } catch (err: any) {
      setError(err.message || 'Error deleting property');
      closeDeleteModal();
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-[#2b2b2b]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#e5e7eb] pb-6">
        <div>
          <span className="text-[#f15e75] text-xs font-bold uppercase tracking-wider block mb-1">
            Global Property Control & Approval Workflow
          </span>
          <h1 className="text-3xl font-extrabold text-[#2b2b2b]">Property Management CMS</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchProperties}
            className="p-2.5 bg-white border border-[#e5e7eb] text-[#4f5962] hover:text-[#f15e75] hover:bg-[#fff1f3] rounded-md text-xs font-bold transition-all shadow-xs flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <Link
            href="/admin/properties/new"
            className="px-4 py-2.5 bg-[#f15e75] hover:bg-[#d94f64] text-white font-bold rounded-md text-xs transition-all flex items-center gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Property</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-[#fff1f3] border border-[#f15e75]/30 text-[#f15e75] rounded-md text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Filter and Search Toolbar */}
      <div className="bg-white p-4 border border-[#e5e7eb] rounded-md shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#9ca3af]" />
            <input
              type="text"
              placeholder="Search title, slug, address, host name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md pl-9 pr-3 py-1.5 text-xs font-medium focus:outline-none focus:border-[#f15e75]"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#f15e75]"
            >
              <option value="ALL">Status: All</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="PENDING_REVIEW">PENDING REVIEW</option>
              <option value="DRAFT">DRAFT</option>
              <option value="REJECTED">REJECTED</option>
              <option value="DELETED">DELETED</option>
            </select>
          </div>

          {/* Host Filter */}
          <div>
            <select
              value={hostFilter}
              onChange={(e) => setHostFilter(e.target.value)}
              className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#f15e75]"
            >
              <option value="ALL">Host: All Hosts</option>
              {hosts.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.firstName} {h.lastName} ({h.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
          {/* Featured Filter */}
          <div>
            <select
              value={featuredFilter}
              onChange={(e) => setFeaturedFilter(e.target.value)}
              className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#f15e75]"
            >
              <option value="ALL">Featured: All</option>
              <option value="featured">Featured Only</option>
              <option value="standard">Standard</option>
            </select>
          </div>

          {/* City Filter */}
          <div>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#f15e75]"
            >
              <option value="">City: All</option>
              {cities.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Community Filter */}
          <div>
            <select
              value={communityFilter}
              onChange={(e) => setCommunityFilter(e.target.value)}
              className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#f15e75]"
            >
              <option value="">Community: All</option>
              {communities.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#f15e75]"
            >
              <option value="">Type: All</option>
              {propertyTypes.map((t) => (
                <option key={t.id} value={t.slug}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Properties Table */}
      {loading ? (
        <div className="p-12 bg-white border border-[#e5e7eb] rounded-md text-center text-xs font-bold text-[#4f5962]">
          Loading properties from PostgreSQL database...
        </div>
      ) : properties.length === 0 ? (
        <div className="bg-white border border-[#e5e7eb] p-12 rounded-md text-center space-y-3 shadow-xs">
          <Building2 className="w-10 h-10 text-[#f15e75] mx-auto opacity-70" />
          <h3 className="text-lg font-bold text-[#2b2b2b]">No Properties Found</h3>
          <p className="text-xs text-[#6b7280]">No properties match the selected criteria.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#e5e7eb] rounded-md shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafc] border-b border-[#e5e7eb] text-[#4f5962] uppercase font-extrabold text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">Property</th>
                  <th className="p-3.5">Host / Owner</th>
                  <th className="p-3.5">Location</th>
                  <th className="p-3.5">Price</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Featured</th>
                  <th className="p-3.5 text-right">Admin Actions</th>
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
                              <Link href={`/admin/properties/${p.id}/edit`}>{p.title}</Link>
                            </h4>
                            <span className="text-[10px] text-gray-400 font-mono">ID: {p.id.substring(0, 8)}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#fff1f3] text-[#f15e75] font-extrabold text-[10px] flex items-center justify-center shrink-0 border border-[#f15e75]/30">
                            {(p.host?.firstName || p.host?.email || 'A').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-[#2b2b2b]">
                              {p.host ? `${p.host.firstName || ''} ${p.host.lastName || ''}`.trim() : 'Admin'}
                            </p>
                            <p className="text-[10px] text-gray-400">{p.host?.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 text-[#4f5962]">
                        {p.city ? p.city.name : 'Poconos'}{p.community ? `, ${p.community.name}` : ''}
                      </td>

                      <td className="p-3.5 font-bold text-[#2b2b2b]">
                        ${p.nightlyPrice} <span className="text-[10px] font-normal text-gray-500">/ night</span>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide ${
                            p.status === 'PUBLISHED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.status === 'PENDING_REVIEW'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                              : p.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : p.status === 'DELETED'
                              ? 'bg-gray-200 text-gray-700 border border-gray-300'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}
                        >
                          {p.status === 'PENDING_REVIEW' ? 'PENDING REVIEW' : p.status}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <button
                          onClick={() => handleToggleFeatured(p.id, p.isFeatured)}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold border flex items-center gap-1 transition-all ${
                            p.isFeatured
                              ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                              : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          <Star className={`w-3 h-3 ${p.isFeatured ? 'fill-amber-500 text-amber-500' : ''}`} />
                          <span>{p.isFeatured ? 'Featured' : 'Standard'}</span>
                        </button>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Approval / Status Quick Actions */}
                          {p.status === 'PENDING_REVIEW' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(p.id, 'PUBLISHED')}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-extrabold flex items-center gap-1 shadow-2xs"
                                title="Approve & Publish"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleStatusChange(p.id, 'REJECTED')}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-extrabold flex items-center gap-1 shadow-2xs"
                                title="Reject Submission"
                              >
                                <Ban className="w-3 h-3" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {p.status === 'DRAFT' && (
                            <button
                              onClick={() => handleStatusChange(p.id, 'PUBLISHED')}
                              className="px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded text-[10px] font-bold"
                            >
                              Publish
                            </button>
                          )}

                          {p.status === 'DELETED' && (
                            <button
                              onClick={() => handleStatusChange(p.id, 'PUBLISHED')}
                              className="px-2 py-1 bg-[#fff1f3] text-[#f15e75] border border-[#f15e75]/30 hover:bg-[#f15e75] hover:text-white rounded text-[10px] font-bold transition-all shadow-2xs"
                              title="Restore Soft-Deleted Property to Live Status"
                            >
                              Restore
                            </button>
                          )}

                          <Link
                            href={`/listing/${p.slug}`}
                            target="_blank"
                            className="p-1.5 text-[#4f5962] hover:text-[#f15e75] hover:bg-[#fff1f3] rounded transition-colors"
                            title="View Public Listing"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          <Link
                            href={`/admin/properties/${p.id}/media`}
                            className="p-1.5 text-[#4f5962] hover:text-[#f15e75] hover:bg-[#fff1f3] rounded transition-colors"
                            title="Manage Media Gallery"
                          >
                            <ImageIcon className="w-4 h-4" />
                          </Link>

                          <Link
                            href={`/admin/properties/${p.id}/edit`}
                            className="p-1.5 text-[#4f5962] hover:text-[#f15e75] hover:bg-[#fff1f3] rounded transition-colors"
                            title="Edit Property"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Link>

                          <button
                            onClick={() => { setDeleteTarget(p); setDeleteStep('select'); }}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                            title="Delete Property Options"
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

      {/* Delete Property Two-Mode Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e7eb] rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={closeDeleteModal}
              className="absolute right-4 top-4 text-gray-400 hover:text-[#2b2b2b]"
            >
              <X className="w-5 h-5" />
            </button>

            {deleteStep === 'select' ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-[#f15e75] font-extrabold uppercase tracking-wider">Property Deletion Control</span>
                  <h3 className="text-xl font-extrabold text-[#2b2b2b]">Delete Property Options</h3>
                  <p className="text-xs text-[#6b7280]">
                    Select deletion method for <span className="font-bold text-[#2b2b2b]">"{deleteTarget.title}"</span>:
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  {/* Soft Delete Option */}
                  <div className="p-4 border border-[#e5e7eb] rounded-xl bg-[#f8fafc] hover:border-[#f15e75]/50 transition-all space-y-2">
                    <div className="flex items-center gap-2 font-extrabold text-[#2b2b2b] text-sm">
                      <Archive className="w-4 h-4 text-[#f15e75]" />
                      <span>Option 1: Soft Delete (Archive)</span>
                    </div>
                    <p className="text-xs text-[#4f5962] leading-relaxed">
                      Hides this property from public search and listings while preserving all historical reservations, messages, reviews, and images in PostgreSQL. Can be restored anytime by an Admin.
                    </p>
                    <button
                      onClick={() => confirmDelete('soft')}
                      disabled={deleteLoading}
                      className="w-full py-2.5 bg-[#f15e75] hover:bg-[#d94f64] text-white text-xs font-extrabold rounded-lg shadow-xs transition-all disabled:opacity-50 mt-1"
                    >
                      {deleteLoading ? 'Processing...' : 'Perform Soft Delete'}
                    </button>
                  </div>

                  {/* Permanent Delete Option */}
                  <div className="p-4 border border-rose-200 rounded-xl bg-rose-50/60 hover:border-rose-300 transition-all space-y-2">
                    <div className="flex items-center gap-2 font-extrabold text-rose-700 text-sm">
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span>Option 2: Permanent Delete (Hard Delete)</span>
                    </div>
                    <p className="text-xs text-rose-800 leading-relaxed">
                      Physically removes this property and ALL associated property data (images, message threads, messages, reviews, reservations, favorites) from PostgreSQL. Cannot be undone.
                    </p>
                    <button
                      onClick={() => setDeleteStep('permanent-confirm')}
                      disabled={deleteLoading}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-lg shadow-xs transition-all disabled:opacity-50 mt-1"
                    >
                      Proceed to Permanent Delete →
                    </button>
                  </div>
                </div>

                <div className="pt-2 text-right">
                  <button
                    onClick={closeDeleteModal}
                    className="px-4 py-2 bg-white border border-[#e5e7eb] text-[#4f5962] rounded-lg text-xs font-bold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Permanent Delete Confirmation Step */
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-rose-600 border-b border-rose-100 pb-3">
                  <AlertCircle className="w-6 h-6 shrink-0" />
                  <div>
                    <h3 className="text-lg font-extrabold text-rose-700">⚠️ PERMANENT DELETION WARNING</h3>
                    <p className="text-xs text-rose-600 font-semibold">This action cannot be undone!</p>
                  </div>
                </div>

                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg space-y-2 text-xs text-rose-900 font-medium">
                  <p>You are about to permanently delete <span className="font-extrabold">"{deleteTarget.title}"</span> and all related data:</p>
                  <ul className="list-disc list-inside space-y-1 text-[11px] font-bold text-rose-800">
                    <li>Complete Message History &amp; Inquiry Threads</li>
                    <li>Property Images &amp; Media Records</li>
                    <li>Customer Wishlist Favorites</li>
                    <li>Reservations &amp; Guest Reviews</li>
                  </ul>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="block text-[11px] font-extrabold text-[#2b2b2b] uppercase">
                    To confirm permanent deletion, type <span className="text-rose-600 font-mono font-black">DELETE</span> below:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="w-full bg-[#f8fafc] border border-rose-300 text-rose-900 rounded-lg px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-rose-600 uppercase"
                  />
                </div>

                <div className="pt-3 border-t border-[#e5e7eb] flex justify-end gap-3">
                  <button
                    onClick={() => setDeleteStep('select')}
                    disabled={deleteLoading}
                    className="px-4 py-2 bg-white border border-[#e5e7eb] text-[#4f5962] rounded-lg text-xs font-bold hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => confirmDelete('permanent')}
                    disabled={deleteLoading || deleteConfirmText.trim() !== 'DELETE'}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-lg text-xs font-extrabold shadow-xs transition-all"
                  >
                    {deleteLoading ? 'Deleting Permanently...' : 'Permanently Delete Property'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
