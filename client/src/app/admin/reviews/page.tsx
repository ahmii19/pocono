'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAdminReviews, deleteAdminReview } from '@/lib/api';
import {
  MessageSquare, Star, Search, Filter, RefreshCw, Eye, Trash2,
  Building2, User as UserIcon, Calendar, CheckCircle2, AlertCircle, ArrowUpDown
} from 'lucide-react';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('ALL');
  const [sortOption, setSortOption] = useState('newest');
  const [errorAlert, setErrorAlert] = useState('');
  const [successAlert, setSuccessAlert] = useState('');

  useEffect(() => {
    fetchReviews();
  }, [searchTerm, ratingFilter, sortOption]);

  const fetchReviews = async () => {
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;
    setLoading(true);
    try {
      const params: Record<string, any> = { sort: sortOption };
      if (searchTerm) params.search = searchTerm;
      if (ratingFilter !== 'ALL') params.rating = ratingFilter;

      const res = await getAdminReviews(token, params);
      setReviews(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReview = async (id: number) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    try {
      await deleteAdminReview(id, token);
      setSuccessAlert('Review deleted successfully!');
      setTimeout(() => setSuccessAlert(''), 3000);
      fetchReviews();
    } catch (err: any) {
      setErrorAlert(err.message || 'Error deleting review');
    }
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length).toFixed(1)
    : '5.0';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#e5e7eb] pb-6">
        <div>
          <span className="text-[#f15e75] text-xs font-bold uppercase tracking-wider block mb-1">
            PostgreSQL Reviews Management
          </span>
          <h1 className="text-3xl font-extrabold text-[#2b2b2b]">Guest Reviews Collection</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchReviews}
            className="p-2.5 bg-white border border-[#e5e7eb] text-[#4f5962] hover:text-[#f15e75] hover:bg-[#fff1f3] rounded-md text-xs font-bold transition-all shadow-sm flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
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

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-1">
          <span className="text-[11px] text-[#6b7280] font-bold uppercase">Total Reviews</span>
          <div className="text-2xl font-extrabold text-[#2b2b2b]">{reviews.length}</div>
          <span className="text-[10px] text-[#6b7280]">All PostgreSQL Reviews</span>
        </div>
        <div className="p-4 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-1">
          <span className="text-[11px] text-amber-500 font-bold uppercase">Average Score</span>
          <div className="text-2xl font-extrabold text-amber-500 flex items-center gap-1">
            <span>{avgRating}</span>
            <Star className="w-5 h-5 fill-current" />
          </div>
          <span className="text-[10px] text-[#6b7280]">Overall Rating Average</span>
        </div>
        <div className="p-4 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-1">
          <span className="text-[11px] text-emerald-600 font-bold uppercase">5-Star Ratings</span>
          <div className="text-2xl font-extrabold text-emerald-600">
            {reviews.filter(r => r.rating === 5).length}
          </div>
          <span className="text-[10px] text-[#6b7280]">Top Rating Counts</span>
        </div>
        <div className="p-4 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-1">
          <span className="text-[11px] text-[#f15e75] font-bold uppercase">Published Live</span>
          <div className="text-2xl font-extrabold text-[#f15e75]">{reviews.length}</div>
          <span className="text-[10px] text-[#6b7280]">Visible on Listings</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 border border-[#e5e7eb] rounded-md shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#9ca3af]" />
          <input
            type="text"
            placeholder="Search reviewer name, email, property, text..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-[#f15e75]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#9ca3af]" />
            <span className="text-xs text-[#4f5962] font-semibold">Rating:</span>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#f15e75] font-semibold"
            >
              <option value="ALL">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-[#9ca3af]" />
            <span className="text-xs text-[#4f5962] font-semibold">Sort:</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#f15e75] font-semibold"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Rating</option>
              <option value="lowest">Lowest Rating</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews Table */}
      {loading ? (
        <div className="p-12 text-center text-[#4f5962] text-sm font-medium">
          Loading Guest Reviews from PostgreSQL...
        </div>
      ) : reviews.length === 0 ? (
        <div className="p-12 bg-white border border-[#e5e7eb] rounded-md text-center space-y-2 shadow-sm">
          <p className="text-[#2b2b2b] font-bold">No guest reviews match your criteria.</p>
          <p className="text-xs text-[#6b7280]">Try clearing search parameters or rating filter.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#e5e7eb] rounded-md overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#4f5962] min-w-[800px]">
              <thead className="bg-[#f8fafc] text-[#6b7280] uppercase text-[10px] font-bold border-b border-[#e5e7eb]">
                <tr>
                  <th className="p-4">Rating</th>
                  <th className="p-4">Reviewer</th>
                  <th className="p-4">Property</th>
                  <th className="p-4">Comment Excerpt</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb]">
                {reviews.map((r) => {
                  const guestName = (r.guest?.firstName || r.guest?.lastName)
                    ? `${r.guest?.firstName || ''} ${r.guest?.lastName || ''}`.trim()
                    : r.guest?.email;

                  return (
                    <tr key={r.id} className="hover:bg-[#fff1f3]/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-amber-500 font-extrabold">
                          <span>{r.rating}</span>
                          <Star className="w-3.5 h-3.5 fill-current" />
                        </div>
                      </td>

                      <td className="p-4">
                        {r.guest ? (
                          <div>
                            <Link href={`/admin/users/${r.guest.id}`} className="font-bold text-[#2b2b2b] hover:text-[#f15e75]">
                              {guestName}
                            </Link>
                            <span className="text-[10px] text-[#6b7280] block">{r.guest.email}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Anonymous</span>
                        )}
                      </td>

                      <td className="p-4">
                        {r.property ? (
                          <div>
                            <Link href={`/admin/properties/${r.property.id}/edit`} className="font-bold text-[#2b2b2b] hover:text-[#f15e75] block truncate max-w-[180px]">
                              {r.property.title}
                            </Link>
                            <span className="text-[10px] text-[#6b7280] font-mono">Slug: {r.property.slug}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </td>

                      <td className="p-4">
                        <p className="text-xs text-[#2b2b2b] line-clamp-2 max-w-xs font-medium">
                          {r.comment || 'No comment provided.'}
                        </p>
                      </td>

                      <td className="p-4">
                        <span className="text-[#6b7280]">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </td>

                      <td className="p-4 text-center space-x-1.5">
                        <Link
                          href={`/admin/reviews/${r.id}`}
                          className="p-1.5 inline-block bg-[#f8fafc] hover:bg-[#fff1f3] text-[#4f5962] border border-[#e5e7eb] rounded-md transition-all"
                          title="View Review Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteReview(r.id)}
                          className="p-1.5 inline-block bg-[#fff1f3] text-[#f15e75] hover:bg-rose-100 rounded-md transition-all"
                          title="Delete Review"
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
        </div>
      )}
    </div>
  );
}
