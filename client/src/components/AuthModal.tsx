'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Mail, Lock, User, Phone, AlertCircle, CheckCircle2, ShieldCheck, Heart, Sparkles, Building2 } from 'lucide-react';
import { loginUser, registerUser } from '@/lib/api';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'signup';
  intent?: 'guest' | 'host';
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AuthModal({ isOpen, initialMode = 'login', intent = 'guest', onClose, onSuccess }: AuthModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [currentIntent, setCurrentIntent] = useState<'guest' | 'host'>(intent);

  // Form States - Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Form States - Signup
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Synchronize initial mode & intent when modal opens or props change
  useEffect(() => {
    setMode(initialMode);
    setCurrentIntent(intent);
    setError('');
  }, [initialMode, intent, isOpen]);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isHostFlow = currentIntent === 'host';

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await loginUser(loginEmail, loginPassword, currentIntent);
      localStorage.setItem('pocono_token', res.token);
      localStorage.setItem('pocono_user', JSON.stringify(res.user));
      
      // Dispatch custom event to notify Navbar / app state of auth change
      window.dispatchEvent(new Event('pocono_auth_changed'));

      if (onSuccess) onSuccess();
      onClose();

      // Redirect based on resolved user role
      if (res.user.role === 'HOST') {
        router.push('/host/dashboard');
      } else if (res.user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await registerUser({
        email: signupEmail,
        password: signupPassword,
        firstName: signupFirstName,
        lastName: signupLastName
      }, currentIntent);

      localStorage.setItem('pocono_token', res.token);
      localStorage.setItem('pocono_user', JSON.stringify(res.user));

      // Dispatch custom event to notify Navbar / app state of auth change
      window.dispatchEvent(new Event('pocono_auth_changed'));

      if (onSuccess) onSuccess();
      onClose();

      if (res.user.role === 'HOST') {
        router.push('/host/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check details.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setError('');
    // Notice: currentIntent is explicitly PRESERVED when toggling mode
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      {/* Modal Container */}
      <div
        className="relative w-full max-w-4xl bg-white border border-[#e5e7eb] rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh] transition-transform animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 text-gray-400 hover:text-[#2b2b2b] hover:bg-gray-100 rounded-full transition-all"
          aria-label="Close authentication modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LEFT COLUMN: BRANDING & WELCOME */}
        <div className="w-full md:w-[42%] bg-[#2b2b2b] text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden shrink-0">
          {/* Decorative Background Glow Accent */}
          <div className="absolute -top-16 -left-16 w-48 h-48 bg-[#f15e75]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-[#f15e75]/15 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Header */}
          <div className="space-y-6 relative z-10">
            <img
              src="/wp-content/uploads/2026/05/PV6_no-bg-_300.png"
              alt="Pocono.Vacations"
              className="h-[36px] w-auto object-contain brightness-0 invert"
            />

            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#f15e75]/20 border border-[#f15e75]/40 text-[#f15e75] rounded-full text-[11px] font-extrabold uppercase tracking-wider">
                {isHostFlow ? <Building2 className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{isHostFlow ? 'Become a Host Partner' : 'Pocono Guest Platform'}</span>
              </span>

              <h2 id="auth-modal-title" className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                {isHostFlow
                  ? (mode === 'login' ? 'Host Login' : 'Become a Host')
                  : (mode === 'login' ? 'Welcome Back' : 'Create Your Account')}
              </h2>

              <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                {isHostFlow
                  ? 'Sign in or create an account to list your Pocono vacation rental, manage bookings, and access your Host Dashboard.'
                  : (mode === 'login'
                    ? 'Sign in to access your bookings, saved rentals, and direct communication with verified hosts.'
                    : 'Create an account to unlock direct host rates, save your favorite lakefront chalets, and manage your stays.')}
              </p>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="mt-8 pt-6 border-t border-gray-700/80 space-y-3 relative z-10 text-xs text-gray-300 font-medium hidden sm:block">
            {isHostFlow ? (
              <>
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-[#f15e75] shrink-0" />
                  <span>List Unlimited Mountain &amp; Lakefront Chalets</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#f15e75] shrink-0" />
                  <span>Dedicated Host Dashboard &amp; Calendar Control</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#f15e75] shrink-0" />
                  <span>Direct Guest Bookings &amp; Verified Reviews</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#f15e75] shrink-0" />
                  <span>Direct Booking with Zero Hidden Fees</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Heart className="w-4 h-4 text-[#f15e75] shrink-0" />
                  <span>Save &amp; Compare Luxury Chalets &amp; Cabins</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#f15e75] shrink-0" />
                  <span>Verified Mountain &amp; Lakefront Communities</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: LOGIN / SIGNUP FORM */}
        <div className="w-full md:w-[58%] p-8 sm:p-10 overflow-y-auto flex flex-col justify-between bg-white text-[#2b2b2b]">
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-extrabold text-[#2b2b2b]">
                {isHostFlow
                  ? (mode === 'login' ? 'Host Account Login' : 'Register Host Account')
                  : (mode === 'login' ? 'Log in to Your Account' : 'Create Your Guest Account')}
              </h3>
              <p className="text-gray-500 text-xs mt-1">
                {isHostFlow
                  ? 'Enter credentials to access your Host Dashboard'
                  : (mode === 'login'
                    ? 'Enter your account email and password below'
                    : 'Fill in your details to register as a Guest')}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-[#fff1f3] border border-[#f15e75]/30 rounded-xl text-[#f15e75] text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* LOGIN FORM */}
            {mode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-[#2b2b2b] uppercase mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-xl pl-10 pr-4 py-3 text-xs font-semibold focus:outline-none focus:border-[#f15e75] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-[#2b2b2b] uppercase mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-xl pl-10 pr-4 py-3 text-xs font-semibold focus:outline-none focus:border-[#f15e75] focus:bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#f15e75] hover:bg-[#d94f64] text-white font-extrabold rounded-xl shadow-md hover:shadow-lg transition-all text-xs uppercase tracking-wider disabled:opacity-50 mt-2"
                >
                  {loading ? 'Authenticating...' : (isHostFlow ? 'Sign In as Host' : 'Sign In')}
                </button>
              </form>
            ) : (
              /* SIGNUP FORM */
              <form onSubmit={handleSignupSubmit} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold text-[#2b2b2b] uppercase mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={signupFirstName}
                      onChange={(e) => setSignupFirstName(e.target.value)}
                      placeholder="John"
                      className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#f15e75] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-[#2b2b2b] uppercase mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={signupLastName}
                      onChange={(e) => setSignupLastName(e.target.value)}
                      placeholder="Doe"
                      className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#f15e75] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-[#2b2b2b] uppercase mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#f15e75] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-[#2b2b2b] uppercase mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#f15e75] focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#f15e75] hover:bg-[#d94f64] text-white font-extrabold rounded-xl shadow-md hover:shadow-lg transition-all text-xs uppercase tracking-wider disabled:opacity-50 mt-2"
                >
                  {loading ? 'Creating Account...' : (isHostFlow ? 'Create Host Account' : 'Register Guest Account')}
                </button>
              </form>
            )}
          </div>

          {/* Bottom Mode Switch Link */}
          <div className="mt-6 pt-4 border-t border-[#e5e7eb] text-center text-xs text-[#6b7280]">
            {mode === 'login' ? (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => toggleMode('signup')}
                  className="text-[#f15e75] font-extrabold hover:underline transition-all"
                >
                  {isHostFlow ? 'Register as Host' : 'Sign Up'}
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => toggleMode('login')}
                  className="text-[#f15e75] font-extrabold hover:underline transition-all"
                >
                  {isHostFlow ? 'Log In as Host' : 'Log In'}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
