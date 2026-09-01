'use client';

import AdminLoader from '@/components/admin/AdminLoader';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getAdminPropertyById, updateAdminProperty, getCities, getCommunities, getPropertyTypes, getAdminUsers } from '@/lib/api';
import { ArrowLeft, Save, Building2, AlertCircle, CheckCircle2, ArrowRight, Check } from 'lucide-react';

export default function AdminEditPropertyPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;

  const [currentStep, setCurrentStep] = useState(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Taxonomies & Hosts
  const [cities, setCities] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<any[]>([]);
  const [hosts, setHosts] = useState<any[]>([]);

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [nightlyPrice, setNightlyPrice] = useState('');
  const [maxGuests, setMaxGuests] = useState('1');
  const [bedrooms, setBedrooms] = useState('1');
  const [beds, setBeds] = useState('1');
  const [bathrooms, setBathrooms] = useState('1');
  const [address, setAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [cityId, setCityId] = useState('');
  const [communityId, setCommunityId] = useState('');
  const [propertyTypeId, setPropertyTypeId] = useState('');
  const [hostId, setHostId] = useState('');
  const [status, setStatus] = useState('PUBLISHED');
  const [isFeatured, setIsFeatured] = useState(false);

  const steps = [
    { id: 1, title: 'Basic Details', description: 'Title, Slug & Description' },
    { id: 2, title: 'Pricing & Capacity', description: 'Rates & Room Counts' },
    { id: 3, title: 'Relationships & Location', description: 'Taxonomies & Address' },
    { id: 4, title: 'Visibility & Status', description: 'Publishing & Homepage Flags' }
  ];

  useEffect(() => {
    loadData();
  }, [propertyId]);

  const loadData = async () => {
    setInitialLoading(true);
    const token = localStorage.getItem('pocono_admin_token');
    try {
      const [pRes, cRes, commRes, tRes, uRes] = await Promise.all([
        token ? getAdminPropertyById(propertyId, token) : Promise.resolve({ data: null }),
        getCities(),
        getCommunities(),
        getPropertyTypes(),
        token ? getAdminUsers(token, { role: 'HOST' }) : Promise.resolve({ data: [] })
      ]);

      const prop = pRes.data;
      if (prop) {
        setTitle(prop.title || '');
        setSlug(prop.slug || '');
        setDescription(prop.description || '');
        setNightlyPrice(String(prop.nightlyPrice || '100'));
        setMaxGuests(String(prop.maxGuests || '1'));
        setBedrooms(String(prop.bedrooms || '1'));
        setBeds(String(prop.beds || '1'));
        setBathrooms(String(prop.bathrooms || '1'));
        setAddress(prop.address || '');
        setZipCode(prop.zipCode || '');
        setCityId(prop.cityId ? String(prop.cityId) : '');
        setCommunityId(prop.communityId ? String(prop.communityId) : '');
        setPropertyTypeId(prop.propertyTypeId ? String(prop.propertyTypeId) : '');
        setHostId(prop.hostId || '');
        setStatus(prop.status || 'PUBLISHED');
        setIsFeatured(Boolean(prop.isFeatured));
      }

      setCities(cRes.data || []);
      setCommunities(commRes.data || []);
      setPropertyTypes(tRes.data || []);
      setHosts(uRes.data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load property');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (currentStep === 1) {
      if (!title.trim()) {
        setError('Property Title is required.');
        return;
      }
      if (!slug.trim()) {
        setError('URL Slug is required.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const priceNum = Number(nightlyPrice);
      if (isNaN(priceNum) || priceNum <= 0) {
        setError('Nightly Price ($) must be greater than 0.');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  const handlePrevStep = () => {
    setError('');
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Final Pass Validation
    if (!title.trim() || !slug.trim()) {
      setError('Property Title and URL Slug are required.');
      setCurrentStep(1);
      return;
    }

    const priceNum = Number(nightlyPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Nightly Price ($) must be greater than 0.');
      setCurrentStep(2);
      return;
    }

    setLoading(true);

    const token = localStorage.getItem('pocono_admin_token');
    if (!token) {
      setError('Admin authentication required.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        title,
        slug,
        description,
        nightlyPrice,
        maxGuests,
        bedrooms,
        beds,
        bathrooms,
        address,
        zipCode,
        cityId: cityId || null,
        communityId: communityId || null,
        propertyTypeId: propertyTypeId || null,
        hostId: hostId || undefined,
        status,
        isFeatured
      };

      await updateAdminProperty(propertyId, payload, token);
      setSuccess('Property updated successfully in PostgreSQL!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Error updating property');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="p-8 text-center text-[#4f5962] text-sm font-medium">Loading property details from PostgreSQL...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#e5e7eb] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/properties"
            className="p-2 bg-white border border-[#e5e7eb] text-[#4f5962] hover:text-[#f15e75] rounded-md transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-[#2b2b2b]">Edit Property</h1>
            <p className="text-xs text-[#6b7280]">Updating PostgreSQL Record ID: {propertyId}</p>
          </div>
        </div>
      </div>

      {/* Progress Stepper Bar */}
      <div className="bg-white border border-[#e5e7eb] rounded-md p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {steps.map((s) => {
            const isCompleted = s.id < currentStep;
            const isActive = s.id === currentStep;
            return (
              <div
                key={s.id}
                className={`flex items-center gap-3 p-3 rounded-md border transition-all ${
                  isActive
                    ? 'bg-[#fff1f3] border-[#f15e75] text-[#2b2b2b]'
                    : isCompleted
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                    : 'bg-[#f8fafc] border-[#e5e7eb] text-[#9ca3af]'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
                    isActive
                      ? 'bg-[#f15e75] text-white shadow-xs'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : s.id}
                </div>
                <div className="min-w-0">
                  <span
                    className={`block text-xs font-extrabold truncate ${
                      isActive ? 'text-[#f15e75]' : isCompleted ? 'text-emerald-800' : 'text-[#4f5962]'
                    }`}
                  >
                    Step {s.id}: {s.title}
                  </span>
                  <span className="block text-[10px] text-[#6b7280] truncate font-medium">
                    {s.description}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
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

      {/* Property Edit Wizard Container */}
      <div className="bg-white border border-[#e5e7eb] rounded-md shadow-sm p-6 text-xs text-[#4f5962]">
        {/* STEP 1: Basic Details */}
        {currentStep === 1 && (
          <form onSubmit={handleNextStep} className="space-y-6">
            <div className="space-y-4">
              <div className="border-b border-[#e5e7eb] pb-2 flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[#2b2b2b]">1. Basic Details</h3>
                <span className="text-[10px] text-[#6b7280] font-mono">Step 1 of 4</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#2b2b2b] mb-1">Property Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#f15e75]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2b2b2b] mb-1">URL Slug *</label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 text-xs font-mono font-medium focus:outline-none focus:border-[#f15e75]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#2b2b2b] mb-1">Description</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md p-3 text-xs font-medium focus:outline-none focus:border-[#f15e75]"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[#e5e7eb]">
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#f15e75] hover:bg-[#d94f64] text-white font-bold rounded-md text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <span>Next: Pricing &amp; Capacity</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Pricing & Capacity */}
        {currentStep === 2 && (
          <form onSubmit={handleNextStep} className="space-y-6">
            <div className="space-y-4">
              <div className="border-b border-[#e5e7eb] pb-2 flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[#2b2b2b]">2. Pricing &amp; Capacity</h3>
                <span className="text-[10px] text-[#6b7280] font-mono">Step 2 of 4</span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div>
                  <label className="block font-bold text-[#2b2b2b] mb-1">Nightly Price ($) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={nightlyPrice}
                    onChange={(e) => setNightlyPrice(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#f15e75]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2b2b2b] mb-1">Max Guests</label>
                  <input
                    type="number"
                    min="1"
                    value={maxGuests}
                    onChange={(e) => setMaxGuests(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#f15e75]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2b2b2b] mb-1">Bedrooms</label>
                  <input
                    type="number"
                    min="0"
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#f15e75]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2b2b2b] mb-1">Beds</label>
                  <input
                    type="number"
                    min="0"
                    value={beds}
                    onChange={(e) => setBeds(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#f15e75]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2b2b2b] mb-1">Bathrooms</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#f15e75]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-[#e5e7eb]">
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-4 py-2 bg-white border border-[#e5e7eb] text-[#4f5962] hover:text-[#f15e75] rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#f15e75] hover:bg-[#d94f64] text-white font-bold rounded-md text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <span>Next: Relationships &amp; Location</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Relationships & Location */}
        {currentStep === 3 && (
          <form onSubmit={handleNextStep} className="space-y-6">
            <div className="space-y-4">
              <div className="border-b border-[#e5e7eb] pb-2 flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[#2b2b2b]">3. Relationships &amp; Location</h3>
                <span className="text-[10px] text-[#6b7280] font-mono">Step 3 of 4</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block font-bold text-[#2b2b2b] mb-1">City / Region</label>
                  <select
                    value={cityId}
                    onChange={(e) => setCityId(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#f15e75]"
                  >
                    <option value="">Select City</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#2b2b2b] mb-1">Subdivision / Community</label>
                  <select
                    value={communityId}
                    onChange={(e) => setCommunityId(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#f15e75]"
                  >
                    <option value="">Select Community</option>
                    {communities.map((comm) => (
                      <option key={comm.id} value={comm.id}>{comm.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#2b2b2b] mb-1">Property Type</label>
                  <select
                    value={propertyTypeId}
                    onChange={(e) => setPropertyTypeId(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#f15e75]"
                  >
                    <option value="">Select Type</option>
                    {propertyTypes.map((pt) => (
                      <option key={pt.id} value={pt.id}>{pt.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#2b2b2b] mb-1">Host User</label>
                  <select
                    value={hostId}
                    onChange={(e) => setHostId(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#f15e75]"
                  >
                    <option value="">Select Host</option>
                    {hosts.map((h) => (
                      <option key={h.id} value={h.id}>
                        {(h.firstName || h.lastName) ? `${h.firstName || ''} ${h.lastName || ''}`.trim() : h.email} ({h.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#2b2b2b] mb-1">Street Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#f15e75]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2b2b2b] mb-1">Zip Code</label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#f15e75]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-[#e5e7eb]">
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-4 py-2 bg-white border border-[#e5e7eb] text-[#4f5962] hover:text-[#f15e75] rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#f15e75] hover:bg-[#d94f64] text-white font-bold rounded-md text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <span>Next: Visibility &amp; Status</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: Visibility & Status */}
        {currentStep === 4 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="border-b border-[#e5e7eb] pb-2 flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[#2b2b2b]">4. Visibility &amp; Status</h3>
                <span className="text-[10px] text-[#6b7280] font-mono">Step 4 of 4</span>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-[#f8fafc] p-4 border border-[#e5e7eb] rounded-md">
                <div>
                  <label className="block font-bold text-[#2b2b2b] mb-1">Visibility Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="bg-white border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#f15e75]"
                  >
                    <option value="PUBLISHED">PUBLISHED (Visible to Public)</option>
                    <option value="PENDING_REVIEW">PENDING REVIEW (Awaiting Admin Approval)</option>
                    <option value="DRAFT">DRAFT (Hidden from Public)</option>
                    <option value="REJECTED">REJECTED (Submission Declined)</option>
                    <option value="DELETED">DELETED (Archived / Soft-Deleted)</option>
                  </select>
                </div>

                <div className="pt-2 sm:pt-0">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="w-4 h-4 text-[#f15e75] rounded focus:ring-0 cursor-pointer"
                    />
                    <span className="font-bold text-[#2b2b2b] text-xs">Feature on Homepage</span>
                  </label>
                </div>
              </div>

              {/* Summary Overview before Final Update */}
              <div className="p-4 bg-gray-50 border border-[#e5e7eb] rounded-md space-y-2 text-xs">
                <h4 className="font-extrabold text-[#2b2b2b]">Ready to Update Property</h4>
                <p className="text-gray-600 leading-relaxed">
                  Review summary: <strong>{title}</strong> (${nightlyPrice}/night, {maxGuests} Guests). Submitting will apply your changes directly to the PostgreSQL database.
                </p>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-[#e5e7eb]">
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={loading}
                className="px-4 py-2 bg-white border border-[#e5e7eb] text-[#4f5962] hover:text-[#f15e75] rounded-md font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-[#f15e75] hover:bg-[#d94f64] text-white font-bold rounded-md text-xs transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Updating Property...' : 'Save Property Changes'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
