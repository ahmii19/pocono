import PropertyCard from '@/components/PropertyCard';
import PropertyMap from '@/components/PropertyMap';
import { getProperties } from '@/lib/api';
import { Waves } from 'lucide-react';

export const revalidate = 60;

export default async function LakefrontPage() {
  let properties: any[] = [];
  try {
    const res = await getProperties({ limit: 12 });
    properties = res.data || [];
  } catch (e) {}

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 bg-[#f8f9fa] text-[#2b2b2b]">
      {/* Header Banner */}
      <div className="bg-white border border-gray-200 p-8 sm:p-12 rounded-3xl shadow-sm space-y-4 text-center max-w-4xl mx-auto">
        <div className="p-3 bg-cyan-500/10 text-cyan-600 rounded-2xl w-fit mx-auto">
          <Waves className="w-8 h-8" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#2b2b2b]">Lakefront Pocono Vacation Homes</h1>
        <p className="text-gray-600 text-sm max-w-2xl mx-auto">
          Wake up to peaceful lake views. Book lakefront cabins in Lake Harmony, Pocono Lake, and Arrowhead Lake with private docks, kayaks, and scenic water views.
        </p>
      </div>

      {/* Map + Properties Layout */}
      <div className="space-y-6">
        <PropertyMap properties={properties} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((p: any) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
