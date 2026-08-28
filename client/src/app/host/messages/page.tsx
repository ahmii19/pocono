'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import HostNav from '@/components/HostNav';
import { getHostMessages, fetchApi } from '@/lib/api';
import { MessageSquare, Building2, User, Clock, AlertCircle, X, Send, CheckCircle2 } from 'lucide-react';

export default function HostMessagesPage() {
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedThread, setSelectedThread] = useState<any | null>(null);
  const [selectedThreadDetail, setSelectedThreadDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    const token = localStorage.getItem('pocono_token');
    if (!token) return;

    try {
      const res = await getHostMessages(token);
      setThreads(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch host messages');
    } finally {
      setLoading(false);
    }
  };

  const openThreadModal = async (t: any) => {
    setSelectedThread(t);
    setLoadingDetail(true);
    const token = localStorage.getItem('pocono_token');
    if (!token) return;

    try {
      const res = await fetchApi<{ success: boolean; data: any }>(`/messages/threads/${t.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedThreadDetail(res.data);
      // Refresh list to update unread counts
      fetchMessages();
    } catch (err: any) {
      setError(err.message || 'Error opening conversation');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedThread) return;
    const token = localStorage.getItem('pocono_token');
    if (!token) return;

    setSendingReply(true);
    try {
      await fetchApi(`/messages/threads/${selectedThread.id}/reply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messageText: replyText.trim() })
      });
      setReplyText('');
      // Re-fetch thread detail
      const res = await fetchApi<{ success: boolean; data: any }>(`/messages/threads/${selectedThread.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedThreadDetail(res.data);
      fetchMessages();
    } catch (err: any) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const sortedThreads = [...threads].sort((a, b) =>
    new Date(b.lastMessageAt || b.updatedAt).getTime() - new Date(a.lastMessageAt || a.updatedAt).getTime()
  );
  const totalUnreadCount = sortedThreads.reduce((total: number, t: any) => total + (t.unreadCount || 0), 0);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#2b2b2b]">
      <HostNav />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center border-b border-[#d8dce1] pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-[#2b2b2b]">Guest Messages &amp; Inquiries</h1>
              <span className="px-2.5 py-0.5 bg-gray-100 border border-gray-200 text-[#4f5962] text-xs font-bold rounded-full">
                Total {sortedThreads.length}
              </span>
              {totalUnreadCount > 0 ? (
                <span className="px-3 py-1 bg-[#f15e75] text-white font-extrabold text-xs rounded-full shadow-xs">
                  {totalUnreadCount} UNREAD
                </span>
              ) : (
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-full">
                  All Messages Read
                </span>
              )}
            </div>
            <p className="text-xs text-[#4f5962] font-medium mt-1">
              Conversations and guest inquiries regarding your vacation rental listings.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-[#fff1f3] border border-[#f15e75]/30 text-[#f15e75] rounded-md text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Message Threads List */}
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-[#4f5962]">Loading message conversations...</div>
        ) : sortedThreads.length === 0 ? (
          <div className="bg-white border border-[#d8dce1] rounded-md p-12 text-center space-y-3 shadow-2xs">
            <MessageSquare className="w-10 h-10 text-[#f15e75] mx-auto opacity-70" />
            <h3 className="text-lg font-bold text-[#2b2b2b]">No Message Conversations Yet</h3>
            <p className="text-xs text-[#6b7280]">When guests send inquiries regarding your properties, they will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[550px] sm:max-h-[600px] lg:max-h-[650px] overflow-y-auto pr-1.5 custom-scrollbar">
            {sortedThreads.map((t) => {
              const lastMsg = t.messages && t.messages.length > 0 ? t.messages[0] : null;
              const guestName = (t.sender?.firstName || t.sender?.lastName)
                ? `${t.sender?.firstName || ''} ${t.sender?.lastName || ''}`.trim()
                : t.sender?.email || 'Guest Inquiry';

              return (
                <div
                  key={t.id}
                  className="bg-white border border-[#d8dce1] p-5 rounded-md shadow-2xs space-y-3 hover:border-[#f15e75]/50 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#fff1f3] text-[#f15e75] font-extrabold text-sm flex items-center justify-center border border-[#f15e75]/30 shrink-0">
                        {guestName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-[#2b2b2b] text-sm">{guestName}</h4>
                          {t.unreadCount > 0 && (
                            <span className="px-2 py-0.5 bg-[#f15e75] text-white rounded-full text-[10px] font-extrabold">
                              {t.unreadCount} NEW
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#f15e75] font-bold">
                          Property: {t.property?.title || 'Rental Listing'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-[10px] font-semibold text-gray-400">
                        {new Date(t.lastMessageAt || t.updatedAt).toLocaleString()}
                      </span>
                      <Link
                        href={`/messages/${t.id}?from=host`}
                        className="px-3.5 py-1.5 bg-[#f15e75] hover:bg-[#d94f64] text-white font-extrabold text-xs rounded-md shadow-2xs transition-all inline-flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Open Full Chat</span>
                      </Link>
                    </div>
                  </div>

                  {lastMsg && (
                    <div className="p-3 bg-[#f8fafc] border border-gray-200 rounded text-xs text-[#4f5962]">
                      <p className="line-clamp-2">{lastMsg.messageText || lastMsg.content}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Conversation Modal */}
        {selectedThread && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white border border-[#e5e7eb] rounded-xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] flex flex-col">
              <button
                onClick={() => { setSelectedThread(null); setSelectedThreadDetail(null); }}
                className="absolute right-4 top-4 text-[#9ca3af] hover:text-[#2b2b2b]"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1 border-b border-[#e5e7eb] pb-3 shrink-0">
                <span className="text-[10px] text-[#f15e75] font-extrabold uppercase tracking-wider">Property Inquiry</span>
                <h3 className="text-xl font-extrabold text-[#2b2b2b]">
                  {selectedThread.property?.title || 'Vacation Rental'}
                </h3>
                <p className="text-xs text-[#6b7280]">
                  Guest: <span className="font-bold text-[#2b2b2b]">{selectedThread.sender?.firstName || selectedThread.sender?.email}</span>
                </p>
              </div>

              {loadingDetail ? (
                <div className="py-12 text-center text-xs font-bold text-[#4f5962]">Loading messages...</div>
              ) : selectedThreadDetail ? (
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {selectedThreadDetail.messages?.map((m: any) => {
                    const senderName = m.sender
                      ? `${m.sender.firstName || ''} ${m.sender.lastName || ''}`.trim() || m.sender.email
                      : 'User';
                    const isHost = m.sender?.role === 'HOST' || m.sender?.role === 'ADMIN';

                    return (
                      <div
                        key={m.id}
                        className={`p-4 rounded-xl text-xs space-y-1 border ${
                          isHost
                            ? 'bg-[#fff1f3]/60 border-[#f15e75]/30 text-[#2b2b2b] ml-8'
                            : 'bg-[#f8fafc] border-[#e5e7eb] text-[#2b2b2b] mr-8'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[#2b2b2b] text-xs">
                            {senderName} ({m.sender?.role || 'GUEST'})
                          </span>
                          <span className="text-[10px] text-[#6b7280]">
                            {new Date(m.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-[#4f5962] whitespace-pre-wrap">
                          {m.messageText}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {/* Reply Input */}
              <div className="pt-3 border-t border-[#e5e7eb] space-y-3 shrink-0">
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    placeholder="Write a response to the guest..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-xl p-3 text-xs focus:outline-none focus:border-[#f15e75] resize-none font-medium"
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={sendingReply || !replyText.trim()}
                    className="px-5 py-3 bg-[#f15e75] hover:bg-[#f58d9d] disabled:opacity-50 text-white font-extrabold rounded-xl text-xs transition-all shrink-0 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingReply ? 'Sending...' : 'Reply'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
