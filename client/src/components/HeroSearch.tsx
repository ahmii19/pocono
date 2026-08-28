'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Users, MapPin, Search, ChevronDown, Plus, Minus, X, AlertCircle } from 'lucide-react';

import { useSiteSettings } from '@/context/SiteSettingsContext';
import { resolveSiteAssetUrl } from '@/lib/assetResolver';

interface HeroSearchProps {
  cities: any[];
  communities?: any[];
  propertyTypes?: any[];
}

export default function HeroSearch({ cities = [], communities = [] }: HeroSearchProps) {
  const router = useRouter();
  const { settings } = useSiteSettings();

  const heroHeading = settings?.hero?.heroHeading || 'Book & Experience Amazing Places';
  const heroSubtitle = settings?.hero?.heroSubtitle || 'Pocono Mountains Vacation Rentals & Resort Properties';
  const heroBgImage = resolveSiteAssetUrl(settings?.hero?.heroBgImage, 'heroBgImage');
  const searchEnabled = settings?.hero?.searchEnabled !== false;

  // Search State
  const [selectedDestination, setSelectedDestination] = useState<{ name: string; slug: string } | null>(null);
  const [destinationQuery, setDestinationQuery] = useState('');
  const [destPopoverOpen, setDestPopoverOpen] = useState(false);

  // Dates State
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [dateError, setDateError] = useState('');

  // Guests State
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [guestPopoverOpen, setGuestPopoverOpen] = useState(false);

  const totalGuests = adults + children;
  const todayStr = new Date().toISOString().split('T')[0];

  const destRef = useRef<HTMLDivElement>(null);
  const guestRef = useRef<HTMLDivElement>(null);

  // Close popovers when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (destRef.current && !destRef.current.contains(e.target as Node)) {
        setDestPopoverOpen(false);
      }
      if (guestRef.current && !guestRef.current.contains(e.target as Node)) {
        setGuestPopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Build combined destination options list from database
  const allDestinations: { name: string; slug: string; type: string }[] = [
    { name: 'All Pocono Mountains', slug: '', type: 'Region' },
    ...cities.map((c: any) => ({ name: c.name, slug: c.slug, type: 'City' })),
    ...communities.map((comm: any) => ({ name: comm.name, slug: comm.slug, type: 'Resort Community' }))
  ];

  const filteredDestinations = allDestinations.filter((d) =>
    d.name.toLowerCase().includes(destinationQuery.toLowerCase())
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setDateError('');

    // Date Validation
    if (checkIn && checkOut && checkOut <= checkIn) {
      setDateError('Check-out date must be after check-in date');
      return;
    }

    const params = new URLSearchParams();
    if (selectedDestination?.slug) {
      params.append('destination', selectedDestination.slug);
    }
    if (checkIn) params.append('checkIn', checkIn);
    if (checkOut) params.append('checkOut', checkOut);
    if (totalGuests > 1) params.append('guests', String(totalGuests));

    router.push(`/properties${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <section
      className="relative w-full h-[560px] lg:h-[600px] bg-cover bg-center flex items-center justify-center overflow-hidden"
      style={{ backgroundImage: `url('${heroBgImage}')` }}
    >
      {/* Dark Transparent Overlay matching live website (~35% opacity) */}
      <div className="absolute inset-0 bg-[#14191e]/40 pointer-events-none" />

      <div className="relative z-10 max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-7 text-center w-full">
        {/* Centered Heading & Subtitle */}
        <div className="max-w-4xl mx-auto space-y-2">
          <h1 className="text-3xl sm:text-5xl lg:text-[46px] font-bold text-white tracking-tight drop-shadow-md">
            {heroHeading}
          </h1>
          <p className="text-base sm:text-2xl text-white/90 font-normal drop-shadow-sm">
            {heroSubtitle}
          </p>
        </div>

        {/* Search Box Form */}
        {searchEnabled && (
          <div className="max-w-[1320px] mx-auto bg-white p-2.5 sm:p-3 rounded-md shadow-2xl text-left text-[#4f5962] relative">
          {/* Validation Error Banner */}
          {dateError && (
            <div className="mb-2.5 p-2.5 bg-[#fff1f3] border border-[#f15e75]/30 text-[#f15e75] rounded-md text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{dateError}</span>
            </div>
          )}

          <form onSubmit={handleSearch} className="flex flex-col lg:flex-row items-stretch gap-2.5">
            {/* 1. Where to stay? */}
            <div ref={destRef} className="relative lg:flex-[1.8]">
              <button
                type="button"
                onClick={() => setDestPopoverOpen(!destPopoverOpen)}
                className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-md px-3.5 h-[52px] text-left hover:border-gray-300 transition-colors focus:outline-none"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className={`text-[15px] font-medium truncate ${selectedDestination ? 'text-[#2b2b2b] font-semibold' : 'text-[#4f5962]'}`}>
                    {selectedDestination ? selectedDestination.name : 'Where to stay?'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
              </button>

              {/* Destination Dropdown Popover */}
              {destPopoverOpen && (
                <div className="absolute top-[58px] left-0 right-0 z-50 bg-white border border-gray-200 rounded-md shadow-xl p-3 space-y-2 max-h-72 overflow-y-auto">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search destinations..."
                      value={destinationQuery}
                      onChange={(e) => setDestinationQuery(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 text-[#2b2b2b] rounded-md pl-9 pr-3 py-1.5 text-xs font-medium focus:outline-none focus:border-[#f15e75]"
                    />
                  </div>

                  <div className="divide-y divide-gray-100">
                    {filteredDestinations.length === 0 ? (
                      <div className="p-3 text-xs text-gray-400 text-center">No matching destinations found</div>
                    ) : (
                      filteredDestinations.map((dest, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedDestination(dest.slug ? { name: dest.name, slug: dest.slug } : null);
                            setDestPopoverOpen(false);
                          }}
                          className="w-full text-left p-2 hover:bg-[#fff1f3] rounded-md transition-colors flex justify-between items-center text-xs group"
                        >
                          <span className="font-semibold text-[#2b2b2b] group-hover:text-[#f15e75]">
                            {dest.name}
                          </span>
                          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                            {dest.type}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Arrive Date */}
            <div className="relative lg:flex-[1.1] flex items-center bg-white border border-gray-200 rounded-md px-3.5 h-[52px]">
              <Calendar className="w-4 h-4 text-gray-400 mr-2.5 shrink-0 pointer-events-none" />
              <input
                type="date"
                min={todayStr}
                value={checkIn}
                onChange={(e) => {
                  setCheckIn(e.target.value);
                  if (checkOut && e.target.value >= checkOut) {
                    setCheckOut('');
                  }
                }}
                placeholder="Arrive"
                className="w-full bg-transparent text-[#4f5962] text-[14px] font-medium focus:outline-none cursor-pointer"
              />
            </div>

            {/* 3. Depart Date */}
            <div className="relative lg:flex-[1.1] flex items-center bg-white border border-gray-200 rounded-md px-3.5 h-[52px]">
              <Calendar className="w-4 h-4 text-gray-400 mr-2.5 shrink-0 pointer-events-none" />
              <input
                type="date"
                min={checkIn || todayStr}
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                placeholder="Depart"
                className="w-full bg-transparent text-[#4f5962] text-[14px] font-medium focus:outline-none cursor-pointer"
              />
            </div>

            {/* 4. Guests Selector */}
            <div ref={guestRef} className="relative lg:flex-[1.1]">
              <button
                type="button"
                onClick={() => setGuestPopoverOpen(!guestPopoverOpen)}
                className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-md px-3.5 h-[52px] text-left hover:border-gray-300 transition-colors focus:outline-none"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-[14px] font-medium text-[#4f5962]">
                    {totalGuests} {totalGuests === 1 ? 'Guest' : 'Guests'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
              </button>

              {/* Guest Selector Popover */}
              {guestPopoverOpen && (
                <div className="absolute top-[58px] right-0 z-50 bg-white border border-gray-200 rounded-md shadow-xl p-4 space-y-4 w-64 text-xs">
                  {/* Adults */}
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold text-[#2b2b2b]">Adults</div>
                      <div className="text-[10px] text-gray-400">Ages 13+</div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setAdults(Math.max(1, adults - 1))}
                        className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-gray-600 hover:border-[#f15e75] hover:text-[#f15e75] disabled:opacity-30"
                        disabled={adults <= 1}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-sm text-[#2b2b2b] w-4 text-center">{adults}</span>
                      <button
                        type="button"
                        onClick={() => setAdults(adults + 1)}
                        className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-gray-600 hover:border-[#f15e75] hover:text-[#f15e75]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Children */}
                  <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    <div>
                      <div className="font-bold text-[#2b2b2b]">Children</div>
                      <div className="text-[10px] text-gray-400">Ages 0 - 12</div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setChildren(Math.max(0, children - 1))}
                        className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-gray-600 hover:border-[#f15e75] hover:text-[#f15e75] disabled:opacity-30"
                        disabled={children <= 0}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-sm text-[#2b2b2b] w-4 text-center">{children}</span>
                      <button
                        type="button"
                        onClick={() => setChildren(children + 1)}
                        className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-gray-600 hover:border-[#f15e75] hover:text-[#f15e75]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setGuestPopoverOpen(false)}
                      className="px-3 py-1 bg-[#f15e75] text-white rounded text-[11px] font-bold hover:bg-[#d94f64]"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 5. Submit Button */}
            <button
              type="submit"
              className="lg:flex-[0.8] h-[52px] bg-[#f15e75] hover:bg-[#d94f64] text-white font-bold rounded-md transition-colors text-[16px] flex items-center justify-center gap-2 px-6 shrink-0 shadow-sm"
            >
              <span>Search</span>
            </button>
          </form>
        </div>
        )}
      </div>
    </section>
  );
}
