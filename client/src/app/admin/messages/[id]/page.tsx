'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAdminMessageThreadById, deleteAdminMessageThread } from '@/lib/api';
import {
  ArrowLeft, MessageSquare, User as UserIcon, Building2, Calendar,
  ExternalLink, Trash2, CheckCircle2, AlertCircle, ShieldCheck
} from 'lucide-react';

export default function AdminMessageDetailPage() {
  const params = useParams();
  const threadId = params.id as string;
  const router = useRouter();

  const [thread, setThread] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    fetchThread();
  }, [threadId]);

  const fetchThread = async () => {
    setLoading(true);
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    try {
      const res = await getAdminMessageThreadById(threadId, token);
      setThread(res.data);
    } catch (e: any) {
      setError(e.message || 'Failed to load message thread details');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    setSendingReply(true);
    try {
      const { fetchApi } = await import('@/lib/api');
      await fetchApi(`/admin/messages/${threadId}/reply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messageText: replyText.trim() })
      });
      setReplyText('');
      fetchThread();
    } catch (err: any) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this conversation thread permanently?')) return;
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    try {
      await deleteAdminMessageThread(threadId, token);
      router.push('/admin/messages');
    } catch (err: any) {
      alert(err.message || 'Error deleting message thread');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-[#4f5962] text-sm font-medium">Loading conversation history...</div>;
  }

  if (!thread) {
    return (
      <div className="p-8 bg-white border border-[#e5e7eb] rounded-md text-center space-y-4 shadow-sm max-w-2xl mx-auto">
        <AlertCircle className="w-8 h-8 text-[#f15e75] mx-auto" />
        <h2 className="text-xl font-bold text-[#2b2b2b]">Thread Not Found</h2>
        <p className="text-xs text-[#6b7280]">No conversation thread matching ID "{threadId}" exists in PostgreSQL.</p>
        <Link href="/admin/messages" className="inline-flex items-center gap-2 px-4 py-2 bg-[#f15e75] text-white rounded-md text-xs font-bold">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Messages List</span>
        </Link>
      </div>
    );
  }

  const senderName = (thread.sender?.firstName || thread.sender?.lastName)
    ? `${thread.sender?.firstName || ''} ${thread.sender?.lastName || ''}`.trim()
    : thread.sender?.email;

  const receiverName = (thread.receiver?.firstName || thread.receiver?.lastName)
    ? `${thread.receiver?.firstName || ''} ${thread.receiver?.lastName || ''}`.trim()
    : thread.receiver?.email;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#e5e7eb] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/messages"
            className="p-2 bg-white border border-[#e5e7eb] text-[#4f5962] hover:text-[#f15e75] rounded-md transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-[#2b2b2b]">Message Conversation</h1>
            <p className="text-xs text-[#6b7280]">Thread ID: {thread.id}</p>
          </div>
        </div>

        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-[#fff1f3] text-[#f15e75] hover:bg-rose-100 rounded-md text-xs font-bold transition-all flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete Thread</span>
        </button>
      </div>

      {/* Participants & Property Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Sender / Guest */}
        <div className="p-4 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-1 text-xs">
          <span className="text-[10px] text-[#6b7280] font-bold uppercase block">Guest / Sender</span>
          {thread.sender ? (
            <div>
              <h5 className="font-bold text-[#2b2b2b] text-sm">{senderName}</h5>
              <p className="text-[11px] text-[#6b7280]">{thread.sender.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-[#f8fafc] border border-[#e5e7eb] rounded text-[10px] font-bold uppercase text-[#4f5962]">
                {thread.sender.role}
              </span>
            </div>
          ) : (
            <span className="text-gray-400">Unassigned</span>
          )}
        </div>

        {/* Receiver / Host */}
        <div className="p-4 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-1 text-xs">
          <span className="text-[10px] text-[#6b7280] font-bold uppercase block">Host / Receiver</span>
          {thread.receiver ? (
            <div>
              <h5 className="font-bold text-[#2b2b2b] text-sm">{receiverName}</h5>
              <p className="text-[11px] text-[#6b7280]">{thread.receiver.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-[#f8fafc] border border-[#e5e7eb] rounded text-[10px] font-bold uppercase text-[#4f5962]">
                {thread.receiver.role}
              </span>
            </div>
          ) : (
            <span className="text-gray-400">Unassigned</span>
          )}
        </div>

        {/* Property */}
        <div className="p-4 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-1 text-xs">
          <span className="text-[10px] text-[#6b7280] font-bold uppercase block">Inquired Rental</span>
          {thread.property ? (
            <div>
              <h5 className="font-bold text-[#2b2b2b] text-sm truncate">{thread.property.title}</h5>
              <Link
                href={`/admin/properties/${thread.property.id}/edit`}
                className="text-[11px] text-[#f15e75] font-bold hover:underline flex items-center gap-1 mt-1"
              >
                <span>View Property Listing</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <span className="text-gray-400">Unassigned Property</span>
          )}
        </div>
      </div>

      {/* Chronological Message Stream */}
      <div className="bg-white border border-[#e5e7eb] rounded-md p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-[#2b2b2b] border-b border-[#e5e7eb] pb-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#f15e75]" />
          <span>Chronological Communication History ({thread.messages?.length || 0} messages)</span>
        </h3>

        {(!thread.messages || thread.messages.length === 0) ? (
          <p className="text-xs text-[#6b7280] text-center py-6">No messages in this thread.</p>
        ) : (
          <div className="space-y-4">
            {thread.messages.map((m: any) => {
              const msgSenderName = (m.sender?.firstName || m.sender?.lastName)
                ? `${m.sender?.firstName || ''} ${m.sender?.lastName || ''}`.trim()
                : m.sender?.email || 'User';

              const isGuest = m.senderId === thread.senderId;

              return (
                <div
                  key={m.id}
                  className={`p-4 rounded-md text-xs space-y-1 border ${
                    isGuest
                      ? 'bg-[#f8fafc] border-[#e5e7eb] text-[#2b2b2b]'
                      : 'bg-[#fff1f3]/50 border-[#f15e75]/20 text-[#2b2b2b]'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#2b2b2b] text-xs">
                      {msgSenderName} ({m.sender?.role || 'USER'})
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
        )}

        {/* Reply Form */}
        <div className="pt-4 border-t border-[#e5e7eb] space-y-3">
          <label className="block text-xs font-bold text-[#2b2b2b]">Reply as Administrator</label>
          <div className="flex gap-2">
            <textarea
              rows={2}
              placeholder="Type your response to append to this conversation thread..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-1 bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md p-3 text-xs focus:outline-none focus:border-[#f15e75] resize-none font-medium"
            />
            <button
              onClick={handleSendReply}
              disabled={sendingReply || !replyText.trim()}
              className="px-5 py-3 bg-[#f15e75] hover:bg-[#f58d9d] disabled:opacity-50 text-white font-extrabold rounded-md text-xs transition-all shrink-0"
            >
              {sendingReply ? 'Sending...' : 'Send Reply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
