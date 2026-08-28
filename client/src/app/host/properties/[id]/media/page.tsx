'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import HostNav from '@/components/HostNav';
import SafeImage from '@/components/SafeImage';
import {
  getHostPropertyMedia, uploadHostPropertyImage, deleteHostPropertyImage, setHostPrimaryImage
} from '@/lib/api';
import {
  ArrowLeft, Upload, Star, Trash2, Eye, AlertCircle, CheckCircle2, ShieldAlert
} from 'lucide-react';

export default function HostPropertyMediaPage() {
  const params = useParams();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<any | null>(null);
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchMedia();
  }, [propertyId]);

  const fetchMedia = async () => {
    setLoading(true);
    const token = localStorage.getItem('pocono_token');
    if (!token) return;

    try {
      const res = await getHostPropertyMedia(propertyId, token);
      setProperty(res.data.property);
      setImages(res.data.images || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load property media');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');
    setUploading(true);

    const token = localStorage.getItem('pocono_token');
    if (!token) return;

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        try {
          const res = await uploadHostPropertyImage(
            propertyId,
            {
              filename: file.name,
              mimeType: file.type,
              base64Data
            },
            token
          );
          setSuccess('Image uploaded successfully!');
          setTimeout(() => setSuccess(''), 3000);
          fetchMedia();
        } catch (uploadErr: any) {
          setError(uploadErr.message || 'Error uploading file');
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError('File processing error');
      setUploading(false);
    }
  };

  const handleSetPrimary = async (imageId: number) => {
    setError('');
    setSuccess('');
    const token = localStorage.getItem('pocono_token');
    if (!token) return;

    try {
      await setHostPrimaryImage(propertyId, imageId, token);
      setSuccess('Primary lead image updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      fetchMedia();
    } catch (err: any) {
      setError(err.message || 'Error setting primary image');
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!confirm('Are you sure you want to delete this photo from your listing?')) return;
    setError('');
    setSuccess('');
    const token = localStorage.getItem('pocono_token');
    if (!token) return;

    try {
      await deleteHostPropertyImage(propertyId, imageId, token);
      setSuccess('Image removed successfully!');
      setTimeout(() => setSuccess(''), 3000);
      fetchMedia();
    } catch (err: any) {
      setError(err.message || 'Error deleting image');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-[#2b2b2b]">
        <HostNav />
        <div className="p-12 text-center text-xs font-bold text-[#4f5962]">Loading photo gallery...</div>
      </div>
    );
  }

  if (error && error.includes('Forbidden')) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-[#2b2b2b]">
        <HostNav />
        <div className="max-w-md mx-auto my-12 p-8 bg-white border border-[#d8dce1] rounded-md text-center space-y-4 shadow-sm">
          <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
          <h2 className="text-xl font-extrabold text-[#2b2b2b]">Access Forbidden</h2>
          <p className="text-xs text-[#4f5962]">You do not have permission to manage media for this property.</p>
          <Link
            href="/host/properties"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#f15e75] text-white rounded-md text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Properties</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#2b2b2b]">
      <HostNav />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#d8dce1] pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/host/properties"
              className="p-2 bg-white border border-[#d8dce1] text-[#4f5962] hover:text-[#f15e75] rounded-md transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-extrabold text-[#2b2b2b]">
                Photo Gallery — {property?.title || 'Property'}
              </h1>
              <p className="text-xs text-[#4f5962] font-medium">
                Upload photos, select your primary lead photo, and manage your listing gallery.
              </p>
            </div>
          </div>

          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-[#f15e75] hover:bg-[#d94f64] text-white text-xs font-extrabold rounded-md shadow-xs transition-all w-fit">
            <Upload className="w-4 h-4" />
            <span>{uploading ? 'Uploading Photo...' : 'Upload New Photo'}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
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

        {/* Media Grid */}
        {images.length === 0 ? (
          <div className="bg-white border border-[#d8dce1] rounded-md p-12 text-center space-y-3 shadow-2xs">
            <Upload className="w-10 h-10 text-[#f15e75] mx-auto opacity-70" />
            <h3 className="text-lg font-bold text-[#2b2b2b]">No Gallery Photos Yet</h3>
            <p className="text-xs text-[#6b7280]">Upload JPG, PNG, or WebP photos to display on your property page.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {images.map((img) => (
              <div
                key={img.id}
                className={`bg-white border rounded-md overflow-hidden shadow-2xs group relative flex flex-col justify-between ${
                  img.isFeatured ? 'border-[#f15e75] ring-2 ring-[#f15e75]/20' : 'border-[#d8dce1]'
                }`}
              >
                <div className="relative aspect-4/3 bg-gray-100 overflow-hidden">
                  <SafeImage src={img.imageUrl} alt="Property Photo" className="w-full h-full object-cover" />
                  {img.isFeatured && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-[#f15e75] text-white text-[10px] font-extrabold rounded uppercase tracking-wider shadow-xs">
                      Primary Lead
                    </span>
                  )}
                </div>

                <div className="p-3 bg-white border-t border-[#d8dce1] flex items-center justify-between gap-2 text-xs">
                  {!img.isFeatured ? (
                    <button
                      onClick={() => handleSetPrimary(img.id)}
                      className="text-[11px] font-bold text-[#4f5962] hover:text-[#f15e75] flex items-center gap-1"
                    >
                      <Star className="w-3.5 h-3.5 text-amber-500" />
                      <span>Set as Primary</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-extrabold text-[#f15e75] flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-[#f15e75]" />
                      <span>Primary Photo</span>
                    </span>
                  )}

                  <button
                    onClick={() => handleDeleteImage(img.id)}
                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                    title="Delete Image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
