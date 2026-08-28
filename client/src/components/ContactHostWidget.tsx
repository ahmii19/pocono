'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Send, CheckCircle, AlertCircle, User, Mail } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function ContactHostWidget({ property }: { property: any }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fill from authenticated user if present
    const userJson = localStorage.getItem('pocono_user');
    if (userJson) {
      try {
        const u = JSON.parse(userJson);
        if (u.firstName || u.lastName) {
          setName(`${u.firstName || ''} ${u.lastName || ''}`.trim());
        }
        if (u.email) {
          setEmail(u.email);
        }
      } catch (e) {}
    }
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Please enter your message.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const token = localStorage.getItem('pocono_token') || localStorage.getItem('pocono_admin_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetchApi<{ success: boolean; data: any }>('/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          propertyId: property.id,
          name: name.trim(),
          email: email.trim(),
          messageText: message.trim()
        })
      });

      if (res.success) {
        setSuccess(true);
        setMessage('');
      } else {
        setError('Failed to send message. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while sending your message.');
    } finally {
      setLoading(false);
    }
  };

  const hostName = property.host
    ? `${property.host.firstName || ''} ${property.host.lastName || ''}`.trim() || 'Host'
    : 'Pocono.Vacations Team';

  return (
    <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-xl space-y-4 text-[#2b2b2b]">
      <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
        <div className="w-10 h-10 rounded-full bg-[#f15e75]/10 flex items-center justify-center text-[#f15e75]">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-base font-bold text-[#2b2b2b]">Contact Host</h4>
          <p className="text-xs text-gray-500 font-medium">Send a direct message about <span className="font-semibold text-[#f15e75]">{property.title}</span></p>
        </div>
      </div>

      {success ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
          <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
          <h5 className="font-bold text-emerald-800 text-sm">Message Sent Successfully!</h5>
          <p className="text-xs text-emerald-700 font-medium">
            Your inquiry has been routed to {hostName}. You will receive a response shortly.
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="mt-2 text-xs text-[#f15e75] underline font-bold"
          >
            Send another message
          </button>
        </div>
      ) : (
        <form onSubmit={handleSendMessage} className="space-y-3">
          <div>
            <label className="block text-[10px] text-gray-500 font-extrabold uppercase mb-1">Your Name</label>
            <div className="relative">
              <input
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-gray-50 border border-gray-200 text-[#2b2b2b] rounded-xl pl-9 pr-3 py-2.5 text-xs font-medium focus:outline-none focus:border-[#f15e75] focus:bg-white"
              />
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-gray-500 font-extrabold uppercase mb-1">Your Email</label>
            <div className="relative">
              <input
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-gray-50 border border-gray-200 text-[#2b2b2b] rounded-xl pl-9 pr-3 py-2.5 text-xs font-medium focus:outline-none focus:border-[#f15e75] focus:bg-white"
              />
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-gray-500 font-extrabold uppercase mb-1">Message</label>
            <textarea
              rows={3}
              placeholder="Is this property available for my dates?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              className="w-full bg-gray-50 border border-gray-200 text-[#2b2b2b] rounded-xl p-3 text-xs font-medium focus:outline-none focus:border-[#f15e75] focus:bg-white resize-none"
            />
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#f15e75] hover:bg-[#f58d9d] disabled:opacity-50 text-white font-extrabold rounded-xl shadow-md transition-all text-xs flex items-center justify-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{loading ? 'Sending...' : 'Send Message'}</span>
          </button>
        </form>
      )}
    </div>
  );
}
