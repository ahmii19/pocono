'use client';

import { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function ContactUsPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetchApi<{ success: boolean; message: string }>('/contact', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (res.success) {
        setSuccessMsg(res.message || 'Thank you! Your message has been sent successfully.');
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting inquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 bg-[#f8f9fa] text-[#2b2b2b]">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-[#f15e75] text-xs font-extrabold uppercase tracking-widest block">Get In Touch</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#2b2b2b]">Contact Pocono.Vacations</h1>
        <p className="text-gray-600 text-sm">
          Have questions about booking a property or listing your cabin? Send us a message and our team will get back to you promptly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {/* Contact Info Box */}
        <div className="bg-[#2b2b2b] text-white p-8 rounded-3xl space-y-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="text-xl font-bold border-b border-gray-700 pb-3">Contact Details</h3>
            
            <div className="space-y-4 text-xs font-semibold text-gray-300">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#f15e75] shrink-0 mt-0.5" />
                <div>
                  <span className="block font-bold text-white">Location</span>
                  <span>Pocono Mountains, Pennsylvania, USA</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[#f15e75] shrink-0 mt-0.5" />
                <div>
                  <span className="block font-bold text-white">Email</span>
                  <span>support@pocono.vacations</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-[#f15e75] shrink-0 mt-0.5" />
                <div>
                  <span className="block font-bold text-white">Direct Booking Support</span>
                  <span>Direct Communication with Verified Local Hosts</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-800/80 border border-gray-700 rounded-2xl text-xs text-gray-300">
            <span className="font-bold text-[#f15e75] block mb-1">⚡ Instant Host Direct Link</span>
            <span>Save up to 15% on booking fees when connecting directly with property managers.</span>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2 bg-white border border-gray-200 p-8 sm:p-10 rounded-3xl shadow-sm space-y-6">
          <h3 className="text-xl font-bold text-[#2b2b2b]">Send Us a Message</h3>

          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold text-gray-700 uppercase mb-1">Your Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full bg-gray-50 border border-gray-200 text-[#2b2b2b] rounded-xl p-3 text-xs font-semibold focus:outline-none focus:border-[#f15e75] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-gray-700 uppercase mb-1">Your Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  className="w-full bg-gray-50 border border-gray-200 text-[#2b2b2b] rounded-xl p-3 text-xs font-semibold focus:outline-none focus:border-[#f15e75] focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold text-gray-700 uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(570) 555-0199"
                  className="w-full bg-gray-50 border border-gray-200 text-[#2b2b2b] rounded-xl p-3 text-xs font-semibold focus:outline-none focus:border-[#f15e75] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-gray-700 uppercase mb-1">Subject</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Booking inquiry..."
                  className="w-full bg-gray-50 border border-gray-200 text-[#2b2b2b] rounded-xl p-3 text-xs font-semibold focus:outline-none focus:border-[#f15e75] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-gray-700 uppercase mb-1">Message *</label>
              <textarea
                required
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Write your message here..."
                className="w-full bg-gray-50 border border-gray-200 text-[#2b2b2b] rounded-xl p-3 text-xs font-semibold focus:outline-none focus:border-[#f15e75] focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#f15e75] hover:bg-[#f58d9d] text-white font-extrabold rounded-xl shadow-lg shadow-[#f15e75]/30 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Sending...' : 'Send Message'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
