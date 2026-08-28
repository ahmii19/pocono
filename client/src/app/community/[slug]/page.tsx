import PropertyCard from '@/components/PropertyCard';
import { getProperties } from '@/lib/api';
import Link from 'next/link';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const commName = params.slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return {
    title: `${commName} Rentals | Pocono.Vacations`,
    description: `Vacation properties in ${commName} community subdivision.`
  };
}

export default async function CommunityPage({ params }: { params: { slug: string } }) {
  let properties: any[] = [];
  const commName = params.slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  try {
    const res = await getProperties({ community: params.slug, limit: 20 });
    properties = res.data || [];
  } catch (e) {}

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="border-b border-slate-800 pb-6 space-y-2">
        <span className="text-xs text-teal-400 font-bold uppercase tracking-wider block">Featured Subdivision / Community</span>
        <h1 className="text-4xl font-extrabold text-white">{commName} ({properties.length} Rentals)</h1>
        <p className="text-slate-400 text-sm">
          Browse luxury homes and cabin rentals inside the private {commName} resort community.
        </p>
      </div>

      {properties.length === 0 ? (
        <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center">
          <h3 className="text-xl font-bold text-white">No listings found in {commName}</h3>
          <Link href="/properties" className="text-teal-400 text-sm font-semibold mt-2 inline-block">Browse All Properties</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {properties.map((p: any) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      )}
    </div>
  );
}
