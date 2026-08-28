'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import HostNav from '@/components/HostNav';
import {
  getHostPropertyById, updateHostProperty, getCities, getCommunities, getPropertyTypes, getAmenities, getFacilities
} from '@/lib/api';
import { ArrowLeft, Save, Image as ImageIcon, AlertCircle, CheckCircle2, ShieldAlert, ArrowRight, Check } from 'lucide-react';

export default function HostEditPropertyPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;

  const [currentStep, setCurrentStep] = useState(1);
  const [cities, setCities] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<any[]>([]);
  const [amenities, setAmenities] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [cityId, setCityId] = useState('');
  const [communityId, setCommunityId] = useState('');
  const [propertyTypeId, setPropertyTypeId] = useState('');
  const [nightlyPrice, setNightlyPrice] = useState('');
  const [weekendPrice, setWeekendPrice] = useState('');
  const [cleaningFee, setCleaningFee] = useState('');
  const [maxGuests, setMaxGuests] = useState('4');
  const [bedrooms, setBedrooms] = useState('2');
  const [beds, setBeds] = useState('2');
  const [bathrooms, setBathrooms] = useState('1.5');
  const [status, setStatus] = useState('');

  const [selectedAmenityIds, setSelectedAmenityIds] = useState<number[]>([]);
  const [selectedFacilityIds, setSelectedFacilityIds] = useState<number[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const steps = [
    { id: 1, title: 'Basic Details', description: 'Title & Description' },
    { id: 2, title: 'Pricing & Capacity', description: 'Rates & Room Counts' },
    { id: 3, title: 'Location & Type', description: 'Taxonomies & Address' },
    { id: 4, title: 'Amenities & Review', description: 'Features & Saving' }
  ];

  useEffect(() => {
    fetchPropertyAndTaxonomies();
  }, [propertyId]);

  const fetchPropertyAndTaxonomies = async () => {
    setLoading(true);
    const token = localStorage.getItem('pocono_token');
    if (!token) return;

    try {
      const [pRes, cRes, comRes, ptRes, amRes, facRes] = await Promise.all([
        getHostPropertyById(propertyId, token),
        getCities(), getCommunities(), getPropertyTypes(),
        getAmenities(), getFacilities()
      ]);

      const p = pRes.data;
      if (p) {
        setTitle(p.title || '');
        setDescription(p.description || '');
        setAddress(p.address || '');
        setCityId(p.cityId ? String(p.cityId) : '');
        setCommunityId(p.communityId ? String(p.communityId) : '');
        setPropertyTypeId(p.propertyTypeId ? String(p.propertyTypeId) : '');
        setNightlyPrice(p.nightlyPrice ? String(p.nightlyPrice) : '');
        setWeekendPrice(p.weekendPrice ? String(p.weekendPrice) : '');
        setCleaningFee(p.cleaningFee ? String(p.cleaningFee) : '0');
        setMaxGuests(p.maxGuests ? String(p.maxGuests) : '1');
        setBedrooms(p.bedrooms ? String(p.bedrooms) : '1');
        setBeds(p.beds ? String(p.beds) : '1');
        setBathrooms(p.bathrooms ? String(p.bathrooms) : '1');
        setStatus(p.status || 'DRAFT');

        if (Array.isArray(p.amenities)) {
          setSelectedAmenityIds(p.amenities.map((a: any) => a.amenityId || a.id).filter(Boolean));
        }
        if (Array.isArray(p.facilities)) {
          setSelectedFacilityIds(p.facilities.map((f: any) => f.facilityId || f.id).filter(Boolean));
        }
      }

      setCities(cRes.data || []);
      setCommunities(comRes.data || []);
      setPropertyTypes(ptRes.data || []);
      setAmenities(amRes.data || []);
      setFacilities(facRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load property');
    } finally {
      setLoading(false);
    }
  };

  const handleAmenityToggle = (id: number) => {
    setSelectedAmenityIds(prev =>
      prev.includes(id) ? prev.filter(aId => aId !== id) : [...prev, id]
    );
  };

  const handleFacilityToggle = (id: number) => {
    setSelectedFacilityIds(prev =>
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (currentStep === 1) {
      if (!title.trim()) {
        setError('Property Title is required.');
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
    if (!title.trim()) {
      setError('Property Title is required.');
      setCurrentStep(1);
      return;
    }

    const priceNum = Number(nightlyPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Nightly Price ($) must be greater than 0.');
      setCurrentStep(2);
      return;
    }

    setSaving(true);

    const token = localStorage.getItem('pocono_token');
    if (!token) {
      setError('Authentication required.');
      setSaving(false);
      return;
    }

    try {
      const payload = {
        title,
        description,
        address,
        cityId: cityId || null,
        communityId: communityId || null,
        propertyTypeId: propertyTypeId || null,
        nightlyPrice,
        weekendPrice: weekendPrice || null,
        cleaningFee: cleaningFee || 0,
        maxGuests,
        bedrooms,
        beds,
        bathrooms,
        amenityIds: selectedAmenityIds,
        facilityIds: selectedFacilityIds
      };

      const res = await updateHostProperty(propertyId, payload, token);
      setSuccess('Property changes saved successfully!');
      if (res.data?.status) setStatus(res.data.status);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error updating property');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-[#2b2b2b]">
        <HostNav />
        <div className="p-12 text-center text-xs font-bold text-[#4f5962]">Loading property details...</div>
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
          <p className="text-xs text-[#4f5962]">You do not have permission to edit this property.</p>
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-[#2b2b2b]">Edit Property</h1>
                <span
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                    status === 'PUBLISHED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {status}
                </span>
              </div>
              <p className="text-xs text-[#4f5962] font-medium">Updating Property ID: {propertyId}</p>
            </div>
          </div>

          <Link
            href={`/host/properties/${propertyId}/media`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#d8dce1] text-[#4f5962] hover:text-[#f15e75] hover:bg-[#fff1f3] text-xs font-bold rounded-md transition-all"
          >
            <ImageIcon className="w-4 h-4 text-[#f15e75]" />
            <span>Manage Photo Gallery</span>
          </Link>
        </div>

        {/* Progress Stepper Bar */}
        <div className="bg-white border border-[#d8dce1] rounded-md p-4 shadow-sm">
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
                      : 'bg-[#f8fafc] border-[#d8dce1] text-[#9ca3af]'
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

        {/* Wizard Container */}
        <div className="bg-white border border-[#d8dce1] p-6 rounded-md shadow-2xs text-xs font-medium text-[#4f5962]">
          {/* STEP 1: Basic Details */}
          {currentStep === 1 && (
            <form onSubmit={handleNextStep} className="space-y-6">
              <div className="space-y-4">
                <div className="border-b border-[#d8dce1] pb-2 flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-[#2b2b2b]">1. Basic Details</h3>
                  <span className="text-[10px] text-[#6b7280] font-mono">Step 1 of 4</span>
                </div>

                <div>
                  <label className="block font-bold text-[#2b2b2b] mb-1">Property Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#d8dce1] text-[#2b2b2b] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#f15e75]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2b2b2b] mb-1">Description</label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#d8dce1] text-[#2b2b2b] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#f15e75]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#d8dce1]">
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
                <div className="border-b border-[#d8dce1] pb-2 flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-[#2b2b2b]">2. Pricing &amp; Capacity</h3>
                  <span className="text-[10px] text-[#6b7280] font-mono">Step 2 of 4</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-[#2b2b2b] mb-1">Nightly Price ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={nightlyPrice}
                      onChange={(e) => setNightlyPrice(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-[#d8dce1] text-[#2b2b2b] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#f15e75]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#2b2b2b] mb-1">Weekend Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={weekendPrice}
                      onChange={(e) => setWeekendPrice(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-[#d8dce1] text-[#2b2b2b] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#f15e75]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#2b2b2b] mb-1">Cleaning Fee ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={cleaningFee}
                      onChange={(e) => setCleaningFee(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-[#d8dce1] text-[#2b2b2b] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#f15e75]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block font-bold text-[#2b2b2b] mb-1">Max Guests</label>
                    <input
                      type="number"
                      min="1"
                      value={maxGuests}
                      onChange={(e) => setMaxGuests(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-[#d8dce1] text-[#2b2b2b] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#f15e75]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#2b2b2b] mb-1">Bedrooms</label>
                    <input
                      type="number"
                      min="1"
                      value={bedrooms}
                      onChange={(e) => setBedrooms(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-[#d8dce1] text-[#2b2b2b] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#f15e75]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#2b2b2b] mb-1">Beds</label>
                    <input
                      type="number"
                      min="1"
                      value={beds}
                      onChange={(e) => setBeds(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-[#d8dce1] text-[#2b2b2b] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#f15e75]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#2b2b2b] mb-1">Bathrooms</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={bathrooms}
                      onChange={(e) => setBathrooms(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-[#d8dce1] text-[#2b2b2b] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#f15e75]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-[#d8dce1]">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-4 py-2 bg-white border border-[#d8dce1] text-[#4f5962] hover:text-[#f15e75] rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#f15e75] hover:bg-[#d94f64] text-white font-bold rounded-md text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <span>Next: Location &amp; Type</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Location & Type */}
          {currentStep === 3 && (
            <form onSubmit={handleNextStep} className="space-y-6">
              <div className="space-y-4">
                <div className="border-b border-[#d8dce1] pb-2 flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-[#2b2b2b]">3. Location &amp; Type</h3>
                  <span className="text-[10px] text-[#6b7280] font-mono">Step 3 of 4</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-[#2b2b2b] mb-1">City</label>
                    <select
                      value={cityId}
                      onChange={(e) => setCityId(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-[#d8dce1] text-[#2b2b2b] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#f15e75]"
                    >
                      <option value="">Select City...</option>
                      {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[#2b2b2b] mb-1">Community</label>
                    <select
                      value={communityId}
                      onChange={(e) => setCommunityId(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-[#d8dce1] text-[#2b2b2b] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#f15e75]"
                    >
                      <option value="">Select Community...</option>
                      {communities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[#2b2b2b] mb-1">Property Type</label>
                    <select
                      value={propertyTypeId}
                      onChange={(e) => setPropertyTypeId(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-[#d8dce1] text-[#2b2b2b] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#f15e75]"
                    >
                      <option value="">Select Type...</option>
                      {propertyTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#2b2b2b] mb-1">Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#d8dce1] text-[#2b2b2b] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#f15e75]"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-[#d8dce1]">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-4 py-2 bg-white border border-[#d8dce1] text-[#4f5962] hover:text-[#f15e75] rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#f15e75] hover:bg-[#d94f64] text-white font-bold rounded-md text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <span>Next: Amenities &amp; Review</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: Amenities & Review */}
          {currentStep === 4 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="border-b border-[#d8dce1] pb-2 flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-[#2b2b2b]">4. Amenities &amp; Review</h3>
                  <span className="text-[10px] text-[#6b7280] font-mono">Step 4 of 4</span>
                </div>

                {/* Amenities Grid */}
                {amenities.length > 0 && (
                  <div className="space-y-2">
                    <label className="block font-bold text-[#2b2b2b]">Property Amenities</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {amenities.map((a) => (
                        <label key={a.id} className="flex items-center gap-2 p-2 bg-[#f8fafc] border border-gray-200 rounded cursor-pointer hover:bg-gray-100">
                          <input
                            type="checkbox"
                            checked={selectedAmenityIds.includes(a.id)}
                            onChange={() => handleAmenityToggle(a.id)}
                            className="accent-[#f15e75]"
                          />
                          <span className="text-[11px] font-semibold text-[#4f5962]">{a.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Facilities Grid */}
                {facilities.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <label className="block font-bold text-[#2b2b2b]">Facilities &amp; Shared Spaces</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {facilities.map((f) => (
                        <label key={f.id} className="flex items-center gap-2 p-2 bg-[#f8fafc] border border-gray-200 rounded cursor-pointer hover:bg-gray-100">
                          <input
                            type="checkbox"
                            checked={selectedFacilityIds.includes(f.id)}
                            onChange={() => handleFacilityToggle(f.id)}
                            className="accent-[#f15e75]"
                          />
                          <span className="text-[11px] font-semibold text-[#4f5962]">{f.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Review Overview Card */}
                <div className="p-4 bg-gray-50 border border-[#d8dce1] rounded-md space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-[#2b2b2b]">Ready to Update Property</h4>
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        status === 'PUBLISHED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      Status: {status}
                    </span>
                  </div>
                  <p className="text-gray-600 leading-relaxed">
                    Review summary: <strong>{title}</strong> (${nightlyPrice}/night, {maxGuests} Guests). Submitting will save your changes in PostgreSQL.
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-[#d8dce1]">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={saving}
                  className="px-4 py-2 bg-white border border-[#d8dce1] text-[#4f5962] hover:text-[#f15e75] rounded-md font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#f15e75] hover:bg-[#d94f64] text-white font-bold rounded-md text-xs transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving Changes...' : 'Save Property Changes'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
