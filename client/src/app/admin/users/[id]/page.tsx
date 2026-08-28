'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAdminUserById, updateUserRole, deleteAdminUser, updateAdminUserProfile } from '@/lib/api';
import {
  ArrowLeft, User as UserIcon, Mail, Phone, Calendar, Building2,
  Shield, CheckCircle2, AlertCircle, ExternalLink, MessageSquare, Star,
  Trash2, Edit3, X, AlertTriangle, ShieldAlert
} from 'lucide-react';

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    setLoading(true);
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    try {
      const res = await getAdminUserById(userId, token);
      setUser(res.data);
      if (res.data) {
        setEditFirstName(res.data.firstName || '');
        setEditLastName(res.data.lastName || '');
        setEditEmail(res.data.email || '');
        setEditPhone(res.data.phone || '');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load user detail');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (newRole: string) => {
    setError('');
    setSuccess('');
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    try {
      await updateUserRole(userId, newRole, token);
      setSuccess(`Role updated to ${newRole} successfully!`);
      setTimeout(() => setSuccess(''), 3000);
      fetchUser();
    } catch (err: any) {
      setError(err.message || 'Error updating role');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    try {
      await updateAdminUserProfile(
        userId,
        {
          firstName: editFirstName,
          lastName: editLastName,
          email: editEmail,
          phone: editPhone
        },
        token
      );
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      setShowEditModal(false);
      fetchUser();
    } catch (err: any) {
      setError(err.message || 'Error updating profile');
    }
  };

  const handleDeleteUser = async () => {
    setError('');
    setSuccess('');
    setDeleteLoading(true);
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) {
      setDeleteLoading(false);
      return;
    }

    try {
      const res = await deleteAdminUser(userId, token);
      setSuccess(res.message || 'User account deleted successfully.');
      setTimeout(() => {
        router.push('/admin/users');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error deleting user');
      setShowDeleteModal(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-[#4f5962] text-sm font-medium">Loading user detail from PostgreSQL...</div>;
  }

  if (!user) {
    return (
      <div className="p-8 bg-white border border-[#e5e7eb] rounded-md text-center space-y-4 shadow-sm max-w-2xl mx-auto">
        <AlertCircle className="w-8 h-8 text-[#f15e75] mx-auto" />
        <h2 className="text-xl font-bold text-[#2b2b2b]">User Not Found</h2>
        <p className="text-xs text-[#6b7280]">No user matching ID "{userId}" exists in the PostgreSQL database.</p>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#f15e75] text-white rounded-md text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Users List</span>
        </Link>
      </div>
    );
  }

  const isDeleted = user.status === 'DELETED';
  const fullName = (user.firstName || user.lastName) ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.email.split('@')[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#e5e7eb] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/users"
            className="p-2 bg-white border border-[#e5e7eb] text-[#4f5962] hover:text-[#f15e75] rounded-md transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-2xl font-extrabold ${isDeleted ? 'line-through text-gray-500' : 'text-[#2b2b2b]'}`}>
                {fullName}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                  user.role === 'ADMIN'
                    ? 'bg-[#fff1f3] text-[#f15e75] border border-[#f15e75]/30'
                    : user.role === 'HOST'
                    ? 'bg-teal-50 text-teal-700 border border-teal-200'
                    : 'bg-gray-100 text-[#4f5962] border border-gray-200'
                }`}
              >
                {user.role}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                  isDeleted
                    ? 'bg-rose-100 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {user.status || 'ACTIVE'}
              </span>
            </div>
            <p className="text-xs text-[#6b7280]">PostgreSQL User ID: {user.id}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            disabled={isDeleted}
            className="px-3.5 py-2 bg-white border border-[#e5e7eb] text-[#4f5962] hover:text-[#f15e75] hover:bg-[#fff1f3] rounded-md text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-40"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit User</span>
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={isDeleted}
            className="px-3.5 py-2 bg-[#fff1f3] text-[#f15e75] hover:bg-rose-100 border border-[#f15e75]/30 rounded-md text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete User</span>
          </button>
        </div>
      </div>

      {isDeleted && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-md text-xs space-y-1">
          <div className="flex items-center gap-2 font-extrabold text-rose-700">
            <ShieldAlert className="w-4 h-4" />
            <span>DELETED / ANONYMIZED USER ACCOUNT</span>
          </div>
          <p>
            This user account was soft-deleted/anonymized on{' '}
            {user.deletedAt ? new Date(user.deletedAt).toLocaleString() : 'N/A'}. Profile editing and role changes are disabled to preserve historical data integrity.
          </p>
        </div>
      )}

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

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="bg-white border border-[#e5e7eb] rounded-md p-6 shadow-sm space-y-6 text-xs text-[#4f5962]">
          <div className="text-center space-y-3 pb-4 border-b border-[#e5e7eb]">
            <div className="w-16 h-16 bg-[#fff1f3] text-[#f15e75] font-extrabold text-2xl rounded-full flex items-center justify-center mx-auto border border-[#f15e75]/30">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-bold text-[#2b2b2b]">{fullName}</h3>
              <p className="text-[11px] text-[#6b7280] font-mono">{user.email}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-[#2b2b2b] uppercase tracking-wider">Account Snapshot</h4>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[#6b7280]">Account Status:</span>
                <span className={`font-extrabold ${isDeleted ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {user.status || 'ACTIVE'}
                </span>
              </div>
              {user.deletedAt && (
                <div className="flex justify-between items-center">
                  <span className="text-[#6b7280]">Deleted Date:</span>
                  <span className="font-medium text-[#2b2b2b]">
                    {new Date(user.deletedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-[#6b7280]">Phone:</span>
                <span className="font-bold text-[#2b2b2b]">{user.phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6b7280]">WordPress ID:</span>
                <span className="font-mono text-[#2b2b2b]">{user.wpUserId || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6b7280]">Joined Date:</span>
                <span className="font-medium text-[#2b2b2b]">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#e5e7eb] space-y-2">
            <label className="block font-bold text-[#2b2b2b]">Change Account Role</label>
            <select
              disabled={isDeleted}
              value={user.role}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#f15e75] disabled:opacity-40"
            >
              <option value="GUEST">GUEST (Traveler)</option>
              <option value="HOST">HOST (Listing Owner)</option>
              <option value="ADMIN">ADMIN (System Administrator)</option>
            </select>
          </div>
        </div>

        {/* Right Column: Relationships & Owned Properties */}
        <div className="md:col-span-2 space-y-6">
          {/* Relationship Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-1">
              <span className="text-[11px] text-[#6b7280] font-bold uppercase">Properties Owned</span>
              <div className="text-2xl font-extrabold text-[#2b2b2b]">{user._count?.properties || 0}</div>
              {user._count?.properties > 0 && (
                <Link
                  href={`/admin/properties?search=${encodeURIComponent(user.email)}`}
                  className="text-[10px] text-[#f15e75] font-bold hover:underline flex items-center gap-1 mt-1"
                >
                  <span>Manage Listings</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            <div className="p-4 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-1">
              <span className="text-[11px] text-[#6b7280] font-bold uppercase">Bookings</span>
              <div className="text-2xl font-extrabold text-[#2b2b2b]">{user._count?.reservations || 0}</div>
              <Link
                href="/admin/reservations"
                className="text-[10px] text-[#6b7280] font-semibold hover:underline block mt-1"
              >
                View Reservations
              </Link>
            </div>

            <div className="p-4 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-1">
              <span className="text-[11px] text-[#6b7280] font-bold uppercase">Reviews</span>
              <div className="text-2xl font-extrabold text-[#2b2b2b]">{user._count?.reviews || 0}</div>
              <Link
                href="/admin/reviews"
                className="text-[10px] text-[#6b7280] font-semibold hover:underline block mt-1"
              >
                View Reviews
              </Link>
            </div>
          </div>

          {/* Owned Properties List */}
          <div className="bg-white border border-[#e5e7eb] rounded-md p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-[#e5e7eb] pb-3">
              <h3 className="text-sm font-extrabold text-[#2b2b2b] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#f15e75]" />
                <span>Owned Properties ({user.properties?.length || 0})</span>
              </h3>
            </div>

            {!user.properties || user.properties.length === 0 ? (
              <p className="text-xs text-[#6b7280] py-4 text-center">This user does not own any property listings.</p>
            ) : (
              <div className="divide-y divide-[#e5e7eb]">
                {user.properties.map((p: any) => (
                  <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-bold text-[#2b2b2b]">{p.title}</h4>
                      <span className="text-[10px] font-mono text-[#6b7280]">Slug: {p.slug}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[#2b2b2b]">${p.nightlyPrice}/night</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.status === 'PUBLISHED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {p.status}
                      </span>
                      <Link
                        href={`/admin/properties/${p.id}/edit`}
                        className="px-2.5 py-1 bg-[#f8fafc] border border-[#e5e7eb] text-[#4f5962] hover:text-[#f15e75] rounded text-[10px] font-bold transition-all"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e7eb] rounded-xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative animate-scaleUp">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute right-4 top-4 text-[#9ca3af] hover:text-[#2b2b2b]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2 border-b border-[#e5e7eb] pb-3">
              <div className="flex items-center gap-2 text-[#f15e75]">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-xl font-extrabold text-[#2b2b2b]">Delete User Account?</h3>
              </div>
              <p className="text-xs text-[#6b7280]">
                Are you sure you want to delete account "{fullName}" from PostgreSQL?
              </p>
            </div>

            <div className="p-3 bg-[#fff1f3] border border-[#f15e75]/30 rounded-md text-[11px] text-[#f15e75] font-medium leading-relaxed">
              <strong>Warning:</strong> If this user has historical reservations or invoices, profile details will be safely anonymized to preserve data integrity.
            </div>

            <div className="pt-2 border-t border-[#e5e7eb] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
                className="px-4 py-2.5 bg-white border border-[#e5e7eb] text-[#4f5962] rounded-md text-xs font-bold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deleteLoading}
                className="px-5 py-2.5 bg-[#f15e75] hover:bg-[#d94f64] text-white rounded-md text-xs font-extrabold transition-all shadow-md disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting User...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e7eb] rounded-md max-w-md w-full p-6 space-y-4 shadow-xl relative">
            <div className="flex justify-between items-center border-b border-[#e5e7eb] pb-3">
              <h3 className="text-lg font-bold text-[#2b2b2b]">Edit User Profile</h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 text-[#6b7280]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#2b2b2b] mb-1">First Name</label>
                <input
                  type="text"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#2b2b2b] mb-1">Last Name</label>
                <input
                  type="text"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#2b2b2b] mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#2b2b2b] mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
                />
              </div>

              <div className="pt-3 border-t border-[#e5e7eb] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-white border border-[#e5e7eb] text-[#4f5962] rounded-md text-xs font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#f15e75] hover:bg-[#d94f64] text-white rounded-md text-xs font-bold transition-all shadow-sm"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
