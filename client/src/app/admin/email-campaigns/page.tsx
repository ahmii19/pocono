'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, Plus, Send, SendHorizontal, Eye, Trash2, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function AdminEmailCampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('pocono_admin_token');
      const res = await fetchApi<{ data: any[] }>('/admin/email-campaigns', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCampaigns(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load email campaigns.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete campaign "${title}"?`)) return;
    setActionLoadingId(id);
    try {
      const token = localStorage.getItem('pocono_admin_token');
      await fetchApi(`/admin/email-campaigns/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setCampaigns(campaigns.filter(c => c.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete campaign.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[11px] font-extrabold flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3" /> SENT</span>;
      case 'SENDING':
      case 'QUEUED':
        return <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[11px] font-extrabold flex items-center gap-1 w-fit"><RefreshCw className="w-3 h-3 animate-spin" /> SENDING</span>;
      case 'FAILED':
        return <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-[11px] font-extrabold flex items-center gap-1 w-fit"><XCircle className="w-3 h-3" /> FAILED</span>;
      case 'DRAFT':
      default:
        return <span className="px-2.5 py-1 bg-gray-100 text-gray-700 border border-gray-200 rounded-md text-[11px] font-extrabold flex items-center gap-1 w-fit"><Clock className="w-3 h-3" /> DRAFT</span>;
    }
  };

  const getRecipientGroupLabel = (group: string) => {
    switch (group) {
      case 'ALL_GUESTS': return 'All Guests';
      case 'ALL_HOSTS': return 'All Hosts';
      case 'ALL_USERS': return 'All Users';
      case 'SELECTED_USERS': return 'Selected Users';
      default: return group;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e5e7eb] p-6 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#f15e75]" />
            <span className="text-xs font-bold text-[#f15e75] uppercase tracking-wider">Marketing &amp; Broadcasts</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#2b2b2b]">Email Campaigns</h1>
          <p className="text-xs text-gray-500 font-medium">
            Create, preview, and broadcast promotional emails, holiday announcements, and special offers to targeted users.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadCampaigns}
            className="p-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-xl transition-all"
            title="Refresh Campaigns"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/admin/email-campaigns/new"
            className="px-4 py-2.5 bg-[#f15e75] hover:bg-[#d94f64] text-white text-xs font-extrabold rounded-xl shadow-md flex items-center gap-2 transition-all uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Campaign</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Campaigns Overview Table */}
      <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500 font-semibold space-y-2">
            <RefreshCw className="w-6 h-6 text-[#f15e75] animate-spin mx-auto" />
            <p>Loading email campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-50 text-[#f15e75] rounded-full flex items-center justify-center mx-auto border border-rose-100">
              <Mail className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-[#2b2b2b]">No Email Campaigns Yet</h3>
              <p className="text-xs text-gray-500 font-medium max-w-md mx-auto">
                Start by creating your first promotional email campaign for holiday offers, special discounts, or announcements.
              </p>
            </div>
            <Link
              href="/admin/email-campaigns/new"
              className="px-5 py-2.5 bg-[#f15e75] hover:bg-[#d94f64] text-white text-xs font-extrabold rounded-xl shadow-md inline-flex items-center gap-2 transition-all uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" />
              <span>Create Campaign</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-[#e5e7eb] text-gray-500 uppercase tracking-wider text-[10px] font-extrabold">
                <tr>
                  <th className="py-3.5 px-6">Campaign Title</th>
                  <th className="py-3.5 px-4">Subject</th>
                  <th className="py-3.5 px-4">Recipients</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Delivery Rate</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[#2b2b2b] font-medium">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-4 px-6 font-bold text-sm text-[#2b2b2b]">
                      <Link href={`/admin/email-campaigns/${c.id}`} className="hover:text-[#f15e75] transition-colors">
                        {c.title}
                      </Link>
                    </td>
                    <td className="py-4 px-4 max-w-xs truncate text-gray-600 font-medium">
                      {c.subject}
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-700 font-bold text-[11px] rounded-md border border-gray-200">
                        {getRecipientGroupLabel(c.recipientGroup)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(c.status)}
                    </td>
                    <td className="py-4 px-4 font-bold text-xs">
                      {c.status === 'DRAFT' ? (
                        <span className="text-gray-400 font-normal">0 / {c.totalQueued} Queued</span>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-600 font-extrabold">{c.totalSent} Sent</span>
                            {c.totalFailed > 0 && <span className="text-rose-600 font-extrabold">• {c.totalFailed} Failed</span>}
                          </div>
                          <div className="text-[10px] text-gray-400 font-normal">Total: {c.totalQueued}</div>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-gray-500 text-[11px]">
                      {new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <Link
                        href={`/admin/email-campaigns/${c.id}`}
                        className="p-2 text-gray-500 hover:text-[#f15e75] hover:bg-rose-50 rounded-lg inline-block transition-all"
                        title="View Details & Logs"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(c.id, c.title)}
                        disabled={actionLoadingId === c.id || c.status === 'SENDING'}
                        className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-30"
                        title="Delete Campaign"
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
    </div>
  );
}
