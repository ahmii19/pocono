'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAdminPropertyTypes, deleteAdminPropertyType } from '@/lib/api';
import {
  Home, Plus, Search, RefreshCw, Edit3, Trash2, CheckCircle2, AlertCircle
} from 'lucide-react';

export default function AdminPropertyTypesPage() {
  const [propertyTypes, setPropertyTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorAlert, setErrorAlert] = useState('');
  const [successAlert, setSuccessAlert] = useState('');

  useEffect(() => {
    fetchPropertyTypes();
  }, [searchTerm]);

  const fetchPropertyTypes = async () => {
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (searchTerm) params.search = searchTerm;

      const res = await getAdminPropertyTypes(token, params);
      setPropertyTypes(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (pt: any) => {
    if (!confirm(`Are you sure you want to delete property type "${pt.name}"?`)) return;
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    setErrorAlert('');
    setSuccessAlert('');
    try {
      await deleteAdminPropertyType(pt.id, token);
      setSuccessAlert(`Property type "${pt.name}" deleted successfully!`);
      setTimeout(() => setSuccessAlert(''), 3000);
      fetchPropertyTypes();
    } catch (err: any) {
      setErrorAlert(err.message || 'Error deleting property type');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#e5e7eb] pb-6">
        <div>
          <span className="text-[#f15e75] text-xs font-bold uppercase tracking-wider block mb-1">
            PostgreSQL Property Types CMS
          </span>
          <h1 className="text-3xl font-extrabold text-[#2b2b2b]">Property Types</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/property-types/new"
            className="px-4 py-2.5 bg-[#f15e75] hover:bg-[#d94f64] text-white font-bold rounded-md text-xs transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Property Type</span>
          </Link>
          <button
            onClick={fetchPropertyTypes}
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
      <div className="bg-white p-4 border border-[#e5e7eb] rounded-md shadow-sm flex justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#9ca3af]" />
          <input
            type="text"
            placeholder="Search property type name, slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-[#f15e75]"
          />
        </div>
        <span className="text-xs text-[#6b7280] font-bold">{propertyTypes.length} Types Total</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-12 text-center text-[#4f5962] text-sm font-medium">
          Loading Property Types from PostgreSQL...
        </div>
      ) : propertyTypes.length === 0 ? (
        <div className="p-12 bg-white border border-[#e5e7eb] rounded-md text-center space-y-2 shadow-sm">
          <p className="text-[#2b2b2b] font-bold">No property types found matching query.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#e5e7eb] rounded-md overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs text-[#4f5962]">
            <thead className="bg-[#f8fafc] text-[#6b7280] uppercase text-[10px] font-bold border-b border-[#e5e7eb]">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">URL Slug</th>
                <th className="p-4">Property Count</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e7eb]">
              {propertyTypes.map((pt) => (
                <tr key={pt.id} className="hover:bg-[#fff1f3]/30 transition-colors">
                  <td className="p-4 font-bold text-[#2b2b2b] text-sm">
                    {pt.name}
                  </td>
                  <td className="p-4 font-mono text-[#6b7280]">
                    {pt.slug}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 bg-[#f8fafc] border border-[#e5e7eb] rounded text-xs font-bold text-[#2b2b2b]">
                      {pt._count?.properties || 0} Properties
                    </span>
                  </td>
                  <td className="p-4 text-center space-x-1.5">
                    <Link
                      href={`/admin/property-types/${pt.id}/edit`}
                      className="p-1.5 inline-block bg-[#f8fafc] hover:bg-[#fff1f3] text-[#4f5962] hover:text-[#f15e75] border border-[#e5e7eb] rounded-md transition-all"
                      title="Edit Property Type"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(pt)}
                      className="p-1.5 inline-block bg-[#fff1f3] text-[#f15e75] hover:bg-rose-100 rounded-md transition-all"
                      title="Delete Property Type"
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
