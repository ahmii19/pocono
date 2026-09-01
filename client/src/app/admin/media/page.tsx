'use client';

import AdminLoader from '@/components/admin/AdminLoader';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAllAdminMedia, getProperties } from '@/lib/api';
import {
  Image as ImageIcon, Search, Filter, RefreshCw, Eye, Star,
  ExternalLink, Building2
} from 'lucide-react';

export default function AdminMediaLibraryPage() {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [propertiesList, setPropertiesList] = useState<any[]>([]);

  useEffect(() => {
    getProperties({ limit: 100 }).then((res) => setPropertiesList(res.data || []));
  }, []);

  useEffect(() => {
    fetchMedia();
  }, [searchQuery, propertyFilter]);

  const fetchMedia = async () => {
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;
    setLoading(true);
    try {
      const params: Record<string, any> = { limit: 100 };
      if (searchQuery) params.search = searchQuery;
      if (propertyFilter) params.propertyId = propertyFilter;

      const res = await getAllAdminMedia(params, token);
      setImages(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#e5e7eb] pb-6">
        <div>
          <span className="text-[#f15e75] text-xs font-bold uppercase tracking-wider block mb-1">
            Central Media Library
          </span>
          <h1 className="text-3xl font-extrabold text-[#2b2b2b]">Property Media Library</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchMedia}
            className="p-2.5 bg-white border border-[#e5e7eb] text-[#4f5962] hover:text-[#f15e75] hover:bg-[#fff1f3] rounded-md text-xs font-bold transition-all shadow-sm flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search & Property Filter Bar */}
      <div className="bg-white p-4 border border-[#e5e7eb] rounded-md shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#9ca3af]" />
          <input
            type="text"
            placeholder="Search image URL, filename, or property title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md pl-10 pr-4 py-2 text-xs font-medium focus:outline-none focus:border-[#f15e75]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-4 h-4 text-[#9ca3af]" />
          <span className="text-xs text-[#4f5962] font-semibold">Filter Property:</span>
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#f15e75] font-semibold max-w-xs"
          >
            <option value="">All Properties ({propertiesList.length})</option>
            {propertiesList.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Media Grid */}
      {loading ? (
        <AdminLoader variant="table" message="Loading Media Library Assets..." />
      ) : images.length === 0 ? (
        <div className="p-12 bg-white border border-[#e5e7eb] rounded-md text-center space-y-2 shadow-sm">
          <p className="text-[#2b2b2b] font-bold">No media records found.</p>
          <p className="text-xs text-[#6b7280]">Try clearing search parameters or property filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {images.map((img) => {
            const fileName = img.imageUrl ? img.imageUrl.split('/').pop() : `Image #${img.id}`;
            return (
              <div
                key={img.id}
                className="bg-white border border-[#e5e7eb] rounded-md overflow-hidden shadow-sm group flex flex-col justify-between"
              >
                <div className="aspect-square relative bg-gray-50 overflow-hidden">
                  <img
                    src={img.imageUrl}
                    alt={img.property?.title || 'Media'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e: any) => { e.target.src = '/placeholder.jpg'; }}
                  />

                  {img.isFeatured && (
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-[#f15e75] text-white text-[9px] font-extrabold rounded shadow flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 fill-current text-amber-300" />
                      <span>Primary</span>
                    </div>
                  )}
                </div>

                <div className="p-2 space-y-1 border-t border-[#e5e7eb]">
                  <div className="text-[11px] font-bold text-[#2b2b2b] truncate" title={fileName}>
                    {fileName}
                  </div>
                  <div className="text-[10px] text-[#6b7280] truncate font-medium">
                    {img.property?.title || 'Unassigned'}
                  </div>
                </div>

                <div className="p-2 bg-[#f8fafc] border-t border-[#e5e7eb] flex justify-between items-center">
                  <span className="text-[9px] text-[#9ca3af] font-mono">ID: {img.id}</span>
                  {img.property?.id && (
                    <Link
                      href={`/admin/properties/${img.property.id}/media`}
                      className="p-1 text-[#f15e75] hover:bg-[#fff1f3] rounded transition-all flex items-center gap-1 text-[10px] font-bold"
                      title="Manage Property Media"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Manage</span>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
