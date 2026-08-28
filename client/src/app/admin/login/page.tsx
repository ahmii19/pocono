'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser } from '@/lib/api';
import { ShieldAlert, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('ahmed@test.com');
  const [password, setPassword] = useState('ahmed123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await loginUser(email, password);
      const user = res.user;

      if (!user || user.role !== 'ADMIN') {
        setError('Access Denied: Account lacks Super Administrator privileges.');
        setLoading(false);
        return;
      }

      // Store in dedicated ADMIN session keys ONLY
      localStorage.setItem('pocono_admin_token', res.token);
      localStorage.setItem('pocono_admin_user', JSON.stringify(user));

      // Redirect to Admin Dashboard
      router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white border border-[#e5e7eb] rounded-md shadow-md p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-[#fff1f3] text-[#f15e75] rounded-md border border-[#f15e75]/20 mb-1">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#2b2b2b]">Pocono Admin CMS</h1>
          <p className="text-xs text-[#6b7280]">Super Administrator Authentication</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-[#fff1f3] border border-[#f15e75]/30 text-[#f15e75] rounded-md text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#4f5962] mb-1">Admin Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3 text-[#9ca3af]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@pocono.vacations"
                className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md pl-10 pr-4 py-2 text-xs font-medium focus:outline-none focus:border-[#f15e75]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4f5962] mb-1">Admin Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3 text-[#9ca3af]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md pl-10 pr-4 py-2 text-xs font-medium focus:outline-none focus:border-[#f15e75]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#f15e75] hover:bg-[#d94f64] text-white font-bold py-2.5 rounded-md text-xs transition-all flex justify-center items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Admin Panel'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-[#e5e7eb]">
          <span className="text-[11px] text-[#6b7280]">
            Pocono.Vacations Isolated CMS Auth System
          </span>
        </div>
      </div>
    </div>
  );
}
