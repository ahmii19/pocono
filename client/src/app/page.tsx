import Link from 'next/link';
import HeroSearch from '@/components/HeroSearch';
import PropertyCard from '@/components/PropertyCard';
import SafeImage from '@/components/SafeImage';
import OurPartnersSection from '@/components/OurPartnersSection';
import { getProperties, getCities, getCommunities, getPropertyTypes, getAmenities } from '@/lib/api';
import { Shield, Sparkles, MapPin, Award, CheckCircle2, Star, Mountain, Trees, Compass } from 'lucide-react';

export const revalidate = 60;

export default async function HomePage() {
  let properties: any[] = [];
  let cities: any[] = [];
  let communities: any[] = [];
  let propertyTypes: any[] = [];
  let amenities: any[] = [];

  try {
    const [propRes, cityRes, commRes, typeRes, amRes] = await Promise.allSettled([
      getProperties({ limit: 6 }),
      getCities(),
      getCommunities(),
      getPropertyTypes(),
      getAmenities()
    ]);

    if (propRes.status === 'fulfilled') properties = propRes.value.data || [];
    if (cityRes.status === 'fulfilled') cities = cityRes.value.data || [];
    if (commRes.status === 'fulfilled') communities = commRes.value.data || [];
    if (typeRes.status === 'fulfilled') propertyTypes = typeRes.value.data || [];
    if (amRes.status === 'fulfilled') amenities = amRes.value.data || [];
  } catch (e) {
    console.error('HomePage data fetch error:', e);
  }

  // Local experiences showcase data with verified media
  const showcaseExperiences = [
    {
      title: 'Axe Throwing',
      category: 'Activities',
      location: 'Swiftwater, PA',
      price: '$20.00/hr',
      image: '/images/experiences/axe-throwing.jpg',
      featured: false
    },
    {
      title: 'Helicopter Tour',
      category: 'Tours & Adventures',
      location: 'Pocono Mountains',
      price: '$500.00/person',
      image: '/images/experiences/helicopter-tour.jpg',
      featured: true
    },
    {
      title: 'Lake Harmony Boating & Kayaking',
      category: 'Water Sports',
      location: 'Lake Harmony',
      price: 'From $45.00',
      image: '/images/experiences/lake-harmony-boating.jpg',
      featured: false
    }
  ];

  const destinationImages: Record<string, string> = {
    'arrowhead-lake': '/wp-content/uploads/2026/05/aRROWHEAD-360x360.jpg',
    'big-bass-lake': '/wp-content/uploads/2026/05/BigBass-360x360.jpg',
    'briercrest-woods': '/wp-content/uploads/2026/05/BRIERCREST-WOODS-360x360.jpg',
    'camelot-forest': '/wp-content/uploads/2026/05/Camelot-Forest-360x360.jpg',
    'eagle-lake': '/wp-content/uploads/2026/05/EAGLE-LAKE-360x360.jpg',
    'emerald-lakes': '/wp-content/uploads/2026/05/EMERALD-LAKES-360x360.jpg',
    'greenwood-acres': '/wp-content/uploads/2026/05/GREENWOOD-ACRES-360x360.jpg',
    'indian-mountain-lakes': '/wp-content/uploads/2026/05/indian-360x360.jpg',
    'indian-mountain-lake': '/wp-content/uploads/2026/05/indian-360x360.jpg'
  };

  const featuredDestinations = [
    { name: 'Arrowhead Lake', slug: 'arrowhead-lake', image: '/wp-content/uploads/2026/05/aRROWHEAD-360x360.jpg' },
    { name: 'Big Bass Lake', slug: 'big-bass-lake', image: '/wp-content/uploads/2026/05/BigBass-360x360.jpg' },
    { name: 'Briercrest Woods', slug: 'briercrest-woods', image: '/wp-content/uploads/2026/05/BRIERCREST-WOODS-360x360.jpg' },
    { name: 'Camelot Forest', slug: 'camelot-forest', image: '/wp-content/uploads/2026/05/Camelot-Forest-360x360.jpg' },
    { name: 'Eagle Lake', slug: 'eagle-lake', image: '/wp-content/uploads/2026/05/EAGLE-LAKE-360x360.jpg' },
    { name: 'Emerald Lakes', slug: 'emerald-lakes', image: '/wp-content/uploads/2026/05/EMERALD-LAKES-360x360.jpg' },
    { name: 'Greenwood Acres', slug: 'greenwood-acres', image: '/wp-content/uploads/2026/05/GREENWOOD-ACRES-360x360.jpg' },
    { name: 'Indian Mountain Lake', slug: 'indian-mountain-lake', image: '/wp-content/uploads/2026/05/indian-360x360.jpg' }
  ];

  return (
    <div className="space-y-16 pb-16 bg-[#f8f9fa] text-[#2b2b2b]">
      {/* 1. Hero & Search Section */}
      <HeroSearch cities={cities} communities={communities} propertyTypes={propertyTypes} />

      {/* 2. Featured Homes Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex justify-between items-end border-b border-[#d8dce1] pb-4">
          <div>
            <h2 className="text-2xl font-bold text-[#2b2b2b]">Featured Homes</h2>
            <p className="text-xs text-[#7a7a7a] font-medium mt-1">Explore our selection of the best places around the Poconos</p>
          </div>
          <Link href="/properties" className="text-xs font-bold text-[#f15e75] hover:text-[#54c4d9] transition-colors">
            View All ({properties.length}+ Listings) →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {properties.map((property: any) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      </section>

      {/* 3. Trending Destinations */}
      <section className="bg-white border-y border-[#d8dce1] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-[#2b2b2b]">Trending Destinations</h2>
            <p className="text-xs text-[#7a7a7a] font-medium mt-1">Explore our selection of the best places around the Poconos</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredDestinations.map((d) => (
              <Link
                key={d.slug}
                href={`/community/${d.slug}`}
                className="group relative aspect-square rounded-lg overflow-hidden border border-[#d8dce1] shadow-sm transition-all hover:shadow-md block"
              >
                <img
                  src={d.image}
                  alt={d.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <div className="absolute bottom-6 left-0 right-0 text-center text-white font-bold text-base drop-shadow-md z-10">
                  {d.name}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Trending Experiences */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-1.5">
          <h2 className="text-2xl font-bold text-[#2b2b2b]">Trending Experiences</h2>
          <p className="text-xs text-[#7a7a7a] font-medium">Top-rated activities and local Pocono adventures</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {showcaseExperiences.map((exp, idx) => (
            <div key={idx} className="bg-white border border-[#d8dce1] rounded-md overflow-hidden shadow-sm space-y-4 hover:shadow-md transition-shadow group">
              <div className="relative h-48 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 overflow-hidden flex items-center justify-center">
                {exp.image ? (
                  <SafeImage
                    src={exp.image}
                    alt={exp.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="text-center p-4 space-y-1">
                    <Compass className="w-10 h-10 text-[#f15e75] mx-auto opacity-80" />
                    <span className="text-xs font-bold text-slate-300 block">{exp.category}</span>
                  </div>
                )}
                {exp.featured && (
                  <span className="absolute top-3 left-3 bg-[#54c4d9] text-white text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-sm">
                    Featured
                  </span>
                )}
                <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-md text-white text-xs font-extrabold px-3 py-1.5 rounded-md">
                  {exp.price}
                </div>
              </div>
              <div className="p-5 space-y-2 pt-0">
                <h3 className="text-lg font-bold text-[#2b2b2b] group-hover:text-[#f15e75] transition-colors">{exp.title}</h3>
                <div className="flex justify-between items-center text-xs font-semibold text-gray-500">
                  <span>{exp.category}</span>
                  <span className="text-[#f15e75]">{exp.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Hear From Our Guests */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#2b2b2b]">Hear From Our Guests</h2>
            <p className="text-xs sm:text-sm text-[#7a7a7a] font-medium">
              The biggest reward is to satisfy our clients and share their experience with us
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
            {/* Testimonial 1 */}
            <div className="space-y-4">
              <div className="relative bg-white border border-[#d8dce1] p-6 rounded-md shadow-sm text-center text-xs text-[#4f5962] leading-relaxed font-medium min-h-[110px] flex items-center justify-center">
                “Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer eu mollis eros.”
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r border-b border-[#d8dce1] rotate-45" />
              </div>
              <div className="text-center">
                <img
                  src="/wp-content/uploads/2018/10/HomeyHost21.jpg"
                  alt="Anna Andrews"
                  className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover mx-auto mt-5"
                />
                <h4 className="font-bold text-[#2b2b2b] text-sm mt-2">Anna Andrews</h4>
                <span className="italic text-xs text-[#7a7a7a] font-serif block mt-0.5">Homey Host</span>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="space-y-4">
              <div className="relative bg-white border border-[#d8dce1] p-6 rounded-md shadow-sm text-center text-xs text-[#4f5962] leading-relaxed font-medium min-h-[110px] flex items-center justify-center">
                “Lorem ipsum dolor sit amet, adipiscing elit. Proin facilisis neque. Integer eu mollis.”
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r border-b border-[#d8dce1] rotate-45" />
              </div>
              <div className="text-center">
                <img
                  src="/wp-content/uploads/2018/10/HomeyHost23-1.jpg"
                  alt="Harold Warren"
                  className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover mx-auto mt-5"
                />
                <h4 className="font-bold text-[#2b2b2b] text-sm mt-2">Harold Warren</h4>
                <span className="italic text-xs text-[#7a7a7a] font-serif block mt-0.5">Homey Host</span>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="space-y-4">
              <div className="relative bg-white border border-[#d8dce1] p-6 rounded-md shadow-sm text-center text-xs text-[#4f5962] leading-relaxed font-medium min-h-[110px] flex items-center justify-center">
                “Proin facilisis neque. Integer eu mollis montem. Lorem ipsum dolor sit.”
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r border-b border-[#d8dce1] rotate-45" />
              </div>
              <div className="text-center">
                <img
                  src="/wp-content/uploads/2018/10/HomeyHost07.jpg"
                  alt="Michelle Wright"
                  className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover mx-auto mt-5"
                />
                <h4 className="font-bold text-[#2b2b2b] text-sm mt-2">Michelle Wright</h4>
                <span className="italic text-xs text-[#7a7a7a] font-serif block mt-0.5">Homey Host</span>
              </div>
            </div>

            {/* Testimonial 4 */}
            <div className="space-y-4">
              <div className="relative bg-white border border-[#d8dce1] p-6 rounded-md shadow-sm text-center text-xs text-[#4f5962] leading-relaxed font-medium min-h-[110px] flex items-center justify-center">
                “Proin facilisis neque. Integer eu mollis. Lorem ipsum dolor sit amet, adipiscing elit.”
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r border-b border-[#d8dce1] rotate-45" />
              </div>
              <div className="text-center">
                <img
                  src="/wp-content/uploads/2018/10/HomeyHost08.jpg"
                  alt="Mike Forward"
                  className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover mx-auto mt-5"
                />
                <h4 className="font-bold text-[#2b2b2b] text-sm mt-2">Mike Forward</h4>
                <span className="italic text-xs text-[#7a7a7a] font-serif block mt-0.5">Homey Host</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Our Partners */}
      <OurPartnersSection />

      {/* 7. Why Book Direct CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#1d2327] border border-[#343d44] rounded-lg p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center shadow-xl text-white">
          <div className="space-y-4">
            <Shield className="w-10 h-10 text-[#f15e75]" />
            <h3 className="text-2xl font-bold">Why Book Direct on Pocono.Vacations?</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Save up to 15% on service fees compared to third-party platforms. Guaranteed best rates and verified host listings.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-slate-200 text-sm">
              <CheckCircle2 className="w-5 h-5 text-[#f15e75] shrink-0" />
              <span>Zero traveler service commission fees</span>
            </div>
            <div className="flex items-center gap-3 text-slate-200 text-sm">
              <CheckCircle2 className="w-5 h-5 text-[#f15e75] shrink-0" />
              <span>Direct communication with verified local hosts</span>
            </div>
            <div className="flex items-center gap-3 text-slate-200 text-sm">
              <CheckCircle2 className="w-5 h-5 text-[#f15e75] shrink-0" />
              <span>Direct Airbnb & Vrbo link options</span>
            </div>
          </div>
          <div className="text-center lg:text-right">
            <Link
              href="/properties"
              className="inline-block px-8 py-4 bg-[#f15e75] hover:bg-[#f58d9d] text-white font-extrabold text-sm rounded-md shadow-lg transition-all uppercase tracking-wider"
            >
              Browse All Pocono Properties
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
