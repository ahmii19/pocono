'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import HostNav from '@/components/HostNav';
import { getHostReviews } from '@/lib/api';
import { Star, Building2, User, Calendar, AlertCircle } from 'lucide-react';

export default function HostReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    const token = localStorage.getItem('pocono_token');
    if (!token) return;

    try {
      const res = await getHostReviews(token);
      setReviews(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch host reviews');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#2b2b2b]">
      <HostNav />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center border-b border-[#d8dce1] pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-[#2b2b2b]">Guest Reviews</h1>
            <p className="text-xs text-[#4f5962] font-medium mt-1">
              Feedback and ratings submitted by guests for your property listings.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-[#fff1f3] border border-[#f15e75]/30 text-[#f15e75] rounded-md text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Reviews List */}
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-[#4f5962]">Loading guest reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="bg-white border border-[#d8dce1] rounded-md p-12 text-center space-y-3 shadow-2xs">
            <Star className="w-10 h-10 text-[#f15e75] mx-auto opacity-70" />
            <h3 className="text-lg font-bold text-[#2b2b2b]">No Reviews Yet</h3>
            <p className="text-xs text-[#6b7280]">When guests leave ratings and reviews after staying at your properties, they will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((rv) => (
              <div key={rv.id} className="bg-white border border-[#d8dce1] p-5 rounded-md shadow-2xs space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-[#2b2b2b] text-sm hover:text-[#f15e75]">
                      <Link href={`/listing/${rv.property?.slug}`}>{rv.property?.title}</Link>
                    </h4>
                    <p className="text-xs text-[#4f5962] font-semibold mt-0.5">
                      Reviewed by {rv.guest ? `${rv.guest.firstName || ''} ${rv.guest.lastName || ''}`.trim() : 'Verified Guest'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded text-xs font-extrabold text-amber-700">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>{rv.rating} / 5</span>
                  </div>
                </div>

                <p className="text-xs text-[#4f5962] leading-relaxed italic bg-gray-50 p-3 rounded border border-gray-200">
                  "{rv.comment || rv.content}"
                </p>

                <div className="text-[10px] text-gray-400 font-semibold text-right">
                  {new Date(rv.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
