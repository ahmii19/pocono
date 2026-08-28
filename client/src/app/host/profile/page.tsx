'use client';

import { useState, useEffect } from 'react';
import HostNav from '@/components/HostNav';
import { getHostProfile, updateHostProfile } from '@/lib/api';
import { User, Save, Phone, Mail, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function HostProfilePage() {
  const [profile, setProfile] = useState<any | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    const token = localStorage.getItem('pocono_token');
    if (!token) return;

    try {
      const res = await getHostProfile(token);
      setProfile(res.data);
      setFirstName(res.data.firstName || '');
      setLastName(res.data.lastName || '');
      setPhone(res.data.phone || '');
      setBio(res.data.bio || '');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch host profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    const token = localStorage.getItem('pocono_token');
    if (!token) return;

    try {
      const res = await updateHostProfile({ firstName, lastName, phone, bio }, token);
      setSuccess('Profile updated successfully!');
      
      // Update stored user
      const storedUser = localStorage.getItem('pocono_user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        localStorage.setItem('pocono_user', JSON.stringify({ ...u, firstName, lastName, phone }));
        window.dispatchEvent(new Event('pocono_auth_changed'));
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-[#2b2b2b]">
        <HostNav />
        <div className="p-12 text-center text-xs font-bold text-[#4f5962]">Loading profile settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#2b2b2b]">
      <HostNav />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center border-b border-[#d8dce1] pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-[#2b2b2b]">Host Profile</h1>
            <p className="text-xs text-[#4f5962] font-medium mt-1">
              Manage your host contact information and bio displayed on your properties.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-[#fff1f3] border border-[#f15e75]/30 text-[#f15e75] rounded-md text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Profile Card */}
        <form onSubmit={handleSubmit} className="bg-white border border-[#d8dce1] p-6 rounded-md shadow-2xs space-y-6 text-xs font-medium">
          <div className="flex items-center gap-4 pb-4 border-b border-[#d8dce1]">
            <div className="w-14 h-14 rounded-full bg-[#fff1f3] text-[#f15e75] font-extrabold text-xl flex items-center justify-center border border-[#f15e75]/30 shrink-0">
              {(firstName || profile?.email || 'H').charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#2b2b2b]">
                {firstName} {lastName}
              </h3>
              <p className="text-xs text-gray-500">{profile?.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-[#fff1f3] text-[#f15e75] font-extrabold text-[10px] rounded uppercase border border-[#f15e75]/30">
                {profile?.role} ACCOUNT
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#2b2b2b] mb-1">First Name *</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#d8dce1] text-[#2b2b2b] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#f15e75]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#2b2b2b] mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#d8dce1] text-[#2b2b2b] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#f15e75]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#2b2b2b] mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={profile?.email || ''}
                className="w-full bg-gray-100 border border-gray-200 text-gray-500 cursor-not-allowed rounded-md px-3 py-2 text-xs"
              />
              <span className="text-[10px] text-gray-400">Email is fixed to your account credentials</span>
            </div>

            <div>
              <label className="block font-bold text-[#2b2b2b] mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (570) 555-0199"
                className="w-full bg-[#f8fafc] border border-[#d8dce1] text-[#2b2b2b] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#f15e75]"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#2b2b2b] mb-1">Host Bio</label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell guests about yourself and your hospitality experience in the Poconos..."
              className="w-full bg-[#f8fafc] border border-[#d8dce1] text-[#2b2b2b] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#f15e75]"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-[#f15e75] hover:bg-[#d94f64] text-white rounded-md font-extrabold shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Profile...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
