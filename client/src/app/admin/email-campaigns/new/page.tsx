'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Send, Eye, Save, AlertCircle, CheckCircle2, Users, RefreshCw, Sparkles, Lock, Clock } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function CreateEmailCampaignPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [contentHtml, setContentHtml] = useState(
    `<h2>Special Holiday Offer from Pocono.Vacations</h2>\n<p>Celebrate your upcoming getaway with exclusive savings on luxury mountain cabins, chalets, and lakefront retreats in the Pocono Mountains.</p>\n<p>Book directly with our verified local hosts to save up to 15% on traveler service fees and enjoy seamless vacation planning.</p>`
  );
  const [recipientGroup, setRecipientGroup] = useState<'ALL_GUESTS' | 'ALL_HOSTS' | 'ALL_USERS' | 'SELECTED_USERS'>('ALL_GUESTS');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Users list for SELECTED_USERS option
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [recipientCount, setRecipientCount] = useState<number>(0);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [savedCampaignId, setSavedCampaignId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    updateRecipientPreview();
  }, [recipientGroup, selectedUserIds]);

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('pocono_admin_token');
      const res = await fetchApi<{ data: any[] }>('/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllUsers(res.data || []);
    } catch (err) {
      console.error('Failed to load users for selection:', err);
    }
  };

  const updateRecipientPreview = async () => {
    setPreviewLoading(true);
    try {
      const token = localStorage.getItem('pocono_admin_token');
      const res = await fetchApi<{ data: { totalRecipients: number } }>('/admin/email-campaigns/preview-recipients', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipientGroup, selectedUserIds })
      });
      setRecipientCount(res.data?.totalRecipients || 0);
    } catch (err) {
      console.error('Failed to update recipient preview:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const handleSaveDraft = async () => {
    if (!title.trim() || !subject.trim() || !contentHtml.trim()) {
      setError('Campaign title, email subject, and message content are required.');
      return null;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const token = localStorage.getItem('pocono_admin_token');
      let res: any;

      if (savedCampaignId) {
        res = await fetchApi(`/admin/email-campaigns/${savedCampaignId}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title, subject, contentHtml, recipientGroup, selectedUserIds })
        });
      } else {
        res = await fetchApi('/admin/email-campaigns', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title, subject, contentHtml, recipientGroup, selectedUserIds })
        });
        if (res.data?.id) {
          setSavedCampaignId(res.data.id);
        }
      }

      setSuccessMessage('Campaign draft saved successfully.');
      return res.data?.id || savedCampaignId;
    } catch (err: any) {
      setError(err.message || 'Failed to save draft.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    setError('');
    setSuccessMessage('');

    let campaignId = savedCampaignId;
    if (!campaignId) {
      campaignId = await handleSaveDraft();
    }

    if (!campaignId) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('pocono_admin_token');
      const res = await fetchApi<{ message: string }>(`/admin/email-campaigns/${campaignId}/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMessage(res.message || 'Test email sent successfully to your admin email address!');
    } catch (err: any) {
      setError(err.message || 'Failed to send test email.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndSend = async () => {
    let campaignId = savedCampaignId;
    if (!campaignId) {
      campaignId = await handleSaveDraft();
    }

    if (!campaignId) return;

    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('pocono_admin_token');
      await fetchApi(`/admin/email-campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ selectedUserIds })
      });
      setShowConfirmModal(false);
      router.push(`/admin/email-campaigns/${campaignId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to initiate campaign broadcast.');
      setShowConfirmModal(false);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = allUsers.filter(u =>
    (u.firstName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.lastName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-[#2b2b2b]">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e5e7eb] p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/email-campaigns"
            className="p-2 text-gray-400 hover:text-[#2b2b2b] hover:bg-gray-100 rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <span className="text-xs font-bold text-[#f15e75] uppercase tracking-wider block">Campaign Composer</span>
            <h1 className="text-2xl font-extrabold text-[#2b2b2b]">Create New Campaign</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={loading}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-[#2b2b2b] text-xs font-extrabold rounded-xl transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={handleSendTestEmail}
            disabled={loading}
            className="px-4 py-2.5 bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            <span>Send Test Email</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              const id = await handleSaveDraft();
              if (id) setShowConfirmModal(true);
            }}
            disabled={loading || recipientCount === 0}
            className="px-5 py-2.5 bg-[#f15e75] hover:bg-[#d94f64] disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 uppercase tracking-wider"
          >
            <Send className="w-4 h-4" />
            <span>Confirm &amp; Send</span>
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

      {/* Main Composer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Controls (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-[#e5e7eb] p-6 rounded-2xl shadow-sm space-y-5">
            {/* Title */}
            <div>
              <label className="block text-[11px] font-extrabold text-[#2b2b2b] uppercase mb-1">
                Campaign Title (Internal Reference) *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Independence Day Special Offer"
                className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[#f15e75] focus:bg-white"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-[11px] font-extrabold text-[#2b2b2b] uppercase mb-1">
                Email Subject Line *
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Celebrate Independence Day in the Pocono Mountains 🇺🇸"
                className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[#f15e75] focus:bg-white"
              />
            </div>

            {/* Composer Tabs */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[11px] font-extrabold text-[#2b2b2b] uppercase">
                  Email Message Body (HTML / Formatted Text) *
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('edit')}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                      activeTab === 'edit'
                        ? 'bg-[#f15e75]/10 text-[#f15e75] border border-[#f15e75]/30'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Edit Content
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                      activeTab === 'preview'
                        ? 'bg-[#f15e75]/10 text-[#f15e75] border border-[#f15e75]/30'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>Live Preview</span>
                  </button>
                </div>
              </div>

              {activeTab === 'edit' ? (
                <textarea
                  rows={12}
                  value={contentHtml}
                  onChange={(e) => setContentHtml(e.target.value)}
                  placeholder="Type your email content here. HTML tags (<h2>, <p>, <strong>, <a>, <ul>, <li>) are supported and sanitized server-side."
                  className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] font-mono rounded-xl p-4 text-xs font-medium focus:outline-none focus:border-[#f15e75] focus:bg-white leading-relaxed"
                />
              ) : (
                /* Live Preview Wrapper */
                <div className="border border-gray-200 rounded-xl p-6 bg-white space-y-4">
                  <div className="border-b border-gray-100 pb-3 text-xs">
                    <span className="text-gray-500 font-bold block">Subject Preview:</span>
                    <span className="text-[#2b2b2b] font-extrabold text-sm">{subject || 'No Subject Line Set'}</span>
                  </div>

                  <div className="border border-gray-200 rounded-2xl overflow-hidden max-w-xl mx-auto shadow-sm">
                    <div className="bg-[#2b2b2b] text-white p-5 text-center">
                      <h2 className="text-xl font-extrabold">Pocono.Vacations</h2>
                      <span className="text-xs text-[#f15e75] font-bold uppercase tracking-wider block mt-1">
                        {title || 'Special Announcement'}
                      </span>
                    </div>
                    <div
                      className="p-6 text-gray-700 text-xs leading-relaxed font-medium space-y-3 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-[#2b2b2b] [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-[#f15e75] [&_a]:font-bold"
                      dangerouslySetInnerHTML={{ __html: contentHtml }}
                    />
                    <div className="p-4 bg-gray-50 text-center border-t border-gray-100">
                      <span className="px-5 py-2.5 bg-[#f15e75] text-white font-bold text-xs rounded-lg inline-block uppercase tracking-wider">
                        Explore Pocono Vacation Rentals
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Recipient Selector & Summary */}
        <div className="space-y-6">
          <div className="bg-white border border-[#e5e7eb] p-6 rounded-2xl shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-extrabold text-[#2b2b2b] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#f15e75]" />
                Select Recipients
              </h3>
              <p className="text-xs text-gray-500 font-medium">Choose target audience for this campaign.</p>
            </div>

            {/* Recipient Radio Options */}
            <div className="space-y-2.5 text-xs font-semibold">
              <label className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${recipientGroup === 'ALL_GUESTS' ? 'bg-[#f15e75]/10 border-[#f15e75] text-[#f15e75]' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="recipientGroup"
                    checked={recipientGroup === 'ALL_GUESTS'}
                    onChange={() => setRecipientGroup('ALL_GUESTS')}
                    className="accent-[#f15e75]"
                  />
                  <span>All Registered Guests</span>
                </div>
              </label>

              <label className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${recipientGroup === 'ALL_HOSTS' ? 'bg-[#f15e75]/10 border-[#f15e75] text-[#f15e75]' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="recipientGroup"
                    checked={recipientGroup === 'ALL_HOSTS'}
                    onChange={() => setRecipientGroup('ALL_HOSTS')}
                    className="accent-[#f15e75]"
                  />
                  <span>All Property Hosts</span>
                </div>
              </label>

              <label className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${recipientGroup === 'ALL_USERS' ? 'bg-[#f15e75]/10 border-[#f15e75] text-[#f15e75]' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="recipientGroup"
                    checked={recipientGroup === 'ALL_USERS'}
                    onChange={() => setRecipientGroup('ALL_USERS')}
                    className="accent-[#f15e75]"
                  />
                  <span>All System Users (Guests &amp; Hosts)</span>
                </div>
              </label>

              <label className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${recipientGroup === 'SELECTED_USERS' ? 'bg-[#f15e75]/10 border-[#f15e75] text-[#f15e75]' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="recipientGroup"
                    checked={recipientGroup === 'SELECTED_USERS'}
                    onChange={() => setRecipientGroup('SELECTED_USERS')}
                    className="accent-[#f15e75]"
                  />
                  <span>Specific Selected Users</span>
                </div>
              </label>
            </div>

            {/* Searchable User Selector if SELECTED_USERS is active */}
            {recipientGroup === 'SELECTED_USERS' && (
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user name or email..."
                  className="w-full bg-gray-50 border border-gray-200 text-xs font-semibold p-2.5 rounded-xl focus:outline-none focus:border-[#f15e75]"
                />

                <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 text-xs">
                  {filteredUsers.map((u) => (
                    <label key={u.id} className="flex items-center justify-between p-2.5 hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(u.id)}
                          onChange={() => toggleUserSelection(u.id)}
                          className="accent-[#f15e75] rounded"
                        />
                        <div>
                          <span className="font-bold text-[#2b2b2b] block">{u.firstName || 'User'} {u.lastName || ''}</span>
                          <span className="text-[11px] text-gray-500">{u.email}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded uppercase">
                        {u.role}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Recipient Counter Box */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-1 text-center">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Resolved Target Recipients</span>
              <div className="text-3xl font-extrabold text-[#f15e75]">
                {previewLoading ? <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#f15e75]" /> : `${recipientCount} Users`}
              </div>
              <p className="text-[11px] text-gray-400 font-medium">
                Normalized &amp; Deduplicated by Email
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-[#2b2b2b]">
            <div className="w-12 h-12 bg-rose-50 text-[#f15e75] rounded-full flex items-center justify-center border border-rose-200">
              <Send className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-[#2b2b2b]">Confirm Campaign Broadcast?</h3>
              <p className="text-xs text-gray-600 font-medium leading-relaxed">
                You are about to initiate an email broadcast to <span className="font-bold text-[#f15e75]">{recipientCount} recipients</span>.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs space-y-2 font-medium">
              <div className="flex justify-between">
                <span className="text-gray-500">Title:</span>
                <span className="font-bold text-[#2b2b2b] truncate max-w-[200px]">{title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Subject:</span>
                <span className="font-bold text-[#2b2b2b] truncate max-w-[200px]">{subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Recipients:</span>
                <span className="font-extrabold text-[#f15e75]">{recipientCount} Users</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Batch Strategy:</span>
                <span className="font-bold text-gray-700">10 emails / batch (1.5s delay)</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="w-1/2 py-3 bg-gray-100 hover:bg-gray-200 text-[#2b2b2b] font-bold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAndSend}
                disabled={loading}
                className="w-1/2 py-3 bg-[#f15e75] hover:bg-[#d94f64] text-white font-extrabold text-xs rounded-xl shadow-md transition-all uppercase tracking-wider"
              >
                {loading ? 'Initiating...' : 'Confirm & Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
