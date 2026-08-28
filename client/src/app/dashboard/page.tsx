'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PropertyCard from '@/components/PropertyCard';
import SafeImage from '@/components/SafeImage';
import { getMyReservations, getFavorites, getMyInvoices, getMyThreads, deleteGuestReservation, submitPaymentProof, getPaymentProof, fetchApi } from '@/lib/api';
import {
  Calendar, Heart, FileText, MessageSquare, User, LogOut, Home,
  CheckCircle2, AlertCircle, X, Send, ExternalLink, Clock, ArrowRight,
  MapPin, Shield, Edit3, UserCheck, Eye, Trash2, Upload, FileCheck, AlertTriangle
} from 'lucide-react';

export default function GuestDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'overview' | 'reservations' | 'favorites' | 'messages' | 'invoices' | 'profile'>('overview');
  const [user, setUser] = useState<any>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Thread detail & reply state
  const [selectedThread, setSelectedThread] = useState<any | null>(null);
  const [selectedThreadDetail, setSelectedThreadDetail] = useState<any | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Profile Edit State
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmailNewPropertyNotifications, setEditEmailNewPropertyNotifications] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Reservation Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const openDeleteModal = (reservation: any) => {
    setDeleteTarget(reservation);
    setDeleteError('');
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteTarget(null);
    setDeleteError('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const token = localStorage.getItem('pocono_token');
    if (!token) return;

    setDeleting(true);
    setDeleteError('');

    try {
      const res = await deleteGuestReservation(deleteTarget.id, token);
      setToastMessage(res.message || 'Reservation deleted successfully.');
      setTimeout(() => setToastMessage(''), 4000);
      closeDeleteModal();
      fetchDashboardData(token);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete reservation');
    } finally {
      setDeleting(false);
    }
  };

  // Payment Proof Modal State
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [proofTarget, setProofTarget] = useState<any | null>(null);
  const [proofFile, setProofFile] = useState<{ filename: string; mimeType: string; base64Data: string; previewUrl: string } | null>(null);
  const [proofTxId, setProofTxId] = useState('');
  const [proofNote, setProofNote] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofError, setProofError] = useState('');

  const openProofModal = (reservation: any) => {
    setProofTarget(reservation);
    setProofFile(null);
    setProofTxId(reservation.paymentTransactionId || '');
    setProofNote(reservation.paymentNote || '');
    setProofError('');
    setProofModalOpen(true);
  };

  const closeProofModal = () => {
    setProofModalOpen(false);
    setProofTarget(null);
    setProofFile(null);
    setProofTxId('');
    setProofNote('');
    setProofError('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setProofError('Only JPG, JPEG, PNG, and WebP images are allowed.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setProofError('File size must be under 10MB.');
      return;
    }

    setProofError('');
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      setProofFile({
        filename: file.name,
        mimeType: file.type,
        base64Data,
        previewUrl: result
      });
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmSubmitProof = async () => {
    if (!proofTarget || !proofFile) {
      setProofError('Please select a payment screenshot image.');
      return;
    }

    const token = localStorage.getItem('pocono_token');
    if (!token) return;

    setUploadingProof(true);
    setProofError('');

    try {
      await submitPaymentProof(
        proofTarget.id,
        { filename: proofFile.filename, mimeType: proofFile.mimeType, base64Data: proofFile.base64Data },
        { transactionId: proofTxId, paymentNote: proofNote },
        token
      );

      setToastMessage('Payment proof submitted successfully! Awaiting admin verification.');
      setTimeout(() => setToastMessage(''), 4000);
      closeProofModal();
      fetchDashboardData(token);
    } catch (err: any) {
      setProofError(err.message || 'Failed to submit payment proof.');
    } finally {
      setUploadingProof(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('pocono_token');
    const storedUser = localStorage.getItem('pocono_user');

    if (!token || !storedUser) {
      router.push('/login');
      return;
    }

    try {
      const u = JSON.parse(storedUser);
      // Access Control: Redirect HOST to Host Dashboard, ADMIN to Admin Dashboard
      if (u.role === 'HOST') {
        router.push('/host/dashboard');
        return;
      }
      if (u.role === 'ADMIN') {
        router.push('/admin');
        return;
      }

      setUser(u);
      setEditFirstName(u.firstName || '');
      setEditLastName(u.lastName || '');
      setEditEmail(u.email || '');
      setEditPhone(u.phone || '');
      setEditEmailNewPropertyNotifications(u.emailNewPropertyNotifications !== false);

      const tabParam = searchParams.get('tab');
      if (tabParam === 'messages') {
        setActiveTab('messages');
      }

      fetchDashboardData(token);
    } catch (e) {
      router.push('/login');
    }
  }, [router, searchParams]);

  const fetchDashboardData = async (token: string) => {
    setLoading(true);
    try {
      const [resvData, favData, invData, threadData] = await Promise.all([
        getMyReservations(token).catch(() => ({ data: [] })),
        getFavorites(token).catch(() => ({ data: [] })),
        getMyInvoices(token).catch(() => ({ data: [] })),
        getMyThreads(token).catch(() => ({ data: [] }))
      ]);

      setReservations(resvData.data || []);
      setFavorites(favData.data || []);
      setInvoices(invData.data || []);
      setThreads(threadData.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openThreadModal = async (t: any) => {
    setSelectedThread(t);
    setLoadingThread(true);
    const token = localStorage.getItem('pocono_token');
    if (!token) return;

    try {
      const res = await fetchApi<{ success: boolean; data: any }>(`/messages/threads/${t.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedThreadDetail(res.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingThread(false);
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
      const res = await fetchApi<{ success: boolean; data: any }>(`/messages/threads/${selectedThread.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedThreadDetail(res.data);
      fetchDashboardData(token);
    } catch (err: any) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileSaving(true);
    const token = localStorage.getItem('pocono_token');
    if (!token) return;

    try {
      const res = await fetchApi<{ success: boolean; data: any }>('/auth/me', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          firstName: editFirstName,
          lastName: editLastName,
          phone: editPhone,
          emailNewPropertyNotifications: editEmailNewPropertyNotifications
        })
      });

      if (res.data) {
        setUser(res.data);
        localStorage.setItem('pocono_user', JSON.stringify(res.data));
        window.dispatchEvent(new Event('pocono_auth_changed'));
        setProfileSuccess('Profile updated successfully!');
        setTimeout(() => setProfileSuccess(''), 3000);
      }
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pocono_token');
    localStorage.removeItem('pocono_user');
    window.dispatchEvent(new Event('pocono_auth_changed'));
    router.push('/login');
  };

  if (!user) return null;

  const upcomingReservations = reservations.filter(r => r.status !== 'CANCELLED');
  const sortedThreads = [...threads].sort((a, b) =>
    new Date(b.lastMessageAt || b.updatedAt).getTime() - new Date(a.lastMessageAt || a.updatedAt).getTime()
  );
  const totalUnreadCount = sortedThreads.reduce((sum: number, t: any) => sum + (t.unreadCount || 0), 0);
  const displayedThreads = sortedThreads.slice(0, 3);
  const userInitials = (user.firstName?.[0] || user.email?.[0] || 'G').toUpperCase();
  const fullName = (user.firstName || user.lastName) ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.email;

  return (
    <div className="bg-[#f8fafc] min-h-screen text-[#2b2b2b] pb-16">
      {/* Top Welcome Header */}
      <div className="bg-white border-b border-[#d8dce1] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#fff1f3] text-[#f15e75] font-extrabold text-xl flex items-center justify-center border border-[#f15e75]/30 shrink-0 shadow-sm">
              {userInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2b2b2b]">Welcome back, {user.firstName || 'Traveler'} 👋</h1>
                <span className="px-2.5 py-0.5 bg-[#fff1f3] text-[#f15e75] text-[10px] font-extrabold uppercase rounded border border-[#f15e75]/20">
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-[#4f5962] font-medium mt-1">
                Find your next stay, manage your reservations, and stay connected with your hosts.
              </p>
            </div>
          </div>

          <Link
            href="/properties"
            className="px-5 py-2.5 bg-[#f15e75] hover:bg-[#d94f64] text-white text-xs font-extrabold rounded-md shadow-xs transition-all flex items-center gap-2 shrink-0"
          >
            <span>Explore Properties</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Main Dashboard Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">

          {/* Sidebar Navigation */}
          <aside className="lg:sticky lg:top-[96px] bg-white border border-[#d8dce1] rounded-md p-4 shadow-2xs space-y-2 self-start lg:max-h-[calc(100vh-112px)] lg:overflow-y-auto">
            <div className="px-3 py-2 border-b border-[#d8dce1] mb-2">
              <span className="text-[10px] font-extrabold text-[#9ca3af] uppercase tracking-wider block">Guest Menu</span>
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs font-bold transition-all ${
                  activeTab === 'overview'
                    ? 'bg-[#f15e75] text-white shadow-xs'
                    : 'text-[#4f5962] hover:bg-[#fff1f3] hover:text-[#f15e75]'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Dashboard Overview</span>
              </button>

              <button
                onClick={() => setActiveTab('reservations')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-md text-xs font-bold transition-all ${
                  activeTab === 'reservations'
                    ? 'bg-[#f15e75] text-white shadow-xs'
                    : 'text-[#4f5962] hover:bg-[#fff1f3] hover:text-[#f15e75]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4" />
                  <span>My Reservations</span>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                  activeTab === 'reservations' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
                }`}>
                  {reservations.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('favorites')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-md text-xs font-bold transition-all ${
                  activeTab === 'favorites'
                    ? 'bg-[#f15e75] text-white shadow-xs'
                    : 'text-[#4f5962] hover:bg-[#fff1f3] hover:text-[#f15e75]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Heart className="w-4 h-4" />
                  <span>Saved Properties</span>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                  activeTab === 'favorites' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
                }`}>
                  {favorites.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('messages')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-md text-xs font-bold transition-all ${
                  activeTab === 'messages'
                    ? 'bg-[#f15e75] text-white shadow-xs'
                    : 'text-[#4f5962] hover:bg-[#fff1f3] hover:text-[#f15e75]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4" />
                  <span>Messages</span>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                  activeTab === 'messages' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
                }`}>
                  {threads.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('invoices')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-md text-xs font-bold transition-all ${
                  activeTab === 'invoices'
                    ? 'bg-[#f15e75] text-white shadow-xs'
                    : 'text-[#4f5962] hover:bg-[#fff1f3] hover:text-[#f15e75]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4" />
                  <span>Invoices</span>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                  activeTab === 'invoices' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
                }`}>
                  {invoices.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs font-bold transition-all ${
                  activeTab === 'profile'
                    ? 'bg-[#f15e75] text-white shadow-xs'
                    : 'text-[#4f5962] hover:bg-[#fff1f3] hover:text-[#f15e75]'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Account Profile</span>
              </button>

              <div className="pt-2 border-t border-[#d8dce1] mt-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-rose-600 hover:bg-rose-50 rounded-md text-xs font-bold transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </nav>
          </aside>

          {/* Main Dashboard Content Area */}
          <main className="lg:col-span-3 space-y-6">

            {/* Overview Quick Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div
                onClick={() => setActiveTab('reservations')}
                className="bg-white border border-[#d8dce1] p-4 rounded-md shadow-2xs space-y-1 cursor-pointer hover:border-[#f15e75]/50 transition-all"
              >
                <span className="text-[10px] text-[#9ca3af] font-extrabold uppercase tracking-wider block">Upcoming Trips</span>
                <div className="text-2xl font-extrabold text-[#2b2b2b]">{upcomingReservations.length}</div>
                <span className="text-[10px] text-[#f15e75] font-bold">Active Reservations</span>
              </div>

              <div
                onClick={() => setActiveTab('favorites')}
                className="bg-white border border-[#d8dce1] p-4 rounded-md shadow-2xs space-y-1 cursor-pointer hover:border-[#f15e75]/50 transition-all"
              >
                <span className="text-[10px] text-[#9ca3af] font-extrabold uppercase tracking-wider block">Saved Properties</span>
                <div className="text-2xl font-extrabold text-[#2b2b2b]">{favorites.length}</div>
                <span className="text-[10px] text-emerald-600 font-bold">Favorite Stays</span>
              </div>

              <div
                onClick={() => setActiveTab('messages')}
                className="bg-white border border-[#d8dce1] p-4 rounded-md shadow-2xs space-y-1 cursor-pointer hover:border-[#f15e75]/50 transition-all"
              >
                <span className="text-[10px] text-[#9ca3af] font-extrabold uppercase tracking-wider block">Unread Messages</span>
                <div className="text-2xl font-extrabold text-[#f15e75]">{totalUnreadCount}</div>
                <span className="text-[10px] text-[#4f5962] font-bold">{threads.length} Conversation{threads.length === 1 ? '' : 's'}</span>
              </div>

              <div
                onClick={() => setActiveTab('invoices')}
                className="bg-white border border-[#d8dce1] p-4 rounded-md shadow-2xs space-y-1 cursor-pointer hover:border-[#f15e75]/50 transition-all"
              >
                <span className="text-[10px] text-[#9ca3af] font-extrabold uppercase tracking-wider block">Invoices</span>
                <div className="text-2xl font-extrabold text-[#2b2b2b]">{invoices.length}</div>
                <span className="text-[10px] text-[#4f5962] font-bold">Paid Receipts</span>
              </div>
            </div>

            {loading ? (
              <div className="p-12 bg-white border border-[#d8dce1] rounded-md text-center text-xs font-bold text-[#4f5962] shadow-2xs">
                Loading dashboard records...
              </div>
            ) : (
              <div className="space-y-6">

                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Upcoming Reservations Preview */}
                    <div className="bg-white border border-[#d8dce1] rounded-md p-6 shadow-2xs space-y-4">
                      <div className="flex justify-between items-center border-b border-[#d8dce1] pb-3">
                        <h3 className="font-extrabold text-[#2b2b2b] text-base flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#f15e75]" />
                          <span>Upcoming Reservations ({upcomingReservations.length})</span>
                        </h3>
                        <button
                          onClick={() => setActiveTab('reservations')}
                          className="text-xs text-[#f15e75] font-bold hover:underline"
                        >
                          View All Stays →
                        </button>
                      </div>

                      {upcomingReservations.length === 0 ? (
                        <div className="p-8 text-center space-y-3">
                          <Calendar className="w-10 h-10 text-[#f15e75] mx-auto opacity-70" />
                          <h4 className="font-bold text-[#2b2b2b] text-sm">No upcoming stays yet</h4>
                          <p className="text-xs text-[#6b7280] max-w-sm mx-auto">
                            Start exploring vacation rentals in Lake Harmony, Blakeslee, and the Pocono Mountains.
                          </p>
                          <Link
                            href="/properties"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#f15e75] hover:bg-[#d94f64] text-white text-xs font-extrabold rounded-md shadow-xs transition-all mt-2"
                          >
                            <span>Explore Properties</span>
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {upcomingReservations.slice(0, 2).map((r: any) => {
                            const propImage = r.property?.images?.[0]?.imageUrl || r.property?.primaryImage || '/placeholder.jpg';
                            return (
                              <div key={r.id} className="p-4 border border-[#d8dce1] rounded-md bg-[#f8fafc] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                  <div className="w-20 h-16 rounded overflow-hidden bg-gray-200 shrink-0">
                                    <SafeImage src={propImage} alt={r.property?.title || 'Property'} className="w-full h-full object-cover" />
                                  </div>
                                  <div className="space-y-1">
                                    <h4 className="font-bold text-[#2b2b2b] text-sm">{r.property?.title || 'Vacation Property'}</h4>
                                    <p className="text-xs text-[#4f5962] font-medium">
                                      {new Date(r.checkInDate).toLocaleDateString()} – {new Date(r.checkOutDate).toLocaleDateString()}
                                    </p>
                                    <span className="text-[10px] font-bold text-gray-500 block">
                                      {r.guestCount} Guest{r.guestCount > 1 ? 's' : ''} • {r.totalNights} Night{r.totalNights > 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 border-t sm:border-t-0 border-[#d8dce1] pt-2 sm:pt-0">
                                  <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded uppercase ${
                                    r.status === 'CONFIRMED' || r.status === 'PAID'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}>
                                    {r.status}
                                  </span>
                                  <span className="text-base font-extrabold text-[#f15e75]">${r.grandTotal}</span>
                                  {r.property?.slug && (
                                    <Link
                                      href={`/listing/${r.property.slug}`}
                                      className="text-xs text-[#4f5962] hover:text-[#f15e75] font-bold flex items-center gap-1"
                                    >
                                      <span>View Details</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </Link>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Recent Messages Preview */}
                    <div className="bg-white border border-[#d8dce1] rounded-md p-6 shadow-2xs space-y-4">
                      <div className="flex justify-between items-center border-b border-[#d8dce1] pb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-[#2b2b2b] text-base flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-[#f15e75]" />
                            <span>Recent Conversations</span>
                          </h3>
                          {totalUnreadCount > 0 && (
                            <span className="px-2.5 py-0.5 bg-[#f15e75] text-white rounded-full text-[10px] font-extrabold">
                              {totalUnreadCount} UNREAD
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setActiveTab('messages')}
                          className="text-xs text-[#f15e75] font-bold hover:underline"
                        >
                          View Messages →
                        </button>
                      </div>

                      {threads.length === 0 ? (
                        <div className="p-8 text-center space-y-3">
                          <MessageSquare className="w-10 h-10 text-[#f15e75] mx-auto opacity-70" />
                          <h4 className="font-bold text-[#2b2b2b] text-sm">No messages yet</h4>
                          <p className="text-xs text-[#6b7280] max-w-sm mx-auto">
                            Contact a host from any property page to start a conversation about your stay.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {displayedThreads.map((t: any) => {
                            const lastMsg = t.messages?.[0]?.messageText || 'Inquiry conversation started';
                            const hostName = t.receiver
                              ? `${t.receiver.firstName || ''} ${t.receiver.lastName || ''}`.trim() || t.receiver.email
                              : 'Host';

                            return (
                              <div
                                key={t.id}
                                className="p-4 border border-[#d8dce1] rounded-md bg-[#f8fafc] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-[#f15e75]/50 transition-all"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-[#2b2b2b] text-sm">{t.property?.title || 'Vacation Property'}</h4>
                                    {t.unreadCount > 0 && (
                                      <span className="px-2 py-0.5 bg-[#f15e75] text-white rounded-full text-[10px] font-extrabold">
                                        {t.unreadCount} NEW
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-[#f15e75] font-bold">Host: {hostName}</p>
                                  <p className="text-xs text-[#4f5962] line-clamp-1 font-medium">{lastMsg}</p>
                                </div>
                                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 shrink-0">
                                  <span className="text-[10px] text-gray-400 font-semibold">
                                    {new Date(t.lastMessageAt || t.updatedAt).toLocaleDateString()}
                                  </span>
                                  <Link
                                    href={`/messages/${t.id}`}
                                    className="px-3.5 py-1.5 bg-[#f15e75] hover:bg-[#d94f64] text-white font-extrabold text-xs rounded-md shadow-2xs transition-all inline-flex items-center gap-1.5"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>Open Full Chat</span>
                                  </Link>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Saved Properties Preview (Using PropertyCard) */}
                    <div className="bg-white border border-[#d8dce1] rounded-md p-6 shadow-2xs space-y-4">
                      <div className="flex justify-between items-center border-b border-[#d8dce1] pb-3">
                        <h3 className="font-extrabold text-[#2b2b2b] text-base flex items-center gap-2">
                          <Heart className="w-4 h-4 text-[#f15e75]" />
                          <span>Saved Favorites ({favorites.length})</span>
                        </h3>
                        <button
                          onClick={() => setActiveTab('favorites')}
                          className="text-xs text-[#f15e75] font-bold hover:underline"
                        >
                          View All Saved →
                        </button>
                      </div>

                      {favorites.length === 0 ? (
                        <div className="p-8 text-center space-y-3">
                          <Heart className="w-10 h-10 text-[#f15e75] mx-auto opacity-70" />
                          <h4 className="font-bold text-[#2b2b2b] text-sm">You haven't saved any properties yet</h4>
                          <p className="text-xs text-[#6b7280] max-w-sm mx-auto">
                            Save properties you love to find them quickly later.
                          </p>
                          <Link
                            href="/properties"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#f15e75] hover:bg-[#d94f64] text-white text-xs font-extrabold rounded-md shadow-xs transition-all mt-2"
                          >
                            <span>Browse Properties</span>
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          {favorites.slice(0, 2).map((f: any) => {
                            const propObj = f.property || f;
                            return <PropertyCard key={f.id} property={propObj} />;
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* MY RESERVATIONS TAB */}
                {activeTab === 'reservations' && (
                  <div className="bg-white border border-[#d8dce1] rounded-md p-6 shadow-2xs space-y-4">
                    <div className="border-b border-[#d8dce1] pb-3">
                      <h3 className="font-extrabold text-[#2b2b2b] text-lg">My Reservations & Bookings</h3>
                      <p className="text-xs text-[#4f5962] font-medium mt-1">Manage your stay details, check-in dates, and invoices.</p>
                    </div>

                    {reservations.length === 0 ? (
                      <div className="p-12 text-center space-y-4">
                        <Calendar className="w-12 h-12 text-[#f15e75] mx-auto opacity-70" />
                        <h4 className="font-bold text-[#2b2b2b] text-base">No upcoming reservations</h4>
                        <p className="text-xs text-[#6b7280] max-w-sm mx-auto">
                          Start exploring vacation rentals in the Pocono Mountains for your next stay.
                        </p>
                        <Link
                          href="/properties"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-[#f15e75] hover:bg-[#d94f64] text-white text-xs font-extrabold rounded-md shadow-xs transition-all"
                        >
                          <span>Explore Properties</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {reservations.map((r: any) => {
                          const propImage = r.property?.images?.[0]?.imageUrl || r.property?.primaryImage || '/placeholder.jpg';
                          return (
                            <div key={r.id} className="p-5 border border-[#d8dce1] rounded-md bg-white space-y-4 shadow-2xs">
                              {/* Top Row: Property details and Price/Status */}
                              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div className="flex items-center gap-4">
                                  <div className="w-24 h-20 rounded overflow-hidden bg-gray-100 shrink-0">
                                    <SafeImage src={propImage} alt={r.property?.title || 'Property'} className="w-full h-full object-cover" />
                                  </div>
                                  <div className="space-y-1">
                                    <h4 className="font-bold text-[#2b2b2b] text-base">{r.property?.title || 'Vacation Property'}</h4>
                                    <p className="text-xs text-[#f15e75] font-bold">
                                      {new Date(r.checkInDate).toLocaleDateString()} – {new Date(r.checkOutDate).toLocaleDateString()}
                                    </p>
                                    <p className="text-xs text-[#6b7280] font-medium">
                                      Guests: {r.guestCount} • Duration: {r.totalNights} Night{r.totalNights > 1 ? 's' : ''}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 border-t sm:border-t-0 border-[#d8dce1] pt-2 sm:pt-0">
                                  <span className={`px-2.5 py-1 text-[11px] font-bold rounded uppercase ${
                                    r.status === 'CONFIRMED' || r.status === 'PAID' || r.status === 'COMPLETED'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}>
                                    {r.status}
                                  </span>
                                  <span className="text-xl font-extrabold text-[#2b2b2b]">${r.grandTotal}</span>
                                </div>
                              </div>

                              {/* Payment Verification Section */}
                              {(r.status === 'PENDING' || r.status === 'PENDING_PAYMENT') ? (
                                <div className={`p-3.5 rounded-md border text-xs space-y-2 ${
                                  r.paymentVerificationStatus === 'SUBMITTED'
                                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                                    : r.paymentVerificationStatus === 'REJECTED'
                                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                                    : 'bg-gray-50 border-gray-200 text-gray-800'
                                }`}>
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-2 font-extrabold text-xs">
                                        {r.paymentVerificationStatus === 'SUBMITTED' && (
                                          <>
                                            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                                            <span>Payment Verification: <span className="uppercase text-amber-700 font-extrabold">SUBMITTED</span></span>
                                          </>
                                        )}
                                        {r.paymentVerificationStatus === 'REJECTED' && (
                                          <>
                                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                            <span>Payment Verification: <span className="uppercase text-rose-700 font-extrabold">REJECTED</span></span>
                                          </>
                                        )}
                                        {(r.paymentVerificationStatus === 'NOT_SUBMITTED' || !r.paymentVerificationStatus) && (
                                          <>
                                            <Upload className="w-4 h-4 text-gray-500 shrink-0" />
                                            <span>Payment Verification: <span className="uppercase text-gray-700 font-extrabold">NOT SUBMITTED</span></span>
                                          </>
                                        )}
                                      </div>

                                      <p className="text-xs text-[#4f5962] font-medium">
                                        {r.paymentVerificationStatus === 'SUBMITTED' && 'Your payment proof is currently being reviewed by the admin.'}
                                        {r.paymentVerificationStatus === 'REJECTED' && 'Payment proof was rejected by Admin.'}
                                        {(r.paymentVerificationStatus === 'NOT_SUBMITTED' || !r.paymentVerificationStatus) && 'Please upload your payment screenshot/receipt to initiate admin verification.'}
                                      </p>
                                    </div>

                                    {/* Upload / Resubmit Buttons */}
                                    {(r.paymentVerificationStatus === 'NOT_SUBMITTED' || !r.paymentVerificationStatus) && (
                                      <button
                                        onClick={() => openProofModal(r)}
                                        className="px-3.5 py-2 bg-[#f15e75] hover:bg-[#d94f64] text-white font-extrabold rounded-md text-xs transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer shadow-xs"
                                      >
                                        <Upload className="w-3.5 h-3.5" />
                                        <span>Upload Payment Proof</span>
                                      </button>
                                    )}

                                    {r.paymentVerificationStatus === 'REJECTED' && (
                                      <button
                                        onClick={() => openProofModal(r)}
                                        className="px-3.5 py-2 bg-[#f15e75] hover:bg-[#d94f64] text-white font-extrabold rounded-md text-xs transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer shadow-xs"
                                      >
                                        <Upload className="w-3.5 h-3.5" />
                                        <span>Submit New Proof</span>
                                      </button>
                                    )}
                                  </div>

                                  {r.paymentVerificationStatus === 'REJECTED' && r.paymentRejectionReason && (
                                    <div className="text-xs font-medium bg-white/80 p-2.5 rounded border border-rose-200 text-rose-800 space-y-0.5">
                                      <span className="font-extrabold block">Rejection Reason:</span>
                                      <span>{r.paymentRejectionReason}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (r.status === 'CONFIRMED' || r.status === 'COMPLETED' || r.paymentVerificationStatus === 'VERIFIED') ? (
                                <div className="p-3.5 rounded-md border border-emerald-200 bg-emerald-50 text-xs text-emerald-900 space-y-1">
                                  <div className="flex items-center gap-2 font-extrabold">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Payment Verification: <span className="uppercase text-emerald-700 font-extrabold">VERIFIED</span></span>
                                  </div>
                                  <p className="text-xs text-emerald-800 font-medium">
                                    Payment confirmed! Reservation status: <span className="font-extrabold uppercase">{r.status}</span> • Payment: <span className="font-extrabold uppercase">PAID</span>
                                  </p>
                                </div>
                              ) : null}

                              {/* Bottom Row: Ref, Delete, View Property */}
                              <div className="pt-3 border-t border-[#d8dce1] flex flex-wrap justify-between items-center gap-2 text-xs">
                                <span className="text-[#6b7280] font-mono">Reservation Ref: #{r.id.substring(0, 8)}</span>
                                <div className="flex items-center gap-2">
                                  {r.status !== 'CONFIRMED' && r.status !== 'COMPLETED' && (
                                    <button
                                      onClick={() => openDeleteModal(r)}
                                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Delete Reservation</span>
                                    </button>
                                  )}
                                  {r.property?.slug && (
                                    <Link
                                      href={`/listing/${r.property.slug}`}
                                      className="px-4 py-2 bg-gray-50 hover:bg-[#fff1f3] border border-[#d8dce1] text-[#4f5962] hover:text-[#f15e75] font-bold rounded-md transition-all flex items-center gap-1.5"
                                    >
                                      <span>View Property</span>
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* SAVED PROPERTIES TAB */}
                {activeTab === 'favorites' && (
                  <div className="bg-white border border-[#d8dce1] rounded-md p-6 shadow-2xs space-y-4">
                    <div className="border-b border-[#d8dce1] pb-3">
                      <h3 className="font-extrabold text-[#2b2b2b] text-lg">Saved Favorite Properties</h3>
                      <p className="text-xs text-[#4f5962] font-medium mt-1">Properties you have saved for future Pocono trips.</p>
                    </div>

                    {favorites.length === 0 ? (
                      <div className="p-12 text-center space-y-4">
                        <Heart className="w-12 h-12 text-[#f15e75] mx-auto opacity-70" />
                        <h4 className="font-bold text-[#2b2b2b] text-base">No saved properties yet</h4>
                        <p className="text-xs text-[#6b7280] max-w-sm mx-auto">
                          Save properties you love to find them quickly later.
                        </p>
                        <Link
                          href="/properties"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-[#f15e75] hover:bg-[#d94f64] text-white text-xs font-extrabold rounded-md shadow-xs transition-all"
                        >
                          <span>Browse Properties</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {favorites.map((f: any) => {
                          const propObj = f.property || f;
                          return <PropertyCard key={f.id} property={propObj} />;
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* MESSAGES TAB */}
                {activeTab === 'messages' && (
                  <div className="bg-white border border-[#d8dce1] rounded-md p-6 shadow-2xs space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#d8dce1] pb-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-extrabold text-[#2b2b2b] text-lg">Rental Inquiries</h3>
                          <span className="px-2.5 py-0.5 bg-gray-100 border border-gray-200 text-[#4f5962] text-xs font-bold rounded-full">
                            Total {sortedThreads.length}
                          </span>
                          {totalUnreadCount > 0 ? (
                            <span className="px-3 py-0.5 bg-[#f15e75] text-white text-xs font-extrabold rounded-full shadow-2xs">
                              {totalUnreadCount} UNREAD
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-full">
                              All Read
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#4f5962] font-medium mt-1">Direct rental inquiries and conversations between you and property hosts.</p>
                      </div>
                    </div>

                    {sortedThreads.length === 0 ? (
                      <div className="p-12 text-center space-y-4">
                        <MessageSquare className="w-12 h-12 text-[#f15e75] mx-auto opacity-70" />
                        <h4 className="font-bold text-[#2b2b2b] text-base">No rental inquiries yet</h4>
                        <p className="text-xs text-[#6b7280] max-w-sm mx-auto">
                          Contact a host from any property page to start a conversation about your stay.
                        </p>
                        <Link
                          href="/properties"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-[#f15e75] hover:bg-[#d94f64] text-white text-xs font-extrabold rounded-md shadow-xs transition-all"
                        >
                          <span>Explore Properties</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[550px] sm:max-h-[600px] lg:max-h-[650px] overflow-y-auto pr-1.5 custom-scrollbar">
                        {sortedThreads.map((t: any) => {
                          const lastMsg = t.messages?.[0]?.messageText || 'Inquiry thread started';
                          const hostName = t.receiver
                            ? `${t.receiver.firstName || ''} ${t.receiver.lastName || ''}`.trim() || t.receiver.email
                            : 'Host';

                          return (
                            <div
                              key={t.id}
                              className="p-5 border border-[#d8dce1] rounded-md bg-[#f8fafc] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-[#f15e75]/50 transition-all shadow-2xs"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-[#2b2b2b] text-sm">{t.property?.title || 'Vacation Property'}</h4>
                                  {t.unreadCount > 0 && (
                                    <span className="px-2 py-0.5 bg-[#f15e75] text-white rounded-full text-[10px] font-extrabold">
                                      {t.unreadCount} NEW
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-[#f15e75] font-bold">Host: {hostName}</p>
                                <p className="text-xs text-[#4f5962] line-clamp-2 font-medium">{lastMsg}</p>
                              </div>

                              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 shrink-0">
                                <span className="text-[10px] text-gray-400 font-semibold">
                                  {new Date(t.lastMessageAt || t.updatedAt).toLocaleDateString()} {new Date(t.lastMessageAt || t.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <Link
                                  href={`/messages/${t.id}?from=guest-messages`}
                                  className="px-3.5 py-1.5 bg-[#f15e75] hover:bg-[#d94f64] text-white font-extrabold text-xs rounded-md shadow-2xs transition-all inline-flex items-center gap-1.5"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>Open Full Chat</span>
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* INVOICES TAB */}
                {activeTab === 'invoices' && (
                  <div className="bg-white border border-[#d8dce1] rounded-md p-6 shadow-2xs space-y-4">
                    <div className="border-b border-[#d8dce1] pb-3">
                      <h3 className="font-extrabold text-[#2b2b2b] text-lg">Invoices &amp; Payment Receipts</h3>
                      <p className="text-xs text-[#4f5962] font-medium mt-1">Billing records for your reservations and memberships.</p>
                    </div>

                    {invoices.length === 0 ? (
                      <div className="p-12 text-center space-y-4">
                        <FileText className="w-12 h-12 text-[#f15e75] mx-auto opacity-70" />
                        <h4 className="font-bold text-[#2b2b2b] text-base">No invoice records found</h4>
                        <p className="text-xs text-[#6b7280] max-w-sm mx-auto">
                          Payment receipts will automatically appear here when you book a property.
                        </p>
                        <Link
                          href="/properties"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-[#f15e75] hover:bg-[#d94f64] text-white text-xs font-extrabold rounded-md shadow-xs transition-all"
                        >
                          <span>Explore Properties</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {invoices.map((inv: any) => {
                          const isReservation = inv.invoiceType === 'Reservation';
                          const paymentStatus = inv.paymentStatus;
                          // paymentStatus: 0=PENDING, 1=PAID, 2=FAILED
                          const statusLabel = paymentStatus === 1 ? 'Paid' : paymentStatus === 2 ? 'Failed' : 'Pending';
                          const statusStyle =
                            paymentStatus === 1
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : paymentStatus === 2
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200';

                          const property = inv.reservation?.property;
                          const checkIn = inv.reservation?.checkInDate
                            ? new Date(inv.reservation.checkInDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : null;
                          const checkOut = inv.reservation?.checkOutDate
                            ? new Date(inv.reservation.checkOutDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : null;

                          return (
                            <div key={inv.id} className="p-5 border border-[#d8dce1] rounded-md bg-[#f8fafc]">
                              <div className="flex justify-between items-start gap-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-bold text-[#2b2b2b] text-sm">
                                      Invoice #{inv.wpInvoiceId || inv.id.slice(0, 8).toUpperCase()}
                                    </h4>
                                    <span className={`px-2 py-0.5 border text-[10px] font-bold rounded uppercase ${
                                      isReservation ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                                    }`}>
                                      {isReservation ? 'Reservation' : 'Membership'}
                                    </span>
                                  </div>

                                  {isReservation && property && (
                                    <p className="text-xs text-[#2b2b2b] font-semibold mt-1 truncate">
                                      {property.title}
                                    </p>
                                  )}
                                  {isReservation && checkIn && checkOut && (
                                    <p className="text-xs text-[#6b7280] mt-0.5">
                                      {checkIn} → {checkOut}
                                      {inv.reservation?.totalNights ? ` · ${inv.reservation.totalNights} nights` : ''}
                                    </p>
                                  )}
                                  {!isReservation && (
                                    <p className="text-xs text-[#6b7280] mt-0.5">Membership Plan</p>
                                  )}

                                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                    {inv.paymentGateway && (
                                      <span className="text-[10px] text-[#6b7280] font-semibold uppercase tracking-wide">
                                        via {inv.paymentGateway.replace(/_/g, ' ')}
                                      </span>
                                    )}
                                    {inv.paymentReference && (
                                      <span className="text-[10px] text-[#9ca3af]">Ref: {inv.paymentReference}</span>
                                    )}
                                    <span className="text-[10px] text-[#9ca3af]">
                                      {new Date(inv.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-right flex-shrink-0 space-y-1.5">
                                  <span className="font-extrabold text-[#f15e75] text-lg block">
                                    ${Number(inv.totalAmount || 0).toFixed(2)}
                                  </span>
                                  <span className={`px-2 py-0.5 border text-[10px] font-bold rounded uppercase ${statusStyle}`}>
                                    {statusLabel}
                                  </span>
                                  {isReservation && inv.reservation?.id && (
                                    <Link
                                      href={`/dashboard?tab=reservations`}
                                      onClick={() => setActiveTab('reservations')}
                                      className="block text-[10px] text-[#f15e75] hover:underline font-semibold mt-1"
                                    >
                                      View Reservation →
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* PROFILE TAB */}
                {activeTab === 'profile' && (
                  <div className="bg-white border border-[#d8dce1] rounded-md p-6 shadow-2xs space-y-6 max-w-2xl">
                    <div className="border-b border-[#d8dce1] pb-3">
                      <h3 className="font-extrabold text-[#2b2b2b] text-lg">Account Profile Settings</h3>
                      <p className="text-xs text-[#4f5962] font-medium mt-1">Manage your personal details and contact preferences.</p>
                    </div>

                    {profileSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{profileSuccess}</span>
                      </div>
                    )}

                    {profileError && (
                      <div className="p-3 bg-[#fff1f3] border border-[#f15e75]/30 text-[#f15e75] rounded-md text-xs font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{profileError}</span>
                      </div>
                    )}

                    <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-extrabold text-[#2b2b2b] uppercase text-[10px] mb-1">First Name</label>
                          <input
                            type="text"
                            value={editFirstName}
                            onChange={(e) => setEditFirstName(e.target.value)}
                            className="w-full bg-[#f8fafc] border border-[#d8dce1] text-[#2b2b2b] rounded-md px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-[#f15e75]"
                          />
                        </div>

                        <div>
                          <label className="block font-extrabold text-[#2b2b2b] uppercase text-[10px] mb-1">Last Name</label>
                          <input
                            type="text"
                            value={editLastName}
                            onChange={(e) => setEditLastName(e.target.value)}
                            className="w-full bg-[#f8fafc] border border-[#d8dce1] text-[#2b2b2b] rounded-md px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-[#f15e75]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-extrabold text-[#2b2b2b] uppercase text-[10px] mb-1">Email Address</label>
                        <input
                          type="email"
                          disabled
                          value={editEmail}
                          className="w-full bg-gray-100 border border-[#d8dce1] text-[#6b7280] rounded-md px-3.5 py-2.5 text-xs font-medium cursor-not-allowed"
                        />
                        <span className="text-[10px] text-[#9ca3af] mt-1 block">Email address cannot be changed directly for security.</span>
                      </div>

                      <div>
                        <label className="block font-extrabold text-[#2b2b2b] uppercase text-[10px] mb-1">Phone Number</label>
                        <input
                          type="text"
                          placeholder="(555) 000-0000"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full bg-[#f8fafc] border border-[#d8dce1] text-[#2b2b2b] rounded-md px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-[#f15e75]"
                        />
                      </div>

                      <div className="pt-2">
                        <label className="block font-extrabold text-[#2b2b2b] uppercase text-[10px] mb-2">Email Notifications</label>
                        <label className="flex items-start gap-3 bg-[#f8fafc] border border-[#d8dce1] p-3 rounded-md cursor-pointer hover:border-[#f15e75] transition-all">
                          <input
                            type="checkbox"
                            checked={editEmailNewPropertyNotifications}
                            onChange={(e) => setEditEmailNewPropertyNotifications(e.target.checked)}
                            className="mt-0.5 accent-[#f15e75] w-4 h-4 rounded"
                          />
                          <div>
                            <span className="font-extrabold text-[#2b2b2b] text-xs block">New properties & vacation rentals</span>
                            <span className="text-[11px] text-[#6b7280]">Receive occasional emails when new vacation rentals become available.</span>
                          </div>
                        </label>
                      </div>

                      <div className="pt-3 border-t border-[#d8dce1] flex justify-end">
                        <button
                          type="submit"
                          disabled={profileSaving}
                          className="px-6 py-2.5 bg-[#f15e75] hover:bg-[#d94f64] disabled:opacity-50 text-white font-extrabold rounded-md text-xs shadow-xs transition-all"
                        >
                          {profileSaving ? 'Saving Changes...' : 'Save Profile Changes'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

              </div>
            )}
          </main>

        </div>
      </div>

      {/* Guest Message Conversation Modal */}
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
                Host: <span className="font-bold text-[#2b2b2b]">{selectedThread.receiver?.firstName || selectedThread.receiver?.email}</span>
              </p>
            </div>

            {loadingThread ? (
              <div className="py-12 text-center text-xs font-bold text-[#4f5962]">Loading conversation history...</div>
            ) : selectedThreadDetail ? (
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {selectedThreadDetail.messages?.map((m: any) => {
                  const isGuestSender = m.senderId === user.id;
                  const senderName = m.sender
                    ? `${m.sender.firstName || ''} ${m.sender.lastName || ''}`.trim() || m.sender.email
                    : 'User';

                  return (
                    <div
                      key={m.id}
                      className={`p-4 rounded-xl text-xs space-y-1 border ${
                        isGuestSender
                          ? 'bg-[#fff1f3]/60 border-[#f15e75]/30 text-[#2b2b2b] ml-8'
                          : 'bg-[#f8fafc] border-[#e5e7eb] text-[#2b2b2b] mr-8'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[#2b2b2b] text-xs">
                          {senderName} ({m.sender?.role || 'USER'})
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
                  placeholder="Write a message to the host..."
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

      {/* Toast Success Message */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-[#2b2b2b] text-white text-xs font-extrabold px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Delete Reservation Confirmation Modal */}
      {deleteModalOpen && deleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl space-y-5 border border-[#e5e7eb]">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-100 rounded-full shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-[#2b2b2b]">Delete Reservation?</h3>
            </div>
            <p className="text-xs text-[#4f5962] leading-relaxed">
              Are you sure you want to delete this reservation? This action cannot be undone.
            </p>
            {deleteError && (
              <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded border border-rose-200">
                {deleteError}
              </p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={closeDeleteModal}
                disabled={deleting}
                className="px-4 py-2 text-xs font-bold text-[#4f5962] hover:bg-gray-100 rounded-md transition-all border border-[#d8dce1]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-xs transition-all disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Reservation'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Upload Payment Proof Modal */}
      {proofModalOpen && proofTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-xl space-y-5 border border-[#e5e7eb] relative my-8">
            <button
              onClick={closeProofModal}
              className="absolute right-4 top-4 text-gray-400 hover:text-[#2b2b2b]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 text-[#f15e75]">
              <div className="p-2.5 bg-[#fff1f3] rounded-full shrink-0">
                <Upload className="w-5 h-5 text-[#f15e75]" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#2b2b2b]">Upload Payment Proof</h3>
                <p className="text-xs text-[#6b7280]">Reservation #{proofTarget.id.substring(0, 8)} • Total: ${proofTarget.grandTotal}</p>
              </div>
            </div>

            {/* Payment Instructions */}
            <div className="p-3.5 bg-gray-50 border border-[#d8dce1] rounded-md text-xs space-y-1.5 text-[#4f5962]">
              <p className="font-bold text-[#2b2b2b]">Payment Instructions:</p>
              <p>1. Transfer <span className="font-extrabold text-[#f15e75]">${proofTarget.grandTotal}</span> via Bank Transfer / Zelle / Cash Deposit.</p>
              <p>2. Take a screenshot or photo of your payment receipt.</p>
              <p>3. Upload the receipt below for Admin verification.</p>
            </div>

            {/* Rejection notice if previously rejected */}
            {proofTarget.paymentVerificationStatus === 'REJECTED' && proofTarget.paymentRejectionReason && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 space-y-1">
                <p className="font-extrabold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>Previous Submission Rejected:</span>
                </p>
                <p className="text-[11px] text-rose-700">{proofTarget.paymentRejectionReason}</p>
              </div>
            )}

            {/* File Dropzone / Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#2b2b2b]">
                Payment Screenshot / Receipt Image <span className="text-rose-500">*</span>
              </label>
              <div className="border-2 border-dashed border-[#d8dce1] hover:border-[#f15e75] rounded-md p-4 text-center cursor-pointer transition-all bg-gray-50/50">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="payment-proof-input"
                />
                <label htmlFor="payment-proof-input" className="cursor-pointer space-y-2 block">
                  {proofFile?.previewUrl ? (
                    <div className="space-y-2">
                      <img src={proofFile.previewUrl} alt="Preview" className="max-h-40 mx-auto rounded object-contain border border-[#d8dce1]" />
                      <p className="text-xs font-bold text-[#2b2b2b]">{proofFile.filename}</p>
                      <p className="text-[10px] text-[#f15e75] font-extrabold">Click to change image</p>
                    </div>
                  ) : (
                    <div className="space-y-1 py-3">
                      <Upload className="w-8 h-8 mx-auto text-[#f15e75]" />
                      <p className="text-xs font-bold text-[#2b2b2b]">Click or drag image to upload</p>
                      <p className="text-[10px] text-[#6b7280]">Supports JPG, JPEG, PNG, WebP (Max 10MB)</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Transaction ID */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#2b2b2b]">
                Transaction / Reference ID <span className="text-[#6b7280] font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. TXN-98412385"
                value={proofTxId}
                onChange={(e) => setProofTxId(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#d8dce1] text-[#2b2b2b] rounded-md p-2.5 text-xs focus:outline-none focus:border-[#f15e75] font-medium"
              />
            </div>

            {/* Payment Note */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#2b2b2b]">
                Payment Note <span className="text-[#6b7280] font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Add any note for the admin..."
                value={proofNote}
                onChange={(e) => setProofNote(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#d8dce1] text-[#2b2b2b] rounded-md p-2.5 text-xs focus:outline-none focus:border-[#f15e75] resize-none font-medium"
              />
            </div>

            {proofError && (
              <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded border border-rose-200">
                {proofError}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={closeProofModal}
                disabled={uploadingProof}
                className="px-4 py-2 text-xs font-bold text-[#4f5962] hover:bg-gray-100 rounded-md transition-all border border-[#d8dce1]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSubmitProof}
                disabled={uploadingProof || !proofFile}
                className="px-5 py-2 text-xs font-extrabold text-white bg-[#f15e75] hover:bg-[#d94f64] rounded-md shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadingProof ? 'Submitting...' : 'Submit Payment Proof'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
