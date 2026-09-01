'use client';

import AdminLoader from '@/components/admin/AdminLoader';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAdminReviewById, deleteAdminReview } from '@/lib/api';
import {
  ArrowLeft, Star, MessageSquare, Building2, User as UserIcon, Calendar,
  ExternalLink, Trash2, CheckCircle2, AlertCircle
} from 'lucide-react';

export default function AdminReviewDetailPage() {
  const params = useParams();
  const reviewId = params.id as string;
  const router = useRouter();

  const [review, setReview] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReview();
  }, [reviewId]);

  const fetchReview = async () => {
    setLoading(true);
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    try {
      const res = await getAdminReviewById(reviewId, token);
      setReview(res.data);
    } catch (e: any) {
      setError(e.message || 'Failed to load review detail');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this review permanently?')) return;
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    try {
      await deleteAdminReview(reviewId, token);
      router.push('/admin/reviews');
    } catch (err: any) {
      alert(err.message || 'Error deleting review');
    }
  };

  if (loading) {
    return <AdminLoader variant="page" message="Loading Review Details..." />;
  }

  if (!review) {
    return (
      <div className="p-8 bg-white border border-[#e5e7eb] rounded-md text-center space-y-4 shadow-sm max-w-2xl mx-auto">
        <AlertCircle className="w-8 h-8 text-[#f15e75] mx-auto" />
        <h2 className="text-xl font-bold text-[#2b2b2b]">Review Not Found</h2>
        <p className="text-xs text-[#6b7280]">No review matching ID "{reviewId}" exists in PostgreSQL.</p>
        <Link href="/admin/reviews" className="inline-flex items-center gap-2 px-4 py-2 bg-[#f15e75] text-white rounded-md text-xs font-bold">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Reviews List</span>
        </Link>
      </div>
    );
  }

  const guestName = (review.guest?.firstName || review.guest?.lastName)
    ? `${review.guest?.firstName || ''} ${review.guest?.lastName || ''}`.trim()
    : review.guest?.email;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#e5e7eb] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/reviews"
            className="p-2 bg-white border border-[#e5e7eb] text-[#4f5962] hover:text-[#f15e75] rounded-md transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-[#2b2b2b]">Guest Review #{review.id}</h1>
            <p className="text-xs text-[#6b7280]">Submitted on {new Date(review.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-[#fff1f3] text-[#f15e75] hover:bg-rose-100 rounded-md text-xs font-bold transition-all flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete Review</span>
        </button>
      </div>

      {/* Review Content Card */}
      <div className="bg-white border border-[#e5e7eb] rounded-md p-6 shadow-sm space-y-6 text-xs text-[#4f5962]">
        <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#2b2b2b]">Overall Rating:</span>
            <div className="flex items-center gap-1 text-amber-500 font-extrabold text-base">
              <span>{review.rating}.0</span>
              <div className="flex items-center text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < review.rating ? 'fill-current text-amber-400' : 'text-gray-200'}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
            Published Live
          </span>
        </div>

        {/* Comment Text */}
        <div className="space-y-2">
          <h4 className="font-extrabold text-[#2b2b2b] uppercase text-[11px]">Guest Comment</h4>
          <p className="p-4 bg-[#f8fafc] border border-[#e5e7eb] rounded-md text-sm text-[#2b2b2b] leading-relaxed italic">
            "{review.comment || 'No written comment provided.'}"
          </p>
        </div>

        {/* Relationships */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-[#e5e7eb]">
          {/* Property Card */}
          <div className="p-4 bg-[#f8fafc] border border-[#e5e7eb] rounded-md space-y-2">
            <span className="text-[10px] text-[#6b7280] font-bold uppercase block">Reviewed Property</span>
            {review.property ? (
              <div>
                <h5 className="font-bold text-[#2b2b2b] text-sm">{review.property.title}</h5>
                <p className="text-[10px] text-[#6b7280] font-mono mb-2">Slug: {review.property.slug}</p>
                <Link
                  href={`/admin/properties/${review.property.id}/edit`}
                  className="text-[11px] text-[#f15e75] font-bold hover:underline flex items-center gap-1"
                >
                  <span>View Property in CMS</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <span className="text-gray-400">Property Unassigned</span>
            )}
          </div>

          {/* Guest Card */}
          <div className="p-4 bg-[#f8fafc] border border-[#e5e7eb] rounded-md space-y-2">
            <span className="text-[10px] text-[#6b7280] font-bold uppercase block">Reviewer Guest</span>
            {review.guest ? (
              <div>
                <h5 className="font-bold text-[#2b2b2b] text-sm">{guestName}</h5>
                <p className="text-[11px] text-[#6b7280] mb-2">{review.guest.email}</p>
                <Link
                  href={`/admin/users/${review.guest.id}`}
                  className="text-[11px] text-[#f15e75] font-bold hover:underline flex items-center gap-1"
                >
                  <span>View Guest Profile</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <span className="text-gray-400">Guest Unassigned</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
