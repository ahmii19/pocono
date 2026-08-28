'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getAdminUsers, updateUserRole, updateAdminUserProfile, deleteAdminUser
} from '@/lib/api';
import {
  Users, Search, Filter, Mail, Phone, Calendar, Building2,
  CheckCircle2, Eye, X, RefreshCw, Edit3, Trash2, ShieldAlert,
  UserCheck, Award, AlertCircle, AlertTriangle
} from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals State
  const [editUserModal, setEditUserModal] = useState<any | null>(null);
  const [deleteModalUser, setDeleteModalUser] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [errorAlert, setErrorAlert] = useState('');
  const [successAlert, setSuccessAlert] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [searchTerm, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (searchTerm) params.search = searchTerm;
      if (roleFilter !== 'ALL') params.role = roleFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await getAdminUsers(token, params);
      setUsers(res.data || []);
    } catch (e) {
      console.error('Error fetching admin users:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setErrorAlert('');
    setSuccessAlert('');
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    try {
      await updateUserRole(userId, newRole, token);
      setSuccessAlert('User role updated successfully!');
      setTimeout(() => setSuccessAlert(''), 3000);
      fetchUsers();
    } catch (err: any) {
      setErrorAlert(err.message || 'Error updating user role');
    }
  };

  const openEditModal = (u: any) => {
    if (u.status === 'DELETED') {
      setErrorAlert('Cannot edit profile of a deleted user account.');
      return;
    }
    setEditUserModal(u);
    setEditFirstName(u.firstName || '');
    setEditLastName(u.lastName || '');
    setEditEmail(u.email || '');
    setEditPhone(u.phone || '');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserModal) return;
    setErrorAlert('');
    setSuccessAlert('');

    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    try {
      await updateAdminUserProfile(
        editUserModal.id,
        {
          firstName: editFirstName,
          lastName: editLastName,
          email: editEmail,
          phone: editPhone
        },
        token
      );

      setSuccessAlert('User profile updated successfully!');
      setTimeout(() => setSuccessAlert(''), 3000);
      setEditUserModal(null);
      fetchUsers();
    } catch (err: any) {
      setErrorAlert(err.message || 'Error updating profile');
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteModalUser) return;
    setErrorAlert('');
    setSuccessAlert('');
    setDeleteLoading(true);

    const token = localStorage.getItem('pocono_admin_token');
    if (!token) {
      setDeleteLoading(false);
      return;
    }

    try {
      const res = await deleteAdminUser(deleteModalUser.id, token);
      setSuccessAlert(res.message || 'User account deleted successfully.');
      setTimeout(() => setSuccessAlert(''), 3000);
      setDeleteModalUser(null);
      fetchUsers();
    } catch (err: any) {
      setErrorAlert(err.message || 'Error deleting user');
    } finally {
      setDeleteLoading(false);
    }
  };

  const activeUsersCount = users.filter((u) => u.status !== 'DELETED').length;
  const deletedUsersCount = users.filter((u) => u.status === 'DELETED').length;
  const totalAdmins = users.filter((u) => u.role === 'ADMIN' && u.status !== 'DELETED').length;
  const totalHosts = users.filter((u) => u.role === 'HOST' && u.status !== 'DELETED').length;
  const totalGuests = users.filter((u) => u.role === 'GUEST' && u.status !== 'DELETED').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#e5e7eb] pb-6">
        <div>
          <span className="text-[#f15e75] text-xs font-bold uppercase tracking-wider block mb-1">
            PostgreSQL User Management
          </span>
          <h1 className="text-3xl font-extrabold text-[#2b2b2b]">Users &amp; Hosts Collection</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            className="p-2.5 bg-white border border-[#e5e7eb] text-[#4f5962] hover:text-[#f15e75] hover:bg-[#fff1f3] rounded-md text-xs font-bold transition-all shadow-sm flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {errorAlert && (
        <div className="p-3 bg-[#fff1f3] border border-[#f15e75]/30 text-[#f15e75] rounded-md text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorAlert}</span>
        </div>
      )}

      {successAlert && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successAlert}</span>
        </div>
      )}

      {/* Role & Status Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-1">
          <span className="text-[11px] text-[#6b7280] font-bold uppercase">Active User Accounts</span>
          <div className="text-2xl font-extrabold text-[#2b2b2b]">{activeUsersCount}</div>
          <span className="text-[10px] text-[#6b7280]">PostgreSQL Active Users</span>
        </div>
        <div className="p-4 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-1">
          <span className="text-[11px] text-[#f15e75] font-bold uppercase">Administrators</span>
          <div className="text-2xl font-extrabold text-[#f15e75]">{totalAdmins}</div>
          <span className="text-[10px] text-[#6b7280]">Full System Access</span>
        </div>
        <div className="p-4 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-1">
          <span className="text-[11px] text-teal-600 font-bold uppercase">Property Hosts</span>
          <div className="text-2xl font-extrabold text-teal-600">{totalHosts}</div>
          <span className="text-[10px] text-[#6b7280]">Verified Listing Owners</span>
        </div>
        <div className="p-4 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-1">
          <span className="text-[11px] text-rose-700 font-bold uppercase">Deleted / Anonymized</span>
          <div className="text-2xl font-extrabold text-rose-700">{deletedUsersCount}</div>
          <span className="text-[10px] text-[#6b7280]">Preserved History</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 border border-[#e5e7eb] rounded-md shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#9ca3af]" />
          <input
            type="text"
            placeholder="Search users by name, email, phone, WP ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-[#f15e75]"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-[#9ca3af]" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#f15e75] font-semibold"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="HOST">HOST</option>
              <option value="GUEST">GUEST</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#f15e75] font-semibold"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DELETED">DELETED</option>
            </select>
          </div>
        </div>
      </div>

      {/* User Records Table */}
      {loading ? (
        <div className="p-12 text-center text-[#4f5962] text-sm font-medium">
          Loading Users Collection from PostgreSQL...
        </div>
      ) : users.length === 0 ? (
        <div className="p-12 bg-white border border-[#e5e7eb] rounded-md text-center space-y-2 shadow-sm">
          <p className="text-[#2b2b2b] font-bold">No users match your criteria.</p>
          <p className="text-xs text-[#6b7280]">Try clearing your search term or role filter.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#e5e7eb] rounded-md overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs text-[#4f5962]">
            <thead className="bg-[#f8fafc] text-[#6b7280] uppercase text-[10px] font-bold border-b border-[#e5e7eb]">
              <tr>
                <th className="p-4">User Details</th>
                <th className="p-4">Email Address</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Properties / Bookings</th>
                <th className="p-4 text-right">Role Management</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e7eb]">
              {users.map((u) => {
                const isDeleted = u.status === 'DELETED';
                return (
                  <tr key={u.id} className={`hover:bg-[#fff1f3]/30 transition-colors ${isDeleted ? 'bg-gray-50/70 text-gray-500' : ''}`}>
                    <td className="p-4">
                      <div className={`font-bold ${isDeleted ? 'line-through text-gray-500' : 'text-[#2b2b2b]'}`}>
                        {(u.firstName || u.lastName) ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : u.email.split('@')[0]}
                      </div>
                      <span className="text-[10px] text-[#9ca3af] block truncate max-w-[150px]">ID: {u.id}</span>
                    </td>

                    <td className="p-4 font-mono text-[11px]">
                      {u.email}
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase inline-block ${
                          u.role === 'ADMIN'
                            ? 'bg-[#fff1f3] text-[#f15e75] border border-[#f15e75]/30'
                            : u.role === 'HOST'
                            ? 'bg-teal-50 text-teal-700 border border-teal-200'
                            : 'bg-gray-100 text-[#4f5962] border border-gray-200'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isDeleted
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {u.status || 'ACTIVE'}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="text-[#6b7280] text-[11px] space-y-0.5">
                        <div>
                          Properties:{' '}
                          {u._count?.properties > 0 ? (
                            <Link
                              href={`/admin/properties?search=${encodeURIComponent(u.email)}`}
                              className="font-bold text-[#f15e75] hover:underline"
                            >
                              {u._count.properties} Owned
                            </Link>
                          ) : (
                            <span className="font-bold text-[#2b2b2b]">0</span>
                          )}
                        </div>
                        <div>Bookings: <span className="font-bold text-[#2b2b2b]">{u._count?.reservations || 0}</span></div>
                      </div>
                    </td>

                    <td className="p-4 text-right">
                      <select
                        disabled={isDeleted}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-2.5 py-1 text-xs focus:outline-none focus:border-[#f15e75] font-semibold cursor-pointer disabled:opacity-50"
                      >
                        <option value="GUEST">GUEST</option>
                        <option value="HOST">HOST</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>

                    <td className="p-4 text-center space-x-1.5">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="p-1.5 inline-block bg-[#f8fafc] hover:bg-[#fff1f3] text-[#4f5962] border border-[#e5e7eb] rounded-md transition-all"
                        title="View User Detail"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>

                      <button
                        onClick={() => openEditModal(u)}
                        disabled={isDeleted}
                        className="p-1.5 inline-block bg-[#f8fafc] hover:bg-[#fff1f3] text-[#f15e75] border border-[#e5e7eb] rounded-md transition-all disabled:opacity-30"
                        title="Edit Profile"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setDeleteModalUser(u)}
                        disabled={isDeleted}
                        className="p-1.5 inline-block bg-[#fff1f3] text-[#f15e75] hover:bg-rose-100 border border-[#f15e75]/30 rounded-md transition-all disabled:opacity-30"
                        title="Delete User Account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e7eb] rounded-xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative animate-scaleUp">
            <button
              onClick={() => setDeleteModalUser(null)}
              className="absolute right-4 top-4 text-[#9ca3af] hover:text-[#2b2b2b]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2 border-b border-[#e5e7eb] pb-3">
              <div className="flex items-center gap-2 text-[#f15e75]">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-xl font-extrabold text-[#2b2b2b]">Delete User?</h3>
              </div>
              <p className="text-xs text-[#6b7280]">
                Are you sure you want to delete this user account from PostgreSQL?
              </p>
            </div>

            {/* User Account Snapshot */}
            <div className="bg-[#f8fafc] border border-[#e5e7eb] rounded-lg p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#6b7280] font-semibold">User Name:</span>
                <span className="font-bold text-[#2b2b2b]">
                  {deleteModalUser.firstName || deleteModalUser.lastName
                    ? `${deleteModalUser.firstName || ''} ${deleteModalUser.lastName || ''}`.trim()
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b7280] font-semibold">Email Address:</span>
                <span className="font-mono text-[#2b2b2b]">{deleteModalUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b7280] font-semibold">Role:</span>
                <span className="font-bold text-[#f15e75]">{deleteModalUser.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b7280] font-semibold">User ID:</span>
                <span className="font-mono text-[10px] text-[#6b7280]">{deleteModalUser.id}</span>
              </div>

              <div className="pt-2 border-t border-[#e5e7eb] grid grid-cols-3 gap-2 text-center text-[10px]">
                <div className="bg-white p-2 border border-[#e5e7eb] rounded">
                  <span className="block text-[#6b7280]">Properties</span>
                  <span className="font-extrabold text-[#2b2b2b] text-sm">{deleteModalUser._count?.properties || 0}</span>
                </div>
                <div className="bg-white p-2 border border-[#e5e7eb] rounded">
                  <span className="block text-[#6b7280]">Reservations</span>
                  <span className="font-extrabold text-[#2b2b2b] text-sm">{deleteModalUser._count?.reservations || 0}</span>
                </div>
                <div className="bg-white p-2 border border-[#e5e7eb] rounded">
                  <span className="block text-[#6b7280]">Reviews</span>
                  <span className="font-extrabold text-[#2b2b2b] text-sm">{deleteModalUser._count?.reviews || 0}</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#fff1f3] border border-[#f15e75]/30 rounded-md text-[11px] text-[#f15e75] font-medium leading-relaxed">
              <strong>Warning:</strong> This action cannot be undone. If the user has historical reservations or invoices, profile details will be safely anonymized to preserve data integrity.
            </div>

            <div className="pt-2 border-t border-[#e5e7eb] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                disabled={deleteLoading}
                className="px-4 py-2.5 bg-white border border-[#e5e7eb] text-[#4f5962] rounded-md text-xs font-bold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
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
      {editUserModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e7eb] rounded-md max-w-md w-full p-6 space-y-4 shadow-xl relative">
            <div className="flex justify-between items-center border-b border-[#e5e7eb] pb-3">
              <h3 className="text-lg font-bold text-[#2b2b2b]">Edit User Profile</h3>
              <button onClick={() => setEditUserModal(null)} className="p-1 text-[#6b7280]">
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
                  onClick={() => setEditUserModal(null)}
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
