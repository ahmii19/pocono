'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SafeImage from './SafeImage';
import { X, SlidersHorizontal, Bed, Bath, Users, Trash2 } from 'lucide-react';
import { getPropertyById } from '@/lib/api';

export default function CompareDrawer() {
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [comparedProperties, setComparedProperties] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const loadCompare = () => {
      const stored = localStorage.getItem('pocono_compare');
      if (stored) {
        try {
          const ids = JSON.parse(stored);
          setCompareIds(ids);
        } catch (e) {}
      }
    };

    loadCompare();
    window.addEventListener('storage', loadCompare);
    window.addEventListener('pocono_compare_updated', loadCompare);
    return () => {
      window.removeEventListener('storage', loadCompare);
      window.removeEventListener('pocono_compare_updated', loadCompare);
    };
  }, []);

  useEffect(() => {
    if (compareIds.length === 0) {
      setComparedProperties([]);
      return;
    }

    Promise.all(compareIds.map(id => getPropertyById(id).catch(() => null)))
      .then(results => {
        const valid = results.filter((r): r is { data: any } => Boolean(r && r.data)).map(r => r.data);
        setComparedProperties(valid);
      });
  }, [compareIds]);

  const removeProperty = (id: string) => {
    const updated = compareIds.filter(i => i !== id);
    setCompareIds(updated);
    localStorage.setItem('pocono_compare', JSON.stringify(updated));
    window.dispatchEvent(new Event('pocono_compare_updated'));
  };

  const clearAll = () => {
    setCompareIds([]);
    setComparedProperties([]);
    localStorage.removeItem('pocono_compare');
    window.dispatchEvent(new Event('pocono_compare_updated'));
  };

  if (compareIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Trigger Bar Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-[#2b2b2b] text-white px-5 py-3 rounded-2xl shadow-2xl border border-gray-700 flex items-center gap-3 hover:bg-[#f15e75] transition-all"
        >
          <SlidersHorizontal className="w-4 h-4 text-[#f15e75]" />
          <span className="text-xs font-extrabold uppercase tracking-wider">Compare Properties ({compareIds.length})</span>
        </button>
      )}

      {/* Expanded Compare Modal */}
      {isOpen && (
        <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl p-6 w-[90vw] max-w-4xl max-h-[85vh] overflow-y-auto space-y-6 text-[#2b2b2b]">
          <div className="flex justify-between items-center border-b border-gray-200 pb-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-[#f15e75]" />
              <h3 className="text-lg font-extrabold">Property Comparison ({comparedProperties.length})</h3>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={clearAll}
                className="text-xs font-bold text-gray-500 hover:text-rose-500 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Comparison Grid Table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {comparedProperties.map((p: any) => {
              const image = p.images && p.images.length > 0 ? p.images[0].imageUrl : '/placeholder.jpg';

              return (
                <div key={p.id} className="border border-gray-200 rounded-2xl p-4 space-y-3 bg-gray-50 relative">
                  <button
                    onClick={() => removeProperty(p.id)}
                    className="absolute top-2 right-2 p-1.5 bg-white border border-gray-200 text-gray-400 hover:text-rose-500 rounded-full shadow-sm"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="h-36 w-full rounded-xl overflow-hidden bg-gray-200">
                    <SafeImage src={image} alt={p.title} className="w-full h-full object-cover" />
                  </div>

                  <div>
                    <span className="text-[10px] font-extrabold text-[#f15e75] uppercase">{p.city?.name || 'Poconos'}</span>
                    <h4 className="font-bold text-sm text-[#2b2b2b] line-clamp-1">{p.title}</h4>
                    <span className="text-sm font-extrabold text-[#f15e75]">${p.nightlyPrice} / night</span>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-600 border-t border-gray-200 pt-2 font-medium">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Bedrooms:</span>
                      <span className="font-bold">{p.bedrooms} Beds</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Bathrooms:</span>
                      <span className="font-bold">{p.bathrooms} Baths</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Guests:</span>
                      <span className="font-bold">{p.maxGuests} Guests</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Property Type:</span>
                      <span className="font-bold">{p.propertyType?.name || 'Cabin'}</span>
                    </div>
                  </div>

                  <Link
                    href={`/listing/${p.slug}`}
                    className="block w-full text-center py-2 bg-[#2b2b2b] hover:bg-[#f15e75] text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    View Property →
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
