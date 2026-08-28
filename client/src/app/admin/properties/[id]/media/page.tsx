'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getPropertyMedia, uploadPropertyImage, setPrimaryImage,
  reorderPropertyImages, deletePropertyImage
} from '@/lib/api';
import {
  ArrowLeft, Upload, Star, Trash2, ArrowUp, ArrowDown,
  Image as ImageIcon, CheckCircle2, AlertCircle, RefreshCw, Eye
} from 'lucide-react';

export default function AdminPropertyMediaPage() {
  const params = useParams();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload State
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  useEffect(() => {
    fetchMedia();
  }, [propertyId]);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await getPropertyMedia(propertyId);
      setProperty(res.property);
      setImages(res.images || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load property media');
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

    const token = localStorage.getItem('pocono_admin_token');
    if (!token) {
      setError('Admin authentication required.');
      setUploading(false);
      return;
    }

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const payload = {
          filename: file.name,
          mimeType: file.type,
          base64Data
        };

        await uploadPropertyImage(propertyId, payload, token);
        setSuccess(`Image "${file.name}" uploaded successfully!`);
        setTimeout(() => setSuccess(''), 4000);
        fetchMedia();
      };
      reader.onerror = () => {
        setError('Failed to read file binary');
      };
    } catch (err: any) {
      setError(err.message || 'Error uploading image');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSetPrimary = async (imageId: number) => {
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;
    try {
      await setPrimaryImage(propertyId, imageId, token);
      setSuccess('Primary lead image updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      fetchMedia();
    } catch (err: any) {
      alert(err.message || 'Error setting primary image');
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === images.length - 1)) {
      return;
    }

    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    const newImages = [...images];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newImages[index];
    newImages[index] = newImages[targetIndex];
    newImages[targetIndex] = temp;

    const orders = newImages.map((img, idx) => ({ id: img.id, displayOrder: idx + 1 }));

    try {
      setImages(newImages);
      await reorderPropertyImages(propertyId, orders, token);
      fetchMedia();
    } catch (err: any) {
      alert(err.message || 'Error reordering images');
      fetchMedia();
    }
  };

  const confirmDeleteImage = async () => {
    if (!deleteTarget) return;
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;

    try {
      await deletePropertyImage(propertyId, deleteTarget.id, token);
      setDeleteTarget(null);
      setSuccess('Property image deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
      fetchMedia();
    } catch (err: any) {
      alert(err.message || 'Error deleting image');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-[#4f5962] text-sm font-medium">Loading property media gallery...</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#e5e7eb] pb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/properties"
            className="p-2 bg-white border border-[#e5e7eb] text-[#4f5962] hover:text-[#f15e75] rounded-md transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <span className="text-[#f15e75] text-xs font-bold uppercase tracking-wider block mb-1">
              Property Media CMS
            </span>
            <h1 className="text-3xl font-extrabold text-[#2b2b2b]">
              {property?.title || 'Property'} Media Gallery
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-[#fff1f3] text-[#f15e75] border border-[#f15e75]/20 rounded-md text-xs font-bold">
            {images.length} Image{images.length === 1 ? '' : 's'} Total
          </span>
          <button
            onClick={fetchMedia}
            className="p-2.5 bg-white border border-[#e5e7eb] text-[#4f5962] hover:text-[#f15e75] hover:bg-[#fff1f3] rounded-md text-xs font-bold transition-all shadow-sm flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Alert Messages */}
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

      {/* Upload Zone */}
      <div className="bg-white border border-[#e5e7eb] rounded-md p-6 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-[#2b2b2b]">Upload New Property Photo</h3>
        <p className="text-xs text-[#6b7280]">
          Supported Formats: JPG, PNG, WebP (Max 10MB per file). Duplicate binaries will be automatically detected.
        </p>

        <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#f15e75] hover:bg-[#d94f64] text-white rounded-md text-xs font-bold cursor-pointer transition-all shadow-sm">
          <Upload className="w-4 h-4" />
          <span>{uploading ? 'Uploading Binary...' : 'Select Photo to Upload'}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Media Grid */}
      {images.length === 0 ? (
        <div className="p-12 bg-white border border-[#e5e7eb] rounded-md text-center space-y-2 shadow-sm">
          <p className="text-[#2b2b2b] font-bold">No property images uploaded yet.</p>
          <p className="text-xs text-[#6b7280]">Use the upload form above to add high-resolution photos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {images.map((img, idx) => {
            const fileName = img.imageUrl ? img.imageUrl.split('/').pop() : `Image #${img.id}`;
            return (
              <div
                key={img.id}
                className={`bg-white border rounded-md overflow-hidden shadow-sm flex flex-col justify-between transition-all ${
                  img.isFeatured ? 'border-[#f15e75] ring-2 ring-[#f15e75]/20' : 'border-[#e5e7eb]'
                }`}
              >
                {/* Image Preview & Badges */}
                <div className="aspect-video relative bg-gray-50 overflow-hidden group">
                  <img
                    src={img.imageUrl}
                    alt={`Property Photo ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e: any) => { e.target.src = '/placeholder.jpg'; }}
                  />

                  {/* Primary Lead Photo Badge */}
                  {img.isFeatured && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-[#f15e75] text-white text-[10px] font-extrabold rounded shadow flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current text-amber-300" />
                      <span>Primary Photo</span>
                    </div>
                  )}

                  {/* Display Order Badge */}
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono font-bold rounded">
                    Order #{idx + 1}
                  </div>
                </div>

                {/* Card Content & Filename */}
                <div className="p-3 text-xs space-y-2 border-t border-[#e5e7eb]">
                  <div className="font-bold text-[#2b2b2b] truncate" title={fileName}>
                    {fileName}
                  </div>
                  <div className="text-[10px] text-[#6b7280] truncate font-mono">
                    ID: {img.id}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-3 bg-[#f8fafc] border-t border-[#e5e7eb] flex items-center justify-between gap-1">
                  {/* Reorder Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveOrder(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 bg-white border border-[#e5e7eb] text-[#4f5962] hover:text-[#f15e75] rounded disabled:opacity-30"
                      title="Move Left/Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveOrder(idx, 'down')}
                      disabled={idx === images.length - 1}
                      className="p-1 bg-white border border-[#e5e7eb] text-[#4f5962] hover:text-[#f15e75] rounded disabled:opacity-30"
                      title="Move Right/Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Primary Toggle & Delete */}
                  <div className="flex items-center gap-1.5">
                    {!img.isFeatured && (
                      <button
                        onClick={() => handleSetPrimary(img.id)}
                        className="px-2 py-1 bg-white border border-[#e5e7eb] text-[#4f5962] hover:text-[#f15e75] hover:border-[#f15e75]/30 rounded text-[10px] font-bold transition-all"
                      >
                        Set Primary
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteTarget(img)}
                      className="p-1.5 bg-[#fff1f3] text-[#f15e75] hover:bg-rose-100 rounded transition-all"
                      title="Delete Image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e7eb] rounded-md max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-[#f15e75]">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-[#2b2b2b]">Delete Property Image?</h3>
            </div>
            <p className="text-xs text-[#4f5962] leading-relaxed">
              Are you sure you want to delete this property photo permanently?
            </p>
            <div className="p-3 bg-[#f8fafc] border border-[#e5e7eb] rounded space-y-2">
              <div className="aspect-video w-full rounded overflow-hidden bg-gray-100">
                <img src={deleteTarget.imageUrl} alt="Target" className="w-full h-full object-cover" />
              </div>
              <div className="text-[11px] font-mono text-[#6b7280] truncate">
                {deleteTarget.imageUrl}
              </div>
            </div>

            <div className="pt-2 border-t border-[#e5e7eb] flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-white border border-[#e5e7eb] text-[#4f5962] rounded-md text-xs font-bold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteImage}
                className="px-4 py-2 bg-[#f15e75] hover:bg-[#d94f64] text-white rounded-md text-xs font-bold transition-all"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
