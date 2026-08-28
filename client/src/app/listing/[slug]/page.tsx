import { getPropertyBySlug, getProperties } from '@/lib/api';
import BookingWidget from '@/components/BookingWidget';
import ContactHostWidget from '@/components/ContactHostWidget';
import PropertyCard from '@/components/PropertyCard';
import SafeImage from '@/components/SafeImage';
import PropertyDetailMap from '@/components/PropertyDetailMap';
import {
  Bed, Bath, Users, MapPin, Shield, Star, CheckCircle, ExternalLink,
  Calendar, Check, X, Info, Flame, Wifi, Car, Waves, UserCheck
} from 'lucide-react';
import Link from 'next/link';

export const revalidate = 60;

function formatWordPressContent(rawContent: string | null | undefined): string {
  if (!rawContent) return '';

  let html = rawContent;

  // 1. Convert escaped string sequences \r\n, \n, \t
  html = html
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, ' ');

  // 2. Remove all WordPress Gutenberg block comments
  html = html.replace(/<!--\s*\/?wp:[\s\S]*?-->/g, '');

  // 3. Decode HTML entities
  html = html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // 4. Clean up leading/trailing empty lines
  html = html.trim();

  // 5. If html does NOT contain standard block elements (<p>, <h3>, <ul>, etc.), convert newlines into <p> / <br/>
  const hasBlockTags = /<(p|h[1-6]|ul|ol|li|blockquote|div|hr|table|tr|td)\b/i.test(html);
  if (!hasBlockTags && html.length > 0) {
    html = html
      .split(/\n\s*\n/)
      .map(para => para.trim())
      .filter(Boolean)
      .map(para => `<p>${para.replace(/\n/g, '<br/>')}</p>`)
      .join('');
  }

  return html;
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  try {
    const res = await getPropertyBySlug(params.slug);
    const p = res.data;
    const cleanDesc = p.description ? formatWordPressContent(p.description).replace(/<[^>]*>/g, '').slice(0, 160) : 'Book luxury cabin rental in the Pocono Mountains.';
    return {
      title: `${p.title} | Pocono Vacation Rental`,
      description: cleanDesc,
      openGraph: {
        title: p.title,
        description: cleanDesc,
        images: p.images && p.images.length > 0 ? [p.images[0].imageUrl] : []
      }
    };
  } catch (e) {
    return { title: 'Pocono Vacation Rental' };
  }
}

export default async function PropertyDetailPage({ params }: { params: { slug: string } }) {
  let property: any = null;
  let similarProperties: any[] = [];

  try {
    const res = await getPropertyBySlug(params.slug);
    property = res.data;

    // Fetch similar properties
    const simRes = await getProperties({ limit: 3 });
    if (simRes.data) {
      similarProperties = simRes.data.filter((p: any) => p.slug !== params.slug).slice(0, 2);
    }
  } catch (e) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="text-3xl font-bold text-[#2b2b2b]">Property Not Found</h1>
        <Link href="/properties" className="text-[#f15e75] font-semibold">← Return to All Listings</Link>
      </div>
    );
  }

  const images = property.images && property.images.length > 0 ? property.images : [{ imageUrl: '/placeholder.jpg' }];
  const mainImage = images[0]?.imageUrl || '/placeholder.jpg';

  // Serenity in Pocono Specific Data Fallbacks for 1:1 Live Parity when fields are optional
  const isSerenity = params.slug === 'serenity-in-pocono';
  const listingId = property.id ? `4884-${property.id.slice(0, 4)}` : '4884';

  const defaultPropertyAmenities = [
    'Air Conditioning', 'BBQ Grill', 'Coffeemaker', 'Deck/Patio', 'Dishwasher',
    'Fire Extinguisher', 'Fire Pit', 'First Aid Kit', 'Free Parking', 'Heating',
    'Smoke Detector', 'Towels Included'
  ];

  const defaultCommunityAmenities = [
    '24/7 Community Security Patrol', 'Basketball Court', 'Boat / Kayak Rentals',
    'Community Lake Beach', 'Community Lodge', 'Community Pool - Outdoor', 'Fishing',
    'Gated Community', 'Hiking Trail', 'Lake', 'Pickleball Court', 'Playground',
    'Tennis Court', 'Volleyball Court'
  ];

  const accommodationRooms = [
    { title: 'Lower bedroom', bed: '1 Queen', guests: '2 Guests' },
    { title: 'Upper bedrooms', bed: '1 Queen', guests: '2 Guests' },
    { title: 'Kids room', bed: '1 Bunk bed', guests: '3 Guests' },
    { title: 'Loft', bed: '1 Futon - full', guests: '2 Guests' }
  ];

  return (
    <div className="bg-[#f8f9fa] text-[#4f5962] min-h-screen pb-16">
      {/* 1. Property Header */}
      <div className="bg-white border-b border-[#d8dce1] py-8">
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-[#f15e75] uppercase tracking-wider block">
                {property.community ? property.community.name : 'Arrowhead Lake'}
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#2b2b2b] tracking-tight">{property.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[#7a7a7a] pt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#f15e75]" />
                  {property.address || 'Pocono Lake, Pennsylvania 18347'}
                </span>
                <span>•</span>
                <span>ID: {listingId}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="#gallery"
                className="px-4 py-2 bg-white border border-[#d8dce1] text-[#4f5962] hover:text-[#f15e75] text-xs font-bold rounded-md shadow-sm transition-colors"
              >
                View More Photos ({images.length}+)
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* 2. Photo Gallery Grid */}
        <div id="gallery" className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-md overflow-hidden border border-[#d8dce1] shadow-sm max-h-[520px]">
          <div className="md:col-span-2 relative h-[360px] md:h-[520px] bg-gray-100">
            <SafeImage
              src={mainImage}
              alt={property.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="hidden md:grid grid-rows-2 gap-3 h-full">
            {images.slice(1, 3).map((img: any, idx: number) => (
              <div key={idx} className="relative h-full bg-gray-100 overflow-hidden">
                <SafeImage
                  src={img.imageUrl || mainImage}
                  alt={`${property.title} photo ${idx + 2}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* 3. Main Property Layout + Booking Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main Property Content (Left Column) */}
          <div className="lg:col-span-2 space-y-10">
            {/* Host & Specs Bar */}
            <div className="bg-white border border-[#d8dce1] p-6 rounded-md shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#f15e75]/10 border border-[#f15e75]/30 flex items-center justify-center font-bold text-[#f15e75] text-lg shrink-0">
                  {property.host?.firstName?.[0] || 'M'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2b2b2b]">
                    Entire Place Hosted by {property.host?.firstName || 'Mike'}
                  </h3>
                  <p className="text-xs text-[#7a7a7a] font-semibold">
                    {property.maxGuests || 8} Guests • {property.bedrooms || 3} Bedrooms • {property.bathrooms || 2} Bathrooms
                  </p>
                </div>
              </div>
            </div>

            {/* Child Theme External Booking Links (Airbnb & Vrbo) */}
            {(property.airbnbUrl || property.vrboUrl || isSerenity) && (
              <div className="p-6 bg-white border border-[#d8dce1] rounded-md space-y-3 shadow-sm">
                <span className="text-xs font-bold text-[#f15e75] uppercase tracking-wider block">Direct Booking Partner Options</span>
                <h3 className="text-base font-bold text-[#2b2b2b]">Prefer Third-Party Booking Platform?</h3>
                <p className="text-[#4f5962] text-xs leading-relaxed">
                  Book directly with us to save up to 15% on traveler service fees, or view this verified listing on partner platforms:
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <a
                    href={property.airbnbUrl || 'https://www.airbnb.com'}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ backgroundColor: '#8FC089' }}
                    className="px-5 py-2.5 text-white font-bold text-xs rounded-md flex items-center gap-2 transition-opacity hover:opacity-90 shadow-sm"
                  >
                    <span>View on Airbnb</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={property.vrboUrl || 'https://www.vrbo.com'}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ backgroundColor: '#8FC089' }}
                    className="px-5 py-2.5 text-white font-bold text-xs rounded-md flex items-center gap-2 transition-opacity hover:opacity-90 shadow-sm"
                  >
                    <span>View on Vrbo</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* About this property */}
            <div className="bg-white border border-[#d8dce1] p-6 rounded-md shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-[#2b2b2b]">About this property</h2>
              <div
                className="text-xs sm:text-sm text-[#4f5962] leading-relaxed font-medium space-y-3 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-[#2b2b2b] [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-[#2b2b2b] [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-[#2b2b2b] [&_strong]:font-bold [&_strong]:text-[#2b2b2b] [&_hr]:my-4 [&_hr]:border-[#d8dce1]"
                dangerouslySetInnerHTML={{
                  __html: formatWordPressContent(
                    property.description ||
                      `Serenity in Pocono is a charming 3-bedroom mountain cabin retreat located in the pristine Arrowhead Lake gated community. Featuring high vaulted ceilings, modern stone fireplace, private outdoor deck with BBQ grill, and access to community lakes, pools, and beaches.`
                  )
                }}
              />
            </div>

            {/* Details Section */}
            <div className="bg-white border border-[#d8dce1] p-6 rounded-md shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-[#2b2b2b]">Details</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-medium text-[#4f5962]">
                <div className="p-3 bg-gray-50 rounded-md border border-gray-100">
                  <span className="text-[#7a7a7a] block text-[11px]">Listing ID:</span>
                  <span className="font-bold text-[#2b2b2b] text-sm">{listingId}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-md border border-gray-100">
                  <span className="text-[#7a7a7a] block text-[11px]">Guests:</span>
                  <span className="font-bold text-[#2b2b2b] text-sm">{property.maxGuests || 8}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-md border border-gray-100">
                  <span className="text-[#7a7a7a] block text-[11px]">Bedrooms:</span>
                  <span className="font-bold text-[#2b2b2b] text-sm">{property.bedrooms || 3}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-md border border-gray-100">
                  <span className="text-[#7a7a7a] block text-[11px]">Beds:</span>
                  <span className="font-bold text-[#2b2b2b] text-sm">5</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-md border border-gray-100">
                  <span className="text-[#7a7a7a] block text-[11px]">Bathrooms:</span>
                  <span className="font-bold text-[#2b2b2b] text-sm">{property.bathrooms || 2}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-md border border-gray-100">
                  <span className="text-[#7a7a7a] block text-[11px]">Check-in After:</span>
                  <span className="font-bold text-[#2b2b2b] text-sm">4:00 PM</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-md border border-gray-100">
                  <span className="text-[#7a7a7a] block text-[11px]">Check-out Before:</span>
                  <span className="font-bold text-[#2b2b2b] text-sm">11:00 AM</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-md border border-gray-100">
                  <span className="text-[#7a7a7a] block text-[11px]">Type:</span>
                  <span className="font-bold text-[#2b2b2b] text-sm">House / Cabin</span>
                </div>
              </div>
            </div>

            {/* Prices Section */}
            <div className="bg-white border border-[#d8dce1] p-6 rounded-md shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-[#2b2b2b]">Prices</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
                <div className="p-4 border border-[#d8dce1] rounded-md bg-white">
                  <span className="text-[#7a7a7a] block">Nightly Rate:</span>
                  <span className="text-lg font-bold text-[#f15e75]">From ${property.nightlyPrice || 132.00}</span>
                </div>
                <div className="p-4 border border-[#d8dce1] rounded-md bg-white">
                  <span className="text-[#7a7a7a] block">Weekends (Fri &amp; Sat):</span>
                  <span className="text-lg font-bold text-[#2b2b2b]">From $200.00</span>
                </div>
                <div className="p-4 border border-[#d8dce1] rounded-md bg-white">
                  <span className="text-[#7a7a7a] block">Cleaning Fee:</span>
                  <span className="text-lg font-bold text-[#2b2b2b]">$175 Per Stay</span>
                </div>
              </div>
            </div>

            {/* Accommodation Section */}
            <div className="bg-white border border-[#d8dce1] p-6 rounded-md shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-[#2b2b2b]">Accommodation</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {accommodationRooms.map((room, idx) => (
                  <div key={idx} className="p-4 border border-[#d8dce1] rounded-md bg-gray-50 space-y-1">
                    <h4 className="font-bold text-[#2b2b2b]">{room.title}</h4>
                    <p className="text-[#4f5962]">{room.bed}</p>
                    <span className="text-[#7a7a7a] block font-semibold">{room.guests}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Features (Property & Community Amenities) */}
            <div className="bg-white border border-[#d8dce1] p-6 rounded-md shadow-sm space-y-6">
              <div className="space-y-3">
                <h2 className="text-xl font-bold text-[#2b2b2b]">Property Amenities</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-semibold text-[#4f5962]">
                  {defaultPropertyAmenities.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-100 rounded-md">
                      <Check className="w-3.5 h-3.5 text-[#f15e75] shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-[#d8dce1]">
                <h2 className="text-xl font-bold text-[#2b2b2b]">Community Amenities</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-semibold text-[#4f5962]">
                  {defaultCommunityAmenities.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-100 rounded-md">
                      <Check className="w-3.5 h-3.5 text-[#54c4d9] shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Terms & Rules */}
            <div className="bg-white border border-[#d8dce1] p-6 rounded-md shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-[#2b2b2b]">Terms &amp; Rules</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold">
                <div className="p-3 border border-[#d8dce1] rounded-md flex justify-between items-center">
                  <span>Smoking allowed:</span>
                  <span className="text-red-500 font-bold">No</span>
                </div>
                <div className="p-3 border border-[#d8dce1] rounded-md flex justify-between items-center">
                  <span>Pets allowed:</span>
                  <span className="text-emerald-600 font-bold">Yes</span>
                </div>
                <div className="p-3 border border-[#d8dce1] rounded-md flex justify-between items-center">
                  <span>Party allowed:</span>
                  <span className="text-red-500 font-bold">No</span>
                </div>
                <div className="p-3 border border-[#d8dce1] rounded-md flex justify-between items-center">
                  <span>Children allowed:</span>
                  <span className="text-emerald-600 font-bold">Yes</span>
                </div>
              </div>
            </div>

            {/* Cancellation Policy */}
            <div className="bg-white border border-[#d8dce1] p-6 rounded-md shadow-sm space-y-2">
              <h2 className="text-xl font-bold text-[#2b2b2b]">Cancellation Policy</h2>
              <p className="text-xs text-[#4f5962] leading-relaxed font-medium">
                {property.cancellationPolicy || 'Strict: Full refund up to 30 days before check-in. 50% refund up to 14 days before check-in. Non-refundable within 14 days of arrival.'}
              </p>
            </div>

            {/* Property Location Map */}
            <div className="bg-white border border-[#d8dce1] p-6 rounded-md shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-[#2b2b2b] flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#f15e75]" />
                Location
              </h2>
              {property.address && (
                <p className="text-xs text-[#7a7a7a] font-medium">{property.address}</p>
              )}
              <PropertyDetailMap
                latitude={property.latitude}
                longitude={property.longitude}
                propertyTitle={property.title}
                address={property.address}
              />
              <p className="text-[11px] text-[#9ca3af] font-medium">
                Map shows approximate property location.
              </p>
            </div>

            {/* Availability Calendar */}
            <div className="bg-white border border-[#d8dce1] p-6 rounded-md shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-[#2b2b2b]">Availability</h2>
                <div className="flex gap-4 text-xs font-semibold text-[#7a7a7a]">
                  <span>Minimum stay: <strong>2 Nights</strong></span>
                  <span>Maximum stay: <strong>28 Nights</strong></span>
                </div>
              </div>
              <div className="p-6 bg-gray-50 border border-gray-200 rounded-md text-center text-xs text-[#4f5962] font-semibold space-y-3">
                <p>Select check-in &amp; check-out dates in the booking widget to check live availability.</p>
                <div className="flex justify-center items-center gap-6 pt-2 text-[11px]">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Available</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Pending</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Booked</span>
                </div>
              </div>
            </div>

            {/* Host Section */}
            <div className="bg-white border border-[#d8dce1] p-6 rounded-md shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#f15e75]/10 border border-[#f15e75]/30 flex items-center justify-center font-bold text-[#f15e75] text-xl">
                  {property.host?.firstName?.[0] || 'M'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-[#2b2b2b]">Hosted by {property.host?.firstName || 'Mike'}</h3>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded">Verified</span>
                  </div>
                  <p className="text-xs text-[#7a7a7a] font-medium">Pocono Mountain Vacation Rental Host</p>
                </div>
              </div>
              <Link href="/contact-us" className="px-4 py-2 bg-white border border-[#d8dce1] text-[#4f5962] hover:text-[#f15e75] text-xs font-bold rounded-md transition-colors">
                View Profile
              </Link>
            </div>

            {/* Reviews Section */}
            <div className="bg-white border border-[#d8dce1] p-6 rounded-md shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h2 className="text-xl font-bold text-[#2b2b2b]">
                  {property.reviews?.length || 0} Review{property.reviews?.length === 1 ? '' : 's'}
                </h2>
                <span className="text-xs text-[#7a7a7a] font-semibold">Verified Reviews</span>
              </div>
              {property.reviews && property.reviews.length > 0 ? (
                <div className="space-y-4">
                  {property.reviews.map((rev: any) => (
                    <div key={rev.id} className="p-4 border border-gray-100 rounded-md bg-gray-50 space-y-1 text-xs">
                      <div className="flex justify-between items-center font-bold text-[#2b2b2b]">
                        <span>{rev.guest?.firstName || 'Verified Guest'}</span>
                        <div className="flex text-amber-500">
                          {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-current" />
                          ))}
                        </div>
                      </div>
                      <p className="text-[#4f5962] font-medium">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#7a7a7a] font-medium">No reviews yet for this listing. Be the first guest to leave a review!</p>
              )}
            </div>

            {/* Similar Listings */}
            {similarProperties.length > 0 && (
              <div className="space-y-4 pt-4">
                <h2 className="text-xl font-bold text-[#2b2b2b]">Similar listings</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {similarProperties.map((simProp: any) => (
                    <PropertyCard key={simProp.id} property={simProp} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Sticky Booking & Contact Sidebar */}
          <div className="space-y-6 lg:sticky lg:top-28 h-fit">
            <BookingWidget property={property} />
            <ContactHostWidget property={property} />
          </div>
        </div>
      </div>
    </div>
  );
}
