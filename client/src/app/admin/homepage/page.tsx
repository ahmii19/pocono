'use client';

import AdminLoader from '@/components/admin/AdminLoader';

import { useState, useEffect } from 'react';
import {
  getAdminHomepageConfig, updateAdminHomepageConfig,
  getProperties, getCities, getAdminReviews
} from '@/lib/api';
import {
  LayoutTemplate, Save, RefreshCw, CheckCircle2, AlertCircle,
  Eye, EyeOff, Sparkles, Building2, MapPin, Compass, Star,
  Handshake, ShieldCheck, Megaphone, ChevronDown, ChevronUp
} from 'lucide-react';

export default function AdminHomepageCMSPage() {
  const [config, setConfig] = useState<any>({
    hero: {},
    featuredHomes: {},
    trendingDestinations: {},
    trendingExperiences: {},
    hearFromOurGuests: {},
    ourPartners: {},
    whyBookDirect: {},
    cta: {}
  });

  const [properties, setProperties] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    hero: true,
    featuredHomes: true,
    trendingDestinations: false,
    trendingExperiences: false,
    hearFromOurGuests: false,
    ourPartners: false,
    whyBookDirect: false,
    cta: false
  });

  const [errorAlert, setErrorAlert] = useState('');
  const [successAlert, setSuccessAlert] = useState('');

  useEffect(() => {
    fetchConfigAndData();
  }, []);

  const fetchConfigAndData = async () => {
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;
    setLoading(true);
    try {
      const [cfgRes, propsRes, citiesRes, reviewsRes] = await Promise.all([
        getAdminHomepageConfig(token),
        getProperties({ status: 'PUBLISHED' }),
        getCities(),
        getAdminReviews(token)
      ]);

      if (cfgRes.data) setConfig(cfgRes.data);
      if (propsRes.data) setProperties(propsRes.data);
      if (citiesRes.data) setCities(citiesRes.data);
      if (reviewsRes.data) setReviews(reviewsRes.data);
    } catch (e: any) {
      setErrorAlert(e.message || 'Error loading homepage configuration');
    } finally {
      setLoading(false);
    }
  };

  const toggleSectionOpen = (sectionKey: string) => {
    setOpenSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const handleSectionToggle = (sectionKey: string, enabled: boolean) => {
    setConfig((prev: any) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        enabled
      }
    }));
  };

  const handleFieldChange = (sectionKey: string, field: string, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [field]: value
      }
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAlert('');
    setSuccessAlert('');
    setSaving(true);

    const token = localStorage.getItem('pocono_admin_token');
    if (!token) {
      setErrorAlert('Admin authentication required.');
      setSaving(false);
      return;
    }

    try {
      const res = await updateAdminHomepageConfig(config, token);
      if (res.data) setConfig(res.data);
      setSuccessAlert('Homepage content configuration saved successfully!');
      setTimeout(() => setSuccessAlert(''), 3000);
    } catch (err: any) {
      setErrorAlert(err.message || 'Error saving homepage config');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <AdminLoader variant="page" message="Loading Homepage CMS Editor..." />;
  }

  const sectionsList = [
    { key: 'hero', title: '1. Hero Section & Search Bar', icon: Sparkles },
    { key: 'featuredHomes', title: '2. Featured Homes Section', icon: Building2 },
    { key: 'trendingDestinations', title: '3. Trending Destinations Section', icon: MapPin },
    { key: 'trendingExperiences', title: '4. Trending Experiences Section', icon: Compass },
    { key: 'hearFromOurGuests', title: '5. Hear From Our Guests (Reviews)', icon: Star },
    { key: 'ourPartners', title: '6. Our Partners Section', icon: Handshake },
    { key: 'whyBookDirect', title: '7. Why Book Direct Section', icon: ShieldCheck },
    { key: 'cta', title: '8. Homepage Call To Action (CTA)', icon: Megaphone }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#e5e7eb] pb-6">
        <div>
          <span className="text-[#f15e75] text-xs font-bold uppercase tracking-wider block mb-1">
            Content Management System
          </span>
          <h1 className="text-3xl font-extrabold text-[#2b2b2b]">Homepage CMS Editor</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchConfigAndData}
            className="p-2.5 bg-white border border-[#e5e7eb] text-[#4f5962] hover:text-[#f15e75] hover:bg-[#fff1f3] rounded-md text-xs font-bold transition-all shadow-sm flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload</span>
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

      <form onSubmit={handleSave} className="space-y-4">
        {/* Sections Accordion */}
        {sectionsList.map((sec) => {
          const Icon = sec.icon;
          const isOpen = openSections[sec.key];
          const isEnabled = config[sec.key]?.enabled !== false;

          return (
            <div key={sec.key} className="bg-white border border-[#e5e7eb] rounded-md shadow-sm overflow-hidden">
              {/* Section Header */}
              <div className="p-4 flex items-center justify-between bg-[#f8fafc] border-b border-[#e5e7eb]">
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-[#f15e75]" />
                  <h3 className="font-extrabold text-[#2b2b2b] text-sm">{sec.title}</h3>
                </div>

                <div className="flex items-center gap-4">
                  {/* Enable/Disable Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => handleSectionToggle(sec.key, e.target.checked)}
                      className="w-4 h-4 text-[#f15e75] rounded border-[#e5e7eb]"
                    />
                    <span className={isEnabled ? 'text-emerald-700' : 'text-gray-400'}>
                      {isEnabled ? 'Section Enabled' : 'Section Hidden'}
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => toggleSectionOpen(sec.key)}
                    className="p-1 text-[#4f5962] hover:text-[#f15e75]"
                  >
                    {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Section Body */}
              {isOpen && (
                <div className="p-6 space-y-4 text-xs text-[#4f5962]">
                  {/* HERO */}
                  {sec.key === 'hero' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block font-bold text-[#2b2b2b] mb-1">Hero Heading</label>
                        <input
                          type="text"
                          value={config.hero?.heading || ''}
                          onChange={(e) => handleFieldChange('hero', 'heading', e.target.value)}
                          className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#2b2b2b] mb-1">Hero Subtitle</label>
                        <textarea
                          rows={2}
                          value={config.hero?.subtitle || ''}
                          onChange={(e) => handleFieldChange('hero', 'subtitle', e.target.value)}
                          className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#2b2b2b] mb-1">Background Image URL</label>
                        <input
                          type="text"
                          value={config.hero?.bgImage || ''}
                          onChange={(e) => handleFieldChange('hero', 'bgImage', e.target.value)}
                          className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
                        />
                      </div>
                    </div>
                  )}

                  {/* FEATURED HOMES */}
                  {sec.key === 'featuredHomes' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block font-bold text-[#2b2b2b] mb-1">Section Title</label>
                        <input
                          type="text"
                          value={config.featuredHomes?.title || ''}
                          onChange={(e) => handleFieldChange('featuredHomes', 'title', e.target.value)}
                          className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#2b2b2b] mb-1">Section Subtitle</label>
                        <input
                          type="text"
                          value={config.featuredHomes?.subtitle || ''}
                          onChange={(e) => handleFieldChange('featuredHomes', 'subtitle', e.target.value)}
                          className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
                        />
                      </div>
                      <div>
                        <span className="block font-bold text-[#2b2b2b] mb-1">Available Properties ({properties.length} Total)</span>
                        <p className="text-[11px] text-[#6b7280]">Select which properties appear in Featured Homes on the homepage:</p>
                        <div className="mt-2 max-h-48 overflow-y-auto border border-[#e5e7eb] rounded-md p-3 space-y-2 bg-[#f8fafc]">
                          {properties.map(p => (
                            <label key={p.id} className="flex items-center gap-2 hover:bg-white p-1 rounded">
                              <input
                                type="checkbox"
                                checked={(config.featuredHomes?.selectedPropertyIds || []).includes(p.id)}
                                onChange={(e) => {
                                  const current = config.featuredHomes?.selectedPropertyIds || [];
                                  const updated = e.target.checked
                                    ? [...current, p.id]
                                    : current.filter((id: string) => id !== p.id);
                                  handleFieldChange('featuredHomes', 'selectedPropertyIds', updated);
                                }}
                                className="w-4 h-4 text-[#f15e75]"
                              />
                              <span className="font-bold text-[#2b2b2b] text-xs">{p.title}</span>
                              <span className="text-[10px] text-[#6b7280]">(${p.nightlyPrice}/night)</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TRENDING DESTINATIONS */}
                  {sec.key === 'trendingDestinations' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block font-bold text-[#2b2b2b] mb-1">Section Title</label>
                        <input
                          type="text"
                          value={config.trendingDestinations?.title || ''}
                          onChange={(e) => handleFieldChange('trendingDestinations', 'title', e.target.value)}
                          className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#2b2b2b] mb-1">Section Subtitle</label>
                        <input
                          type="text"
                          value={config.trendingDestinations?.subtitle || ''}
                          onChange={(e) => handleFieldChange('trendingDestinations', 'subtitle', e.target.value)}
                          className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
                        />
                      </div>
                    </div>
                  )}

                  {/* TRENDING EXPERIENCES */}
                  {sec.key === 'trendingExperiences' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block font-bold text-[#2b2b2b] mb-1">Section Title</label>
                        <input
                          type="text"
                          value={config.trendingExperiences?.title || ''}
                          onChange={(e) => handleFieldChange('trendingExperiences', 'title', e.target.value)}
                          className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#2b2b2b] mb-1">Section Subtitle</label>
                        <input
                          type="text"
                          value={config.trendingExperiences?.subtitle || ''}
                          onChange={(e) => handleFieldChange('trendingExperiences', 'subtitle', e.target.value)}
                          className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
                        />
                      </div>
                    </div>
                  )}

                  {/* HEAR FROM OUR GUESTS */}
                  {sec.key === 'hearFromOurGuests' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block font-bold text-[#2b2b2b] mb-1">Section Title</label>
                        <input
                          type="text"
                          value={config.hearFromOurGuests?.title || ''}
                          onChange={(e) => handleFieldChange('hearFromOurGuests', 'title', e.target.value)}
                          className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#2b2b2b] mb-1">Section Subtitle</label>
                        <input
                          type="text"
                          value={config.hearFromOurGuests?.subtitle || ''}
                          onChange={(e) => handleFieldChange('hearFromOurGuests', 'subtitle', e.target.value)}
                          className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
                        />
                      </div>
                    </div>
                  )}

                  {/* OUR PARTNERS */}
                  {sec.key === 'ourPartners' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block font-bold text-[#2b2b2b] mb-1">Section Title</label>
                        <input
                          type="text"
                          value={config.ourPartners?.title || ''}
                          onChange={(e) => handleFieldChange('ourPartners', 'title', e.target.value)}
                          className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
                        />
                      </div>
                    </div>
                  )}

                  {/* WHY BOOK DIRECT */}
                  {sec.key === 'whyBookDirect' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block font-bold text-[#2b2b2b] mb-1">Section Title</label>
                        <input
                          type="text"
                          value={config.whyBookDirect?.title || ''}
                          onChange={(e) => handleFieldChange('whyBookDirect', 'title', e.target.value)}
                          className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#2b2b2b] mb-1">Section Subtitle</label>
                        <input
                          type="text"
                          value={config.whyBookDirect?.subtitle || ''}
                          onChange={(e) => handleFieldChange('whyBookDirect', 'subtitle', e.target.value)}
                          className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
                        />
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  {sec.key === 'cta' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block font-bold text-[#2b2b2b] mb-1">Heading</label>
                        <input
                          type="text"
                          value={config.cta?.heading || ''}
                          onChange={(e) => handleFieldChange('cta', 'heading', e.target.value)}
                          className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#2b2b2b] mb-1">Description</label>
                        <textarea
                          rows={2}
                          value={config.cta?.description || ''}
                          onChange={(e) => handleFieldChange('cta', 'description', e.target.value)}
                          className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-[#2b2b2b] mb-1">Button Text</label>
                          <input
                            type="text"
                            value={config.cta?.buttonText || ''}
                            onChange={(e) => handleFieldChange('cta', 'buttonText', e.target.value)}
                            className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-[#2b2b2b] mb-1">Button Target URL</label>
                          <input
                            type="text"
                            value={config.cta?.buttonUrl || ''}
                            onChange={(e) => handleFieldChange('cta', 'buttonUrl', e.target.value)}
                            className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Global Save Button */}
        <div className="pt-4 border-t border-[#e5e7eb] flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[#f15e75] hover:bg-[#d94f64] text-white font-bold rounded-md text-xs transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Config...' : 'Save Homepage Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
