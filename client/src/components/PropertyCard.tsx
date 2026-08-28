'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SafeImage from './SafeImage';
import { Bed, Bath, Users, MapPin, SlidersHorizontal, Check } from 'lucide-react';

export default function PropertyCard({ property }: { property: any }) {
  const [isCompared, setIsCompared] = useState(false);

  useEffect(() => {
    const checkCompare = () => {
      const stored = localStorage.getItem('pocono_compare');
      if (stored) {
        try {
          const ids: string[] = JSON.parse(stored);
          setIsCompared(ids.includes(property.id));
        } catch (e) {}
      }
    };

    checkCompare();
    window.addEventListener('pocono_compare_updated', checkCompare);
    return () => window.removeEventListener('pocono_compare_updated', checkCompare);
  }, [property.id]);

  const toggleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const stored = localStorage.getItem('pocono_compare');
    let ids: string[] = stored ? JSON.parse(stored) : [];

    if (ids.includes(property.id)) {
      ids = ids.filter(id => id !== property.id);
      setIsCompared(false);
    } else {
      if (ids.length >= 3) {
        alert('You can compare a maximum of 3 properties at a time.');
        return;
      }
      ids.push(property.id);
      setIsCompared(true);
    }

    localStorage.setItem('pocono_compare', JSON.stringify(ids));
    window.dispatchEvent(new Event('pocono_compare_updated'));
  };

  const primaryImage = property.images && property.images.length > 0 
    ? property.images[0].imageUrl 
    : '/placeholder.jpg';

  return (
    <div className="bg-white border border-[#d8dce1] rounded-md overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col justify-between">
      {/* Image Container */}
      <div className="relative h-56 w-full overflow-hidden bg-gray-100">
        <Link href={`/listing/${property.slug}`}>
          <SafeImage
            src={primaryImage}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </Link>

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-center pointer-events-none">
          {property.propertyType ? (
            <span className="bg-white/90 backdrop-blur-md text-[#2b2b2b] font-extrabold text-[11px] px-2.5 py-1 rounded-md uppercase tracking-wider shadow-sm pointer-events-auto">
              {property.propertyType.name}
            </span>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2 pointer-events-auto">
            <span className="bg-[#f15e75] text-white font-extrabold text-xs px-3 py-1 rounded-md shadow-md shadow-[#f15e75]/30">
              ${property.nightlyPrice} <span className="text-[10px] font-normal">/ night</span>
            </span>
          </div>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-5 space-y-3 flex-grow flex flex-col justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold">
              <MapPin className="w-3.5 h-3.5 text-[#f15e75] shrink-0" />
              <span>{property.city ? property.city.name : 'Poconos'}{property.community ? `, ${property.community.name}` : ''}</span>
            </div>

            {/* Compare Action Button */}
            <button
              onClick={toggleCompare}
              className={`text-[11px] font-bold px-2 py-0.5 rounded-md border transition-colors flex items-center gap-1 ${
                isCompared
                  ? 'bg-teal-50 text-teal-600 border-teal-300'
                  : 'bg-gray-50 text-gray-500 border-gray-200 hover:text-[#f15e75]'
              }`}
            >
              {isCompared ? <Check className="w-3 h-3" /> : <SlidersHorizontal className="w-3 h-3" />}
              <span>{isCompared ? 'Comparing' : 'Compare'}</span>
            </button>
          </div>

          <Link href={`/listing/${property.slug}`} className="block">
            <h3 className="text-base font-bold text-[#2b2b2b] group-hover:text-[#f15e75] transition-colors line-clamp-1">
              {property.title}
            </h3>
          </Link>
        </div>

        {/* Specs Row */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs font-semibold text-gray-600">
          <div className="flex items-center gap-1.5">
            <Bed className="w-4 h-4 text-gray-400" />
            <span>{property.bedrooms} Bed{property.bedrooms > 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Bath className="w-4 h-4 text-gray-400" />
            <span>{property.bathrooms} Bath{Number(property.bathrooms) > 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-gray-400" />
            <span>{property.maxGuests} Guests</span>
          </div>
        </div>
      </div>
    </div>
  );
}
