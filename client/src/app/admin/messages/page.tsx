'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getAdminMessageThreads, deleteAdminMessageThread,
  getAdminContactMessages, updateAdminContactMessageStatus, deleteAdminContactMessage
} from '@/lib/api';
import {
  MessageSquare, Search, RefreshCw, Eye, Trash2, User as UserIcon,
  Building2, Calendar, CheckCircle2, AlertCircle, Mail, Phone,
  FileText, Filter, X, Check, Archive
} from 'lucide-react';

export default function AdminMessagesPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'threads' | 'contact'>('all');

  // Guest & Host Threads state
  const [threads, setThreads] = useState<any[]>([]);
  const [threadMetrics, setThreadMetrics] = useState<any>({ total: 0, unread: 0, read: 0 });

  // Contact Us Messages state
  const [contactMsgs, setContactMsgs] = useState<any[]>([]);
  const [contactMetrics, setContactMetrics] = useState<any>({ total: 0, new: 0, read: 0, replied: 0, archived: 0 });
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorAlert, setErrorAlert] = useState('');
  const [successAlert, setSuccessAlert] = useState('');

  // Contact Message Detail Modal
  const [selectedContactMsg, setSelectedContactMsg] = useState<any | null>(null);

  useEffect(() => {
    fetchAllData();
  }, [searchTerm, statusFilter, activeTab]);

  const fetchAllData = async () => {
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;
    setLoading(true);
    try {
      const threadParams: Record<string, any> = {};
      if (searchTerm) threadParams.search = searchTerm;

      const contactParams: Record<string, any> = {};
      if (searchTerm) contactParams.search = searchTerm;
      if (statusFilter !== 'ALL') contactParams.status = statusFilter;

      const [threadRes, contactRes] = await Promise.all([
        getAdminMessageThreads(token, threadParams),
        getAdminContactMessages(token, contactParams)
      ]);

      setThreads(threadRes.data || []);
      if (threadRes.metrics) setThreadMetrics(threadRes.metrics);

      setContactMsgs(contactRes.data || []);
      if (contactRes.metrics) setContactMetrics(contactRes.metrics);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteThread = async (id: string) => {
    if (!confirm('Are you sure you want to delete this conversation thread?')) return;
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    setErrorAlert('');
    setSuccessAlert('');
    try {
      await deleteAdminMessageThread(id, token);
      setSuccessAlert('Conversation thread deleted successfully.');
      setTimeout(() => setSuccessAlert(''), 3000);
      fetchAllData();
    } catch (err: any) {
      setErrorAlert(err.message || 'Error deleting thread');
    }
  };

  const handleUpdateContactStatus = async (id: string, newStatus: string) => {
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    setErrorAlert('');
    setSuccessAlert('');
    try {
      const res = await updateAdminContactMessageStatus(id, newStatus, token);
      setSuccessAlert(`Contact message status updated to ${newStatus}.`);
      if (selectedContactMsg && selectedContactMsg.id === id) {
        setSelectedContactMsg(res.data);
      }
      setTimeout(() => setSuccessAlert(''), 3000);
      fetchAllData();
    } catch (err: any) {
      setErrorAlert(err.message || 'Error updating status');
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact inquiry?')) return;
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    setErrorAlert('');
    setSuccessAlert('');
    try {
      await deleteAdminContactMessage(id, token);
      setSuccessAlert('Contact inquiry deleted.');
      if (selectedContactMsg?.id === id) setSelectedContactMsg(null);
      setTimeout(() => setSuccessAlert(''), 3000);
      fetchAllData();
    } catch (err: any) {
      setErrorAlert(err.message || 'Error deleting message');
    }
  };

  const totalUnreadCount = (threadMetrics.unread || 0) + (contactMetrics.new || 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#e5e7eb] pb-6">
        <div>
          <span className="text-[#f15e75] text-xs font-bold uppercase tracking-wider block mb-1">
            PostgreSQL Messages &amp; Contact Inquiries
          </span>
          <h1 className="text-3xl font-extrabold text-[#2b2b2b]">Communication Center</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAllData}
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-1">
          <span className="text-[11px] text-[#6b7280] font-bold uppercase">Total Communications</span>
          <div className="text-2xl font-extrabold text-[#2b2b2b]">{threadMetrics.total + contactMetrics.total}</div>
          <span className="text-[10px] text-[#6b7280]">Threads &amp; Form Submissions</span>
        </div>
        <div className="p-4 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-1">
          <span className="text-[11px] text-[#f15e75] font-bold uppercase">Unread / New Inquiries</span>
          <div className="text-2xl font-extrabold text-[#f15e75]">{totalUnreadCount}</div>
          <span className="text-[10px] text-[#6b7280]">New Contact Form &amp; Threads</span>
        </div>
        <div className="p-4 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-1">
          <span className="text-[11px] text-[#2b2b2b] font-bold uppercase">Guest &amp; Host Threads</span>
          <div className="text-2xl font-extrabold text-[#2b2b2b]">{threadMetrics.total}</div>
          <span className="text-[10px] text-[#6b7280]">Rental Inquiries</span>
        </div>
        <div className="p-4 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-1">
          <span className="text-[11px] text-emerald-700 font-bold uppercase">Contact Us Messages</span>
          <div className="text-2xl font-extrabold text-emerald-700">{contactMetrics.total}</div>
          <span className="text-[10px] text-[#6b7280]">Public Submissions</span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 border border-[#e5e7eb] rounded-md shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 border-b sm:border-b-0 border-[#e5e7eb] pb-2 sm:pb-0 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-[#f15e75] text-white shadow-sm'
                  : 'bg-[#f8fafc] text-[#4f5962] hover:bg-[#fff1f3] hover:text-[#f15e75]'
              }`}
            >
              All ({threads.length + contactMsgs.length})
            </button>
            <button
              onClick={() => setActiveTab('threads')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                activeTab === 'threads'
                  ? 'bg-[#f15e75] text-white shadow-sm'
                  : 'bg-[#f8fafc] text-[#4f5962] hover:bg-[#fff1f3] hover:text-[#f15e75]'
              }`}
            >
              Guest &amp; Host ({threads.length})
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'contact'
                  ? 'bg-[#f15e75] text-white shadow-sm'
                  : 'bg-[#f8fafc] text-[#4f5962] hover:bg-[#fff1f3] hover:text-[#f15e75]'
              }`}
            >
              <span>Contact Us</span>
              {contactMetrics.new > 0 && (
                <span className="px-1.5 py-0.5 bg-rose-600 text-white rounded-full text-[10px] font-extrabold">
                  {contactMetrics.new}
                </span>
              )}
            </button>
          </div>

          {/* Search & Status Filter */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#9ca3af]" />
              <input
                type="text"
                placeholder="Search name, email, subject, message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-[#f15e75]"
              />
            </div>

            {(activeTab === 'contact' || activeTab === 'all') && (
              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-[#9ca3af]" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#f15e75]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="NEW">NEW</option>
                  <option value="READ">READ</option>
                  <option value="REPLIED">REPLIED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Section */}
      {loading ? (
        <div className="p-12 text-center text-[#4f5962] text-sm font-medium">
          Loading messages from PostgreSQL...
        </div>
      ) : (
        <div className="space-y-8">
          {/* CONTACT US MESSAGES TABLE */}
          {(activeTab === 'all' || activeTab === 'contact') && (
            <div className="bg-white border border-[#e5e7eb] rounded-md overflow-hidden shadow-sm space-y-2">
              <div className="p-4 bg-[#f8fafc] border-b border-[#e5e7eb] flex justify-between items-center">
                <h3 className="font-extrabold text-[#2b2b2b] text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#f15e75]" />
                  <span>Public Contact Us Submissions ({contactMsgs.length})</span>
                </h3>
              </div>

              {contactMsgs.length === 0 ? (
                <div className="p-8 text-center text-[#6b7280] text-xs">
                  No Contact Us form submissions found matching criteria.
                </div>
              ) : (
                <table className="w-full text-left text-xs text-[#4f5962]">
                  <thead className="bg-[#f8fafc] text-[#6b7280] uppercase text-[10px] font-bold border-b border-[#e5e7eb]">
                    <tr>
                      <th className="p-4">Sender Name / Email</th>
                      <th className="p-4">Phone</th>
                      <th className="p-4">Subject</th>
                      <th className="p-4">Message Preview</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Date</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e7eb]">
                    {contactMsgs.map((msg) => (
                      <tr key={msg.id} className={`hover:bg-[#fff1f3]/30 transition-colors ${msg.status === 'NEW' ? 'bg-amber-50/50 font-bold' : ''}`}>
                        <td className="p-4">
                          <button
                            onClick={() => setSelectedContactMsg(msg)}
                            className="font-bold text-[#2b2b2b] hover:text-[#f15e75] text-left block"
                          >
                            {msg.name}
                          </button>
                          <span className="text-[10px] text-[#6b7280] block">{msg.email}</span>
                        </td>

                        <td className="p-4 text-[#6b7280]">
                          {msg.phone || 'N/A'}
                        </td>

                        <td className="p-4 font-bold text-[#2b2b2b]">
                          {msg.subject || 'General Inquiry'}
                        </td>

                        <td className="p-4 font-medium text-[#2b2b2b]">
                          <p className="line-clamp-1 max-w-xs">{msg.message}</p>
                        </td>

                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              msg.status === 'NEW'
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : msg.status === 'READ'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : msg.status === 'REPLIED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}
                          >
                            {msg.status}
                          </span>
                        </td>

                        <td className="p-4 text-[#6b7280]">
                          {new Date(msg.createdAt).toLocaleDateString()}
                        </td>

                        <td className="p-4 text-center space-x-1.5">
                          <button
                            onClick={() => setSelectedContactMsg(msg)}
                            className="p-1.5 inline-block bg-[#f8fafc] hover:bg-[#fff1f3] text-[#4f5962] hover:text-[#f15e75] border border-[#e5e7eb] rounded-md transition-all"
                            title="View Contact Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteContact(msg.id)}
                            className="p-1.5 inline-block bg-[#fff1f3] text-[#f15e75] hover:bg-rose-100 rounded-md transition-all"
                            title="Delete Contact Inquiry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* GUEST & HOST MESSAGES TABLE */}
          {(activeTab === 'all' || activeTab === 'threads') && (
            <div className="bg-white border border-[#e5e7eb] rounded-md overflow-hidden shadow-sm space-y-2">
              <div className="p-4 bg-[#f8fafc] border-b border-[#e5e7eb] flex justify-between items-center">
                <h3 className="font-extrabold text-[#2b2b2b] text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#f15e75]" />
                  <span>Guest &amp; Host Rental Inquiries ({threads.length})</span>
                </h3>
              </div>

              {threads.length === 0 ? (
                <div className="p-8 text-center text-[#6b7280] text-xs">
                  No Guest &amp; Host message threads found in PostgreSQL.
                </div>
              ) : (
                <table className="w-full text-left text-xs text-[#4f5962]">
                  <thead className="bg-[#f8fafc] text-[#6b7280] uppercase text-[10px] font-bold border-b border-[#e5e7eb]">
                    <tr>
                      <th className="p-4">Thread ID</th>
                      <th className="p-4">Guest Sender</th>
                      <th className="p-4">Host Receiver</th>
                      <th className="p-4">Property</th>
                      <th className="p-4">Latest Message Preview</th>
                      <th className="p-4">Date</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e7eb]">
                    {threads.map((t) => {
                      const guestName = (t.sender?.firstName || t.sender?.lastName)
                        ? `${t.sender?.firstName || ''} ${t.sender?.lastName || ''}`.trim()
                        : t.sender?.email;

                      const hostName = (t.receiver?.firstName || t.receiver?.lastName)
                        ? `${t.receiver?.firstName || ''} ${t.receiver?.lastName || ''}`.trim()
                        : t.receiver?.email;

                      const latestMsg = t.messages?.[0]?.messageText || 'No messages';

                      return (
                        <tr key={t.id} className="hover:bg-[#fff1f3]/30 transition-colors">
                          <td className="p-4 font-mono font-bold text-[#2b2b2b]">
                            <Link href={`/admin/messages/${t.id}`} className="hover:text-[#f15e75]">
                              {t.id.substring(0, 8)}...
                            </Link>
                          </td>

                          <td className="p-4">
                            {t.sender ? (
                              <div>
                                <Link href={`/admin/users/${t.sender.id}`} className="font-bold text-[#2b2b2b] hover:text-[#f15e75]">
                                  {guestName}
                                </Link>
                                <span className="text-[10px] text-[#6b7280] block">{t.sender.email}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">Unassigned</span>
                            )}
                          </td>

                          <td className="p-4">
                            {t.receiver ? (
                              <div>
                                <Link href={`/admin/users/${t.receiver.id}`} className="font-bold text-[#2b2b2b] hover:text-[#f15e75]">
                                  {hostName}
                                </Link>
                                <span className="text-[10px] text-[#6b7280] block">{t.receiver.email}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">Unassigned</span>
                            )}
                          </td>

                          <td className="p-4">
                            {t.property ? (
                              <Link href={`/admin/properties/${t.property.id}/edit`} className="font-bold text-[#2b2b2b] hover:text-[#f15e75] block truncate max-w-[160px]">
                                {t.property.title}
                              </Link>
                            ) : (
                              <span className="text-gray-400">Unassigned</span>
                            )}
                          </td>

                          <td className="p-4 font-medium text-[#2b2b2b]">
                            <p className="line-clamp-1 max-w-xs">{latestMsg}</p>
                          </td>

                          <td className="p-4 text-[#6b7280]">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </td>

                          <td className="p-4 text-center space-x-1.5">
                            <Link
                              href={`/admin/messages/${t.id}`}
                              className="p-1.5 inline-block bg-[#f8fafc] hover:bg-[#fff1f3] text-[#4f5962] hover:text-[#f15e75] border border-[#e5e7eb] rounded-md transition-all"
                              title="View Conversation"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDeleteThread(t.id)}
                              className="p-1.5 inline-block bg-[#fff1f3] text-[#f15e75] hover:bg-rose-100 rounded-md transition-all"
                              title="Delete Thread"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* CONTACT US DETAIL MODAL */}
      {selectedContactMsg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#e5e7eb] rounded-xl max-w-xl w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedContactMsg(null)}
              className="absolute right-4 top-4 text-[#9ca3af] hover:text-[#2b2b2b]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 border-b border-[#e5e7eb] pb-3">
              <span className="text-[10px] text-[#f15e75] font-extrabold uppercase tracking-wider">Contact Us Submission</span>
              <h3 className="text-xl font-extrabold text-[#2b2b2b]">{selectedContactMsg.subject || 'General Inquiry'}</h3>
              <span className="text-xs text-[#6b7280]">Received on {new Date(selectedContactMsg.createdAt).toLocaleString()}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-[#f8fafc] p-3 rounded-lg border border-[#e5e7eb]">
              <div>
                <span className="text-[10px] text-[#6b7280] uppercase font-bold block">Sender Name</span>
                <span className="font-bold text-[#2b2b2b]">{selectedContactMsg.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#6b7280] uppercase font-bold block">Email Address</span>
                <span className="font-mono text-[#2b2b2b]">{selectedContactMsg.email}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#6b7280] uppercase font-bold block">Phone Number</span>
                <span className="text-[#2b2b2b]">{selectedContactMsg.phone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#6b7280] uppercase font-bold block">Current Status</span>
                <span className="font-extrabold text-[#f15e75]">{selectedContactMsg.status}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-[#6b7280] uppercase font-bold block">Message Content</span>
              <div className="p-4 bg-[#f8fafc] border border-[#e5e7eb] rounded-lg text-xs leading-relaxed text-[#2b2b2b] max-h-60 overflow-y-auto whitespace-pre-wrap">
                {selectedContactMsg.message}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-[#e5e7eb] flex flex-wrap gap-2 justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateContactStatus(selectedContactMsg.id, 'READ')}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-bold flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Mark Read</span>
                </button>
                <button
                  onClick={() => handleUpdateContactStatus(selectedContactMsg.id, 'REPLIED')}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-bold flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Replied</span>
                </button>
                <button
                  onClick={() => handleUpdateContactStatus(selectedContactMsg.id, 'ARCHIVED')}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded text-xs font-bold flex items-center gap-1"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive</span>
                </button>
              </div>

              <button
                onClick={() => handleDeleteContact(selectedContactMsg.id)}
                className="px-3 py-1.5 bg-[#fff1f3] text-[#f15e75] hover:bg-rose-100 rounded text-xs font-bold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
