'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import {
  ArrowLeft, Send, MessageSquare, Building2, User, Clock,
  AlertCircle, ShieldAlert, RefreshCw, ChevronDown
} from 'lucide-react';

interface ChatWindowProps {
  threadId: string;
  onBack?: () => void;
  backHref?: string;
  backLabel?: string;
}

export default function ChatWindow({ threadId, onBack, backHref, backLabel }: ChatWindowProps) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const [thread, setThread] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);

  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [hasUnseenNewMessages, setHasUnseenNewMessages] = useState(false);

  // Refs for tracking scroll state across polling refreshes
  const hasInitialScrolledRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const previousLatestMessageIdRef = useRef<string | null>(null);

  // Initialize Current User
  useEffect(() => {
    const userStr = localStorage.getItem('pocono_user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Helper to scroll container to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollTo({
      top: scrollContainerRef.current.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
    isNearBottomRef.current = true;
    setHasUnseenNewMessages(false);
  }, []);

  // Detect user scroll position
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distanceFromBottom < 100;
    isNearBottomRef.current = nearBottom;

    if (nearBottom) {
      setHasUnseenNewMessages(false);
    }
  }, []);

  const getToken = () => {
    return localStorage.getItem('pocono_token') || localStorage.getItem('pocono_admin_token');
  };

  // Fetch thread & messages
  const fetchThread = useCallback(async (isInitial = false) => {
    const token = getToken();
    if (!token) {
      setError('Authentication token missing. Please log in.');
      setLoading(false);
      return;
    }

    if (isInitial) {
      setLoading(true);
    }

    try {
      const res = await fetchApi<{ success: boolean; data: any }>(`/messages/threads/${threadId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const t = res.data;
      if (t) {
        setThread(t);
        const newMsgs = t.messages || [];
        const newLatestMsg = newMsgs.length > 0 ? newMsgs[newMsgs.length - 1] : null;
        const newLatestId = newLatestMsg ? newLatestMsg.id : null;
        const prevLatestId = previousLatestMessageIdRef.current;

        setMessages((prevMsgs) => {
          if (isInitial || prevMsgs.length !== newMsgs.length || newLatestId !== prevLatestId) {
            return newMsgs;
          }
          return prevMsgs;
        });

        setForbidden(false);
        setError('');

        // SCROLL DECISION LOGIC:
        if (isInitial) {
          // Initial Load: scroll to bottom once
          previousLatestMessageIdRef.current = newLatestId;
          setTimeout(() => {
            scrollToBottom(false);
            hasInitialScrolledRef.current = true;
          }, 100);
        } else if (newLatestId && newLatestId !== prevLatestId) {
          // New Message Arrived during polling!
          previousLatestMessageIdRef.current = newLatestId;

          if (isNearBottomRef.current) {
            // User is at bottom -> scroll smoothly to newest message
            setTimeout(() => scrollToBottom(true), 100);
          } else {
            // User is reading older messages -> Keep position & show "New message ↓" indicator
            setHasUnseenNewMessages(true);
          }
        }
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('Forbidden') || err.statusCode === 403)) {
        setForbidden(true);
      } else {
        setError(err.message || 'Unable to load this conversation.');
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [threadId, scrollToBottom]);

  // Initial Fetch & 6-Second Polling Setup
  useEffect(() => {
    hasInitialScrolledRef.current = false;
    previousLatestMessageIdRef.current = null;
    isNearBottomRef.current = true;
    setHasUnseenNewMessages(false);

    fetchThread(true);

    const pollInterval = setInterval(() => {
      fetchThread(false);
    }, 6000);

    return () => clearInterval(pollInterval);
  }, [threadId, fetchThread]);

  // Handle Send Message
  const handleSend = async () => {
    const text = replyText.trim();
    if (!text || sending) return;

    const token = getToken();
    if (!token) {
      setError('Authentication required to send message.');
      return;
    }

    setSending(true);

    try {
      const res = await fetchApi<{ success: boolean; data: any }>(`/messages/threads/${threadId}/reply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messageText: text })
      });

      setReplyText('');

      if (res.data) {
        const sentMsg = res.data;
        previousLatestMessageIdRef.current = sentMsg.id;
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === sentMsg.id);
          if (exists) return prev;
          return [...prev, sentMsg];
        });
      }

      // User's own sent message always forces scroll to bottom
      setTimeout(() => scrollToBottom(true), 50);
      fetchThread(false);
    } catch (err: any) {
      setError(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-[#4f5962] text-xs font-bold gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-[#f15e75]" />
        <span>Loading conversation history...</span>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-[#e5e7eb] rounded-xl text-center space-y-4 shadow-sm">
        <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto" />
        <h2 className="text-xl font-extrabold text-[#2b2b2b]">Conversation Access Denied</h2>
        <p className="text-xs text-[#4f5962]">
          You do not have permission to view or participate in this conversation thread.
        </p>
        <button
          onClick={handleBackClick}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#f15e75] hover:bg-[#d94f64] text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{backLabel || 'Back to Messages'}</span>
        </button>
      </div>
    );
  }

  if (error && !thread) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-[#e5e7eb] rounded-xl text-center space-y-4 shadow-sm">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-extrabold text-[#2b2b2b]">Unable to Load Chat</h2>
        <p className="text-xs text-[#4f5962]">{error}</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => fetchThread(true)}
            className="px-4 py-2 bg-white border border-[#e5e7eb] text-[#2b2b2b] hover:border-[#f15e75] rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            Try Again
          </button>
          <button
            onClick={handleBackClick}
            className="px-4 py-2 bg-[#f15e75] text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            {backLabel || 'Back'}
          </button>
        </div>
      </div>
    );
  }

  // Header details
  const isCurrentUserSender = currentUser && thread?.senderId === currentUser.id;
  const otherParty = isCurrentUserSender ? thread?.receiver || thread?.property?.host : thread?.sender;
  const otherPartyName = otherParty
    ? `${otherParty.firstName || ''} ${otherParty.lastName || ''}`.trim() || otherParty.email
    : 'Participant';
  const propertyTitle = thread?.property?.title || 'Vacation Rental';

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[500px] bg-white border border-[#e5e7eb] rounded-xl shadow-sm overflow-hidden">
      {/* 1. Header */}
      <div className="p-4 border-b border-[#e5e7eb] bg-[#f8fafc] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={handleBackClick}
            className="p-2 bg-white border border-[#e5e7eb] text-[#4f5962] hover:text-[#f15e75] rounded-lg transition-all shrink-0 cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="w-9 h-9 rounded-full bg-[#fff1f3] text-[#f15e75] font-extrabold text-xs flex items-center justify-center border border-[#f15e75]/30 shrink-0">
            {otherPartyName.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-[#2b2b2b] text-sm truncate">{otherPartyName}</h2>
              {otherParty?.role && (
                <span className="px-2 py-0.2 bg-gray-100 text-gray-600 text-[10px] font-bold rounded uppercase">
                  {otherParty.role}
                </span>
              )}
            </div>
            <p className="text-xs text-[#f15e75] font-bold truncate">
              Property: {propertyTitle}
            </p>
          </div>
        </div>

        {thread?.property?.slug && (
          <Link
            href={`/listing/${thread.property.slug}`}
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e5e7eb] text-[#4f5962] hover:text-[#f15e75] text-xs font-semibold rounded-lg transition-all shrink-0"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>View Property</span>
          </Link>
        )}
      </div>

      {/* Inline Error Toast */}
      {error && (
        <div className="p-2.5 bg-[#fff1f3] border-b border-[#f15e75]/30 text-[#f15e75] text-xs font-bold flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-xs font-bold underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Message History Scroll Container */}
      <div className="relative flex-1 min-h-0 bg-white">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="absolute inset-0 p-4 sm:p-6 overflow-y-auto space-y-4 bg-white custom-scrollbar"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2 text-[#9ca3af]">
              <MessageSquare className="w-10 h-10 text-[#f15e75] opacity-50" />
              <p className="text-xs font-bold text-[#2b2b2b]">No messages in this conversation yet.</p>
              <p className="text-[11px]">Send a message below to start chatting.</p>
            </div>
          ) : (
            messages.map((m) => {
              const isMyMessage = currentUser && m.senderId === currentUser.id;
              const senderName = m.sender
                ? `${m.sender.firstName || ''} ${m.sender.lastName || ''}`.trim() || m.sender.email
                : isMyMessage ? 'You' : otherPartyName;

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMyMessage ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-[#6b7280]">
                      {isMyMessage ? 'You' : senderName}
                    </span>
                    <span className="text-[9px] text-[#9ca3af]">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl text-xs font-medium leading-relaxed shadow-2xs whitespace-pre-wrap break-words ${
                      isMyMessage
                        ? 'bg-[#fff1f3] text-[#2b2b2b] border border-[#f15e75]/30 rounded-tr-xs'
                        : 'bg-[#f8fafc] text-[#2b2b2b] border border-[#e5e7eb] rounded-tl-xs'
                    }`}
                  >
                    {m.messageText}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Floating New Message Indicator Button */}
        {hasUnseenNewMessages && (
          <button
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-[#f15e75] hover:bg-[#d94f64] text-white font-extrabold text-xs rounded-full shadow-lg transition-all flex items-center gap-1.5 cursor-pointer animate-bounce"
          >
            <span>New message</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 3. Sticky Message Composer */}
      <div className="p-3 sm:p-4 border-t border-[#e5e7eb] bg-[#f8fafc] shrink-0">
        <div className="flex items-end gap-2 max-w-5xl mx-auto">
          <textarea
            rows={2}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            className="flex-1 bg-white border border-[#e5e7eb] text-[#2b2b2b] rounded-xl p-3 text-xs focus:outline-none focus:border-[#f15e75] resize-none font-medium shadow-xs"
          />
          <button
            onClick={handleSend}
            disabled={sending || !replyText.trim()}
            className="px-5 py-3 bg-[#f15e75] hover:bg-[#d94f64] disabled:opacity-50 text-white font-extrabold rounded-xl text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">{sending ? 'Sending...' : 'Send'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
