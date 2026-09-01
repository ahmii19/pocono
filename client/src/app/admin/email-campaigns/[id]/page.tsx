'use client';

import AdminLoader from '@/components/admin/AdminLoader';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Send, CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw, Trash2, ShieldCheck, User } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function CampaignDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) loadCampaign();
  }, [id]);

  const loadCampaign = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('pocono_admin_token');
      const res = await fetchApi<{ data: any }>(`/admin/email-campaigns/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCampaign(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load campaign details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    setActionLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const token = localStorage.getItem('pocono_admin_token');
      const res = await fetchApi<{ message: string }>(`/admin/email-campaigns/${id}/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMessage(res.message || 'Test email sent successfully to your admin email address.');
    } catch (err: any) {
      setError(err.message || 'Failed to send test email.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartBroadcast = async () => {
    if (!confirm(`Are you sure you want to start broadcasting "${campaign.title}" to ${campaign.totalQueued} recipients?`)) return;
    setActionLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('pocono_admin_token');
      await fetchApi(`/admin/email-campaigns/${id}/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMessage('Campaign broadcasting initiated in the background.');
      loadCampaign();
    } catch (err: any) {
      setError(err.message || 'Failed to start campaign broadcast.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete campaign "${campaign.title}"?`)) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem('pocono_admin_token');
      await fetchApi(`/admin/email-campaigns/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      router.push('/admin/email-campaigns');
    } catch (err: any) {
      setError(err.message || 'Failed to delete campaign.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-gray-500 font-semibold space-y-2">
        <RefreshCw className="w-6 h-6 text-[#f15e75] animate-spin mx-auto" />
        <p>Loading campaign details...</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-12 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-[#2b2b2b]">Campaign Not Found</h3>
        <Link href="/admin/email-campaigns" className="text-[#f15e75] text-xs font-bold hover:underline">
          ← Return to Campaigns Overview
        </Link>
      </div>
    );
  }

  const deliveryRate = campaign.totalQueued > 0
    ? Math.round((campaign.totalSent / campaign.totalQueued) * 100)
    : 0;

  return (
    <div className="space-y-6 text-[#2b2b2b]">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e5e7eb] p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/email-campaigns"
            className="p-2 text-gray-400 hover:text-[#2b2b2b] hover:bg-gray-100 rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#f15e75] uppercase tracking-wider">Campaign Details</span>
              <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded uppercase border ${
                campaign.status === 'SENT' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                campaign.status === 'SENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                campaign.status === 'FAILED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                'bg-gray-100 text-gray-700 border-gray-200'
              }`}>
                {campaign.status}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#2b2b2b]">{campaign.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={loadCampaign}
            className="p-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-xl transition-all"
            title="Refresh Status & Logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleSendTestEmail}
            disabled={actionLoading}
            className="px-4 py-2.5 bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            <span>Send Test Email</span>
          </button>

          {campaign.status === 'DRAFT' && (
            <button
              type="button"
              onClick={handleStartBroadcast}
              disabled={actionLoading}
              className="px-5 py-2.5 bg-[#f15e75] hover:bg-[#d94f64] text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 uppercase tracking-wider"
            >
              <Send className="w-4 h-4" />
              <span>Start Broadcast</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDelete}
            disabled={actionLoading || campaign.status === 'SENDING'}
            className="p-2.5 bg-gray-100 hover:bg-rose-50 text-gray-500 hover:text-rose-600 rounded-xl transition-all"
            title="Delete Campaign"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-[#e5e7eb] rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Total Queued</span>
          <div className="text-2xl font-extrabold text-[#2b2b2b]">{campaign.totalQueued}</div>
          <span className="text-[11px] text-gray-500 font-medium">Recipients Resolved</span>
        </div>

        <div className="p-5 bg-white border border-[#e5e7eb] rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Successfully Sent</span>
          <div className="text-2xl font-extrabold text-emerald-600">{campaign.totalSent}</div>
          <span className="text-[11px] text-emerald-700 font-bold">{deliveryRate}% Delivery Rate</span>
        </div>

        <div className="p-5 bg-white border border-[#e5e7eb] rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Delivery Failures</span>
          <div className="text-2xl font-extrabold text-rose-600">{campaign.totalFailed}</div>
          <span className="text-[11px] text-gray-500 font-medium">SMTP Delivery Errors</span>
        </div>

        <div className="p-5 bg-white border border-[#e5e7eb] rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Campaign Status</span>
          <div className="text-lg font-extrabold text-[#2b2b2b] uppercase pt-1">{campaign.status}</div>
          <span className="text-[11px] text-gray-500 font-medium">
            {campaign.sentAt ? `Sent on ${new Date(campaign.sentAt).toLocaleDateString()}` : 'Not broadcasted'}
          </span>
        </div>
      </div>

      {/* Campaign Details Header */}
      <div className="bg-white border border-[#e5e7eb] p-6 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-base font-extrabold text-[#2b2b2b]">Campaign Settings &amp; Metadata</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium">
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80">
            <span className="text-gray-400 block text-[10px] font-extrabold uppercase">Subject Line:</span>
            <span className="font-bold text-[#2b2b2b] text-sm">{campaign.subject}</span>
          </div>
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80">
            <span className="text-gray-400 block text-[10px] font-extrabold uppercase">Recipient Audience:</span>
            <span className="font-bold text-[#2b2b2b] text-sm">{campaign.recipientGroup}</span>
          </div>
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80">
            <span className="text-gray-400 block text-[10px] font-extrabold uppercase">Created By:</span>
            <span className="font-bold text-[#2b2b2b] text-sm">
              {campaign.createdBy?.firstName || 'Admin'} ({campaign.createdBy?.email})
            </span>
          </div>
        </div>

        {/* Content Preview Box */}
        <div className="space-y-2 pt-2">
          <label className="block text-[10px] font-extrabold text-gray-400 uppercase">Message Content Preview:</label>
          <div
            className="p-5 bg-gray-50 border border-gray-200 rounded-xl text-xs leading-relaxed font-medium space-y-2 max-h-48 overflow-y-auto [&_h2]:text-base [&_h2]:font-bold [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-[#f15e75]"
            dangerouslySetInnerHTML={{ __html: campaign.contentHtml }}
          />
        </div>
      </div>

      {/* Recipient Delivery Logs Table */}
      <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm overflow-hidden space-y-4">
        <div className="p-6 border-b border-[#e5e7eb] flex justify-between items-center">
          <div>
            <h3 className="text-base font-extrabold text-[#2b2b2b]">Recipient Delivery Logs</h3>
            <p className="text-xs text-gray-500 font-medium">Individual delivery status for queued recipient emails.</p>
          </div>
          <span className="px-3 py-1 bg-gray-100 text-gray-700 font-bold text-xs rounded-lg">
            {campaign.recipients?.length || 0} Snapshot Log Records
          </span>
        </div>

        {campaign.recipients && campaign.recipients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-[#e5e7eb] text-gray-500 uppercase tracking-wider text-[10px] font-extrabold">
                <tr>
                  <th className="py-3.5 px-6">Recipient Email</th>
                  <th className="py-3.5 px-4">User Name</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Sent At</th>
                  <th className="py-3.5 px-6">Delivery Details / Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[#2b2b2b] font-medium">
                {campaign.recipients.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-6 font-bold text-[#2b2b2b]">{r.email}</td>
                    <td className="py-3.5 px-4 text-gray-600 font-semibold">
                      {r.user ? `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim() : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4">
                      {r.status === 'SENT' ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold rounded">SENT</span>
                      ) : r.status === 'FAILED' ? (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold rounded">FAILED</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 border border-gray-200 text-[10px] font-extrabold rounded">QUEUED</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 text-[11px]">
                      {r.sentAt ? new Date(r.sentAt).toLocaleString() : '—'}
                    </td>
                    <td className="py-3.5 px-6 text-gray-500 text-[11px] max-w-xs truncate">
                      {r.errorMessage ? <span className="text-rose-600 font-semibold">{r.errorMessage}</span> : <span className="text-gray-400">OK</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-gray-500 font-medium">
            No recipient delivery logs recorded yet. Delivery snapshots are created when the campaign broadcast starts.
          </div>
        )}
      </div>
    </div>
  );
}
