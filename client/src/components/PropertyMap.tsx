'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SafeImage from './SafeImage';

interface PropertyMapProps {
  properties: any[];
}

export default function PropertyMap({ properties }: PropertyMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [LeafletMap, setLeafletMap] = useState<any>(null);

  useEffect(() => {
    setIsClient(true);
    // Dynamically import Leaflet components on client side to avoid SSR window errors
    Promise.all([
      import('react-leaflet'),
      import('leaflet')
    ]).then(([ReactLeaflet, L]) => {
      // Fix default Leaflet icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      setLeafletMap({
        MapContainer: ReactLeaflet.MapContainer,
        TileLayer: ReactLeaflet.TileLayer,
        Marker: ReactLeaflet.Marker,
        Popup: ReactLeaflet.Popup,
      });
    });
  }, []);

  // Filter only properties with valid, verified non-null numeric latitude and longitude
  const validProperties = properties.filter((p: any) => {
    const lat = parseFloat(p.latitude);
    const lng = parseFloat(p.longitude);
    return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
  });

  const missingCoordsProperties = properties.filter((p: any) => !validProperties.includes(p));
  if (missingCoordsProperties.length > 0) {
    console.warn(`[PROPERTY MAP] Excluded ${missingCoordsProperties.length} properties with missing/invalid coordinates from map display.`);
  }

  if (!isClient || !LeafletMap) {
    return (
      <div className="w-full h-full min-h-[400px] bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-400 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading Interactive Map...</span>
        </div>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup } = LeafletMap;

  // Compute default center (Pocono region [41.1, -75.3] or first valid property)
  const centerLat = validProperties.length > 0 ? parseFloat(validProperties[0].latitude) : 41.1;
  const centerLng = validProperties.length > 0 ? parseFloat(validProperties[0].longitude) : -75.3;

  return (
    <div className="w-full h-full min-h-[500px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative z-0">
      {/* Include Leaflet CSS dynamically */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />

      <MapContainer
        center={[centerLat, centerLng]}
        zoom={9}
        scrollWheelZoom={false}
        className="w-full h-full min-h-[500px]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {validProperties.map((p: any) => {
          const lat = parseFloat(p.latitude);
          const lng = parseFloat(p.longitude);
          const imageUrl = p.images && p.images.length > 0 ? p.images[0].imageUrl : '/placeholder.jpg';

          return (
            <Marker key={p.id} position={[lat, lng]}>
              <Popup className="custom-leaflet-popup">
                <div className="w-64 space-y-2 p-1 text-slate-900">
                  <div className="relative h-32 w-full rounded-lg overflow-hidden bg-slate-100">
                    <SafeImage
                      src={imageUrl}
                      alt={p.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-teal-600 text-white font-bold text-xs px-2 py-0.5 rounded">
                      ${p.nightlyPrice}/night
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{p.title}</h4>
                    <p className="text-xs text-slate-600">
                      {p.city?.name || 'Poconos'}{p.community ? ` • ${p.community.name}` : ''}
                    </p>
                  </div>
                  <Link
                    href={`/listing/${p.slug}`}
                    className="block w-full text-center bg-slate-900 text-white text-xs font-bold py-1.5 rounded hover:bg-slate-800 transition-colors"
                  >
                    View Property →
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
