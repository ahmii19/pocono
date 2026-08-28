import PropertyCard from '@/components/PropertyCard';
import PropertyMap from '@/components/PropertyMap';
import { getProperties, getCities, getCommunities, getPropertyTypes } from '@/lib/api';
import Link from 'next/link';
import { MapPin, Calendar, Users, X, Filter } from 'lucide-react';

export const revalidate = 0; // Dynamic server page

export default async function PropertiesPage({ searchParams }: { searchParams: any }) {
  let properties: any[] = [];
  let total = 0;
  let page = 1;
  let totalPages = 1;
  let cities: any[] = [];
  let communities: any[] = [];
  let propertyTypes: any[] = [];

  const { destination, city, community, propertyType, guests, checkIn, checkOut, search } = searchParams;

  try {
    const [propRes, cityRes, commRes, typeRes] = await Promise.all([
      getProperties({ ...searchParams, limit: 12 }),
      getCities(),
      getCommunities(),
      getPropertyTypes()
    ]);
    properties = propRes.data || [];
    total = propRes.total || 0;
    page = propRes.page || 1;
    totalPages = propRes.totalPages || 1;
    cities = cityRes.data || [];
    communities = commRes.data || [];
    propertyTypes = typeRes.data || [];
  } catch (e) {
    console.error('Error fetching properties:', e);
  }

  const activeFiltersCount = [destination, city, community, propertyType, guests, checkIn, checkOut, search].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 bg-[#f8f9fa] text-[#2b2b2b]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-gray-200 pb-6">
        <div>
          <span className="text-[#f15e75] text-xs font-extrabold uppercase tracking-wider block mb-1">Explore Vacation Rentals</span>
          <h1 className="text-3xl font-extrabold text-[#2b2b2b]">
            All Pocono Mountain Properties ({total})
          </h1>
        </div>

        {/* Clear Filters Quick Action */}
        {activeFiltersCount > 0 && (
          <Link
            href="/properties"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#fff1f3] text-[#f15e75] border border-[#f15e75]/30 rounded-md text-xs font-bold hover:bg-rose-100 transition-all"
          >
            <X className="w-4 h-4" />
            <span>Clear Search Filters ({activeFiltersCount})</span>
          </Link>
        )}
      </div>

      {/* Active Search Filter Badges Summary */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-white p-3.5 border border-gray-200 rounded-md text-xs">
          <span className="font-bold text-gray-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[#f15e75]" /> Active Filters:
          </span>
          {destination && (
            <span className="px-2.5 py-1 bg-rose-50 text-[#f15e75] border border-[#f15e75]/20 rounded-md font-semibold flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Destination: {destination}
            </span>
          )}
          {checkIn && (
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-semibold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Arrive: {checkIn}
            </span>
          )}
          {checkOut && (
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-semibold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Depart: {checkOut}
            </span>
          )}
          {guests && (
            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md font-semibold flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Guests: {guests}+
            </span>
          )}
          {search && (
            <span className="px-2.5 py-1 bg-gray-100 text-gray-700 border border-gray-200 rounded-md font-semibold">
              Keyword: "{search}"
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <aside className="bg-white border border-gray-200 p-6 rounded-2xl space-y-6 h-fit shadow-sm">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <h3 className="text-lg font-bold text-[#2b2b2b]">Filter Properties</h3>
            {activeFiltersCount > 0 && (
              <Link href="/properties" className="text-xs text-[#f15e75] hover:underline font-bold">
                Reset
              </Link>
            )}
          </div>
          
          <form method="GET" action="/properties" className="space-y-4">
            {/* Search Input */}
            <div>
              <label className="block text-[10px] text-gray-500 font-extrabold uppercase mb-1">Keywords</label>
              <input
                type="text"
                name="search"
                defaultValue={searchParams.search || ''}
                placeholder="Cabin, hot tub, lake..."
                className="w-full bg-gray-50 border border-gray-200 text-[#2b2b2b] rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#f15e75] focus:bg-white"
              />
            </div>

            {/* Destination */}
            <div>
              <label className="block text-[10px] text-gray-500 font-extrabold uppercase mb-1">Destination</label>
              <input
                type="text"
                name="destination"
                defaultValue={searchParams.destination || ''}
                placeholder="Arrowhead Lake, Big Bass Lake..."
                className="w-full bg-gray-50 border border-gray-200 text-[#2b2b2b] rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#f15e75] focus:bg-white"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-[10px] text-gray-500 font-extrabold uppercase mb-1">City / Region</label>
              <select
                name="city"
                defaultValue={searchParams.city || ''}
                className="w-full bg-gray-50 border border-gray-200 text-[#2b2b2b] rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#f15e75] focus:bg-white"
              >
                <option value="">All Cities</option>
                {cities.map((c: any) => (
                  <option key={c.id} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Community */}
            <div>
              <label className="block text-[10px] text-gray-500 font-extrabold uppercase mb-1">Community / Resort</label>
              <select
                name="community"
                defaultValue={searchParams.community || ''}
                className="w-full bg-gray-50 border border-gray-200 text-[#2b2b2b] rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#f15e75] focus:bg-white"
              >
                <option value="">All Communities</option>
                {communities.map((comm: any) => (
                  <option key={comm.id} value={comm.slug}>{comm.name}</option>
                ))}
              </select>
            </div>

            {/* Property Type */}
            <div>
              <label className="block text-[10px] text-gray-500 font-extrabold uppercase mb-1">Property Type</label>
              <select
                name="propertyType"
                defaultValue={searchParams.propertyType || ''}
                className="w-full bg-gray-50 border border-gray-200 text-[#2b2b2b] rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#f15e75] focus:bg-white"
              >
                <option value="">All Types</option>
                {propertyTypes.map((pt: any) => (
                  <option key={pt.id} value={pt.slug}>{pt.name}</option>
                ))}
              </select>
            </div>

            {/* Guests */}
            <div>
              <label className="block text-[10px] text-gray-500 font-extrabold uppercase mb-1">Min Guests</label>
              <select
                name="guests"
                defaultValue={searchParams.guests || ''}
                className="w-full bg-gray-50 border border-gray-200 text-[#2b2b2b] rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#f15e75] focus:bg-white"
              >
                <option value="">Any Guests</option>
                {[1, 2, 4, 6, 8, 10, 12, 15].map(g => (
                  <option key={g} value={g}>{g}+ Guests</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#f15e75] hover:bg-[#d94f64] text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-md shadow-[#f15e75]/20 transition-all"
            >
              Apply Filters
            </button>
            <Link href="/properties" className="block text-center text-xs text-gray-500 hover:text-[#f15e75] pt-2 font-semibold">
              Reset Filters
            </Link>
          </form>
        </aside>

        {/* Main Content Area: Map + Property Cards */}
        <main className="lg:col-span-3 space-y-8">
          {/* Interactive Property Map Section */}
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-600">
                Interactive Map Location View ({properties.length} Active Markers)
              </h3>
            </div>
            <PropertyMap properties={properties} />
          </div>

          {/* Property Cards Grid */}
          {properties.length === 0 ? (
            <div className="bg-white border border-gray-200 p-12 rounded-2xl text-center space-y-4 shadow-sm">
              <h3 className="text-xl font-bold text-[#2b2b2b]">No properties found</h3>
              <p className="text-gray-500 text-sm">Try adjusting your search criteria or clearing filters.</p>
              <Link
                href="/properties"
                className="inline-block px-5 py-2.5 bg-[#f15e75] text-white rounded-md text-xs font-bold hover:bg-[#d94f64] transition-all"
              >
                Clear All Filters &amp; View All Rentals
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((p: any) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-6">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <Link
                  key={p}
                  href={`/properties?${new URLSearchParams({ ...searchParams, page: String(p) }).toString()}`}
                  className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                    p === page
                      ? 'bg-[#f15e75] text-white border-[#f15e75] shadow-md shadow-[#f15e75]/20'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-[#f15e75]'
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
