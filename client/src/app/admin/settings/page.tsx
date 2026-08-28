'use client';

import { useState, useEffect } from 'react';
import { getAdminSiteSettings, updateAdminSiteSettings } from '@/lib/api';
import {
  Settings, Save, CheckCircle2, AlertCircle, RefreshCw,
  Globe, Image as ImageIcon, Sparkles, Phone, Share2, Search, FileText, CreditCard
} from 'lucide-react';

export default function AdminSiteSettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'branding' | 'hero' | 'payment' | 'contact' | 'social' | 'seo' | 'footer'>('general');
  const [settings, setSettings] = useState<any>({
    general: {},
    branding: {},
    hero: {},
    payment: {},
    contact: {},
    social: {},
    seo: {},
    footer: {}
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorAlert, setErrorAlert] = useState('');
  const [successAlert, setSuccessAlert] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const token = localStorage.getItem('pocono_admin_token');
    if (!token) return;
    setLoading(true);
    try {
      const res = await getAdminSiteSettings(token);
      if (res.data) setSettings(res.data);
    } catch (e: any) {
      setErrorAlert(e.message || 'Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (section: string, field: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
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
      const res = await updateAdminSiteSettings(settings, token);
      if (res.data) setSettings(res.data);
      setSuccessAlert('Site settings saved & synchronized successfully!');
      setTimeout(() => setSuccessAlert(''), 3000);
    } catch (err: any) {
      setErrorAlert(err.message || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-[#4f5962] text-sm font-medium">Loading Site Configuration...</div>;
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'branding', label: 'Branding', icon: ImageIcon },
    { id: 'hero', label: 'Hero Section', icon: Sparkles },
    { id: 'payment', label: 'Payment Settings', icon: CreditCard },
    { id: 'contact', label: 'Contact & CTA', icon: Phone },
    { id: 'social', label: 'Social Links', icon: Share2 },
    { id: 'seo', label: 'SEO Metadata', icon: Search },
    { id: 'footer', label: 'Footer', icon: FileText }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#e5e7eb] pb-6">
        <div>
          <span className="text-[#f15e75] text-xs font-bold uppercase tracking-wider block mb-1">
            Site Configuration CMS
          </span>
          <h1 className="text-3xl font-extrabold text-[#2b2b2b]">Global Site Settings</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchSettings}
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

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#e5e7eb] pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-[#f15e75] text-white shadow-sm'
                  : 'bg-white border border-[#e5e7eb] text-[#4f5962] hover:bg-[#fff1f3] hover:text-[#f15e75]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Form Card */}
      <form onSubmit={handleSave} className="bg-white border border-[#e5e7eb] rounded-md shadow-sm p-6 space-y-6 text-xs text-[#4f5962]">
        {/* 1. GENERAL TAB */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            <h3 className="font-extrabold text-[#2b2b2b] text-sm border-b border-[#e5e7eb] pb-2">General Settings</h3>
            <div>
              <label className="block font-bold text-[#2b2b2b] mb-1">Website Name</label>
              <input
                type="text"
                value={settings.general?.siteName || ''}
                onChange={(e) => handleFieldChange('general', 'siteName', e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2b2b2b] mb-1">Site Description</label>
              <textarea
                rows={3}
                value={settings.general?.siteDescription || ''}
                onChange={(e) => handleFieldChange('general', 'siteDescription', e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-[#2b2b2b] mb-1">Contact Email</label>
                <input
                  type="email"
                  value={settings.general?.contactEmail || ''}
                  onChange={(e) => handleFieldChange('general', 'contactEmail', e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#2b2b2b] mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={settings.general?.contactPhone || ''}
                  onChange={(e) => handleFieldChange('general', 'contactPhone', e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
                />
              </div>
            </div>
            <div>
              <label className="block font-bold text-[#2b2b2b] mb-1">Physical Address</label>
              <input
                type="text"
                value={settings.general?.address || ''}
                onChange={(e) => handleFieldChange('general', 'address', e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2b2b2b] mb-1">Platform Commission Rate (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={settings.general?.platformCommissionPercent ?? '10.00'}
                onChange={(e) => handleFieldChange('general', 'platformCommissionPercent', e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
                placeholder="10.00"
              />
              <p className="text-[10px] text-gray-500 mt-1">Platform service fee percentage calculated on host earnings for new confirmed bookings.</p>
            </div>
          </div>
        )}

        {/* 2. BRANDING TAB */}
        {activeTab === 'branding' && (
          <div className="space-y-4">
            <h3 className="font-extrabold text-[#2b2b2b] text-sm border-b border-[#e5e7eb] pb-2">Branding Assets</h3>
            <div>
              <label className="block font-bold text-[#2b2b2b] mb-1">Desktop Logo URL</label>
              <input
                type="text"
                value={settings.branding?.desktopLogoUrl || ''}
                onChange={(e) => handleFieldChange('branding', 'desktopLogoUrl', e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2b2b2b] mb-1">Mobile Logo URL</label>
              <input
                type="text"
                value={settings.branding?.mobileLogoUrl || ''}
                onChange={(e) => handleFieldChange('branding', 'mobileLogoUrl', e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-[#2b2b2b] mb-1">Primary Color (Hex)</label>
                <input
                  type="text"
                  value={settings.branding?.primaryColor || '#f15e75'}
                  onChange={(e) => handleFieldChange('branding', 'primaryColor', e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 font-mono focus:outline-none focus:border-[#f15e75]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#2b2b2b] mb-1">Secondary Color (Hex)</label>
                <input
                  type="text"
                  value={settings.branding?.secondaryColor || '#2b2b2b'}
                  onChange={(e) => handleFieldChange('branding', 'secondaryColor', e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 font-mono focus:outline-none focus:border-[#f15e75]"
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. HERO TAB */}
        {activeTab === 'hero' && (
          <div className="space-y-4">
            <h3 className="font-extrabold text-[#2b2b2b] text-sm border-b border-[#e5e7eb] pb-2">Hero Section Configuration</h3>
            <div>
              <label className="block font-bold text-[#2b2b2b] mb-1">Hero Heading</label>
              <input
                type="text"
                value={settings.hero?.heroHeading || ''}
                onChange={(e) => handleFieldChange('hero', 'heroHeading', e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2b2b2b] mb-1">Hero Subtitle</label>
              <textarea
                rows={2}
                value={settings.hero?.heroSubtitle || ''}
                onChange={(e) => handleFieldChange('hero', 'heroSubtitle', e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2b2b2b] mb-1">Hero Background Image URL</label>
              <input
                type="text"
                value={settings.hero?.heroBgImage || ''}
                onChange={(e) => handleFieldChange('hero', 'heroBgImage', e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="searchEnabled"
                checked={settings.hero?.searchEnabled !== false}
                onChange={(e) => handleFieldChange('hero', 'searchEnabled', e.target.checked)}
                className="w-4 h-4 text-[#f15e75] rounded border-[#e5e7eb]"
              />
              <label htmlFor="searchEnabled" className="font-bold text-[#2b2b2b]">Enable Homepage Hero Search Widget</label>
            </div>
          </div>
        )}

        {/* PAYMENT SETTINGS TAB */}
        {activeTab === 'payment' && (
          <div className="space-y-6">
            <h3 className="font-extrabold text-[#2b2b2b] text-sm border-b border-[#e5e7eb] pb-2">Payment Gateway &amp; Method Settings</h3>

            {/* Payment Method Toggles */}
            <div className="space-y-3">
              <h4 className="font-bold text-[#2b2b2b] uppercase tracking-wider text-[11px]">Payment Methods Availability</h4>
              
              <div className="flex items-center justify-between p-3.5 bg-[#f8fafc] border border-[#e5e7eb] rounded-md">
                <div>
                  <span className="block font-bold text-[#2b2b2b]">Enable Stripe Payments</span>
                  <span className="text-[11px] text-gray-500">Allow guests to pay directly with credit/debit card via Stripe.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.payment?.stripeEnabled !== false}
                    onChange={(e) => handleFieldChange('payment', 'stripeEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f15e75]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-[#f8fafc] border border-[#e5e7eb] rounded-md">
                <div>
                  <span className="block font-bold text-[#2b2b2b]">Enable PayPal Payments</span>
                  <span className="text-[11px] text-gray-500">Allow guests to pay securely with their PayPal account or cards.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.payment?.paypalEnabled !== false}
                    onChange={(e) => handleFieldChange('payment', 'paypalEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f15e75]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-[#f8fafc] border border-[#e5e7eb] rounded-md">
                <div>
                  <span className="block font-bold text-[#2b2b2b]">Enable Pay Later (Offline Proof)</span>
                  <span className="text-[11px] text-gray-500">Allow guests to reserve and upload payment proof for manual admin review.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.payment?.payLaterEnabled !== false}
                    onChange={(e) => handleFieldChange('payment', 'payLaterEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f15e75]"></div>
                </label>
              </div>
            </div>

            {/* Default Payment Gateway */}
            <div className="pt-2">
              <label className="block font-bold text-[#2b2b2b] mb-1">Default Payment Gateway Selection</label>
              <select
                value={settings.payment?.defaultPaymentGateway || 'stripe'}
                onChange={(e) => handleFieldChange('payment', 'defaultPaymentGateway', e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75] font-semibold"
              >
                <option value="stripe" disabled={settings.payment?.stripeEnabled === false}>Stripe Sandbox {settings.payment?.stripeEnabled === false ? '(Disabled)' : ''}</option>
                <option value="paypal" disabled={settings.payment?.paypalEnabled === false}>PayPal Sandbox {settings.payment?.paypalEnabled === false ? '(Disabled)' : ''}</option>
                <option value="pay_later" disabled={settings.payment?.payLaterEnabled === false}>Pay Later {settings.payment?.payLaterEnabled === false ? '(Disabled)' : ''}</option>
              </select>
              <p className="text-[10px] text-gray-500 mt-1">Pre-selected payment gateway on the guest booking widget.</p>
            </div>

            {/* Pay Later Deadline & Instructions */}
            <div className="pt-2 space-y-4 border-t border-[#e5e7eb]">
              <h4 className="font-bold text-[#2b2b2b] uppercase tracking-wider text-[11px]">Pay Later Configuration</h4>
              
              <div>
                <label className="block font-bold text-[#2b2b2b] mb-1">Payment Proof Deadline (Hours)</label>
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={settings.payment?.payLaterDeadlineHours ?? 48}
                  onChange={(e) => handleFieldChange('payment', 'payLaterDeadlineHours', parseInt(e.target.value, 10) || 48)}
                  className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
                  placeholder="48"
                />
                <p className="text-[10px] text-gray-500 mt-1">Number of hours allowed for guests to upload payment proof after reserving (Min 1, Max 720).</p>
              </div>

              <div>
                <label className="block font-bold text-[#2b2b2b] mb-1">Pay Later Guest Instructions</label>
                <textarea
                  rows={3}
                  value={settings.payment?.payLaterInstructions || ''}
                  onChange={(e) => handleFieldChange('payment', 'payLaterInstructions', e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75] leading-relaxed"
                  placeholder="Instructions displayed to guests selecting Pay Later..."
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-[#f8fafc] border border-[#e5e7eb] rounded-md">
                <div>
                  <span className="block font-bold text-[#2b2b2b]">Automatically Expire Unpaid Pay Later Reservations</span>
                  <span className="text-[11px] text-gray-500">Automatically cancel reservations when payment proof is not submitted before deadline.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.payment?.autoExpirePayLaterReservations !== false}
                    onChange={(e) => handleFieldChange('payment', 'autoExpirePayLaterReservations', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f15e75]"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 4. CONTACT TAB */}
        {activeTab === 'contact' && (
          <div className="space-y-4">
            <h3 className="font-extrabold text-[#2b2b2b] text-sm border-b border-[#e5e7eb] pb-2">Contact &amp; CTA Details</h3>
            <div>
              <label className="block font-bold text-[#2b2b2b] mb-1">WhatsApp Phone Number</label>
              <input
                type="text"
                value={settings.contact?.whatsAppNumber || ''}
                onChange={(e) => handleFieldChange('contact', 'whatsAppNumber', e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2b2b2b] mb-1">Direct Call Phone Number</label>
              <input
                type="text"
                value={settings.contact?.phoneNumber || ''}
                onChange={(e) => handleFieldChange('contact', 'phoneNumber', e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2b2b2b] mb-1">CTA Callout Text</label>
              <input
                type="text"
                value={settings.contact?.ctaText || ''}
                onChange={(e) => handleFieldChange('contact', 'ctaText', e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
              />
            </div>
          </div>
        )}

        {/* 5. SOCIAL TAB */}
        {activeTab === 'social' && (
          <div className="space-y-4">
            <h3 className="font-extrabold text-[#2b2b2b] text-sm border-b border-[#e5e7eb] pb-2">Social Media Links</h3>
            <div>
              <label className="block font-bold text-[#2b2b2b] mb-1">Facebook URL</label>
              <input
                type="url"
                value={settings.social?.facebookUrl || ''}
                onChange={(e) => handleFieldChange('social', 'facebookUrl', e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2b2b2b] mb-1">Instagram URL</label>
              <input
                type="url"
                value={settings.social?.instagramUrl || ''}
                onChange={(e) => handleFieldChange('social', 'instagramUrl', e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2b2b2b] mb-1">YouTube URL</label>
              <input
                type="url"
                value={settings.social?.youtubeUrl || ''}
                onChange={(e) => handleFieldChange('social', 'youtubeUrl', e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2b2b2b] mb-1">X / Twitter URL</label>
              <input
                type="url"
                value={settings.social?.twitterUrl || ''}
                onChange={(e) => handleFieldChange('social', 'twitterUrl', e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
              />
            </div>
          </div>
        )}

        {/* 6. SEO TAB */}
        {activeTab === 'seo' && (
          <div className="space-y-4">
            <h3 className="font-extrabold text-[#2b2b2b] text-sm border-b border-[#e5e7eb] pb-2">Default SEO Metadata</h3>
            <div>
              <label className="block font-bold text-[#2b2b2b] mb-1">Default Meta Title</label>
              <input
                type="text"
                value={settings.seo?.metaTitle || ''}
                onChange={(e) => handleFieldChange('seo', 'metaTitle', e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2b2b2b] mb-1">Default Meta Description</label>
              <textarea
                rows={3}
                value={settings.seo?.metaDescription || ''}
                onChange={(e) => handleFieldChange('seo', 'metaDescription', e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
              />
            </div>
          </div>
        )}

        {/* 7. FOOTER TAB */}
        {activeTab === 'footer' && (
          <div className="space-y-4">
            <h3 className="font-extrabold text-[#2b2b2b] text-sm border-b border-[#e5e7eb] pb-2">Footer Content</h3>
            <div>
              <label className="block font-bold text-[#2b2b2b] mb-1">Footer About Text</label>
              <textarea
                rows={3}
                value={settings.footer?.footerText || ''}
                onChange={(e) => handleFieldChange('footer', 'footerText', e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#2b2b2b] mb-1">Copyright Statement</label>
              <input
                type="text"
                value={settings.footer?.copyrightText || ''}
                onChange={(e) => handleFieldChange('footer', 'copyrightText', e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e5e7eb] text-[#2b2b2b] rounded-md px-3 py-2 focus:outline-none focus:border-[#f15e75]"
              />
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="pt-4 border-t border-[#e5e7eb] flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[#f15e75] hover:bg-[#d94f64] text-white font-bold rounded-md text-xs transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Settings...' : 'Save Site Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
