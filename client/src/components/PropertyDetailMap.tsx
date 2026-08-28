'use client';

import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';

interface PropertyDetailMapProps {
  latitude: number | string | null | undefined;
  longitude: number | string | null | undefined;
  propertyTitle: string;
  address?: string | null;
}

function isValidLatitude(v: number): boolean {
  return !isNaN(v) && isFinite(v) && v >= -90 && v <= 90 && v !== 0;
}

function isValidLongitude(v: number): boolean {
  return !isNaN(v) && isFinite(v) && v >= -180 && v <= 180 && v !== 0;
}

export default function PropertyDetailMap({
  latitude,
  longitude,
  propertyTitle,
  address,
}: PropertyDetailMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [LeafletMap, setLeafletMap] = useState<any>(null);

  const lat = latitude != null ? parseFloat(String(latitude)) : NaN;
  const lng = longitude != null ? parseFloat(String(longitude)) : NaN;
  const hasValidCoords = isValidLatitude(lat) && isValidLongitude(lng);

  useEffect(() => {
    setIsClient(true);
    if (!hasValidCoords) return;

    // Dynamically import Leaflet only on client side to avoid Next.js SSR window errors
    Promise.all([
      import('react-leaflet'),
      import('leaflet'),
    ]).then(([ReactLeaflet, L]) => {
      // Fix default Leaflet marker icon paths broken under Next.js/Webpack
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      setLeafletMap({
        MapContainer: ReactLeaflet.MapContainer,
        TileLayer: ReactLeaflet.TileLayer,
        Marker: ReactLeaflet.Marker,
        Popup: ReactLeaflet.Popup,
      });
    });
  }, [hasValidCoords]);

  // ── Missing or invalid coordinates fallback ───────────────────────────────────
  if (isClient && !hasValidCoords) {
    return (
      <div className="w-full h-[200px] bg-gray-50 border border-[#d8dce1] rounded-md flex flex-col items-center justify-center gap-2">
        <MapPin className="w-8 h-8 text-[#d8dce1]" />
        <p className="text-xs font-semibold text-[#9ca3af]">
          Location map unavailable for this property.
        </p>
      </div>
    );
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────────
  if (!isClient || !LeafletMap) {
    return (
      <div className="w-full h-[360px] md:h-[420px] bg-gray-100 border border-[#d8dce1] rounded-md flex items-center justify-center">
        <div className="flex items-center gap-2 text-[#7a7a7a]">
          <div className="w-4 h-4 border-2 border-[#f15e75] border-t-transparent rounded-full animate-spin" />
          <span className="font-medium text-xs">Loading map...</span>
        </div>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup } = LeafletMap;

  return (
    <div className="w-full h-[360px] md:h-[420px] rounded-md overflow-hidden border border-[#d8dce1] shadow-sm relative z-0">
      {/* Leaflet CSS loaded inline so it is present before map renders */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />

      {/*
        key={`${lat}-${lng}`} forces MapContainer to fully remount whenever
        the user navigates to a different property, preventing stale markers.
      */}
      <MapContainer
        key={`map-${lat}-${lng}`}
        center={[lat, lng]}
        zoom={15}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={[lat, lng]}>
          <Popup>
            <div className="min-w-[180px] space-y-1 py-0.5">
              <p className="font-bold text-sm text-gray-800 leading-snug">
                {propertyTitle}
              </p>
              {address && (
                <p className="text-xs text-gray-500 leading-snug">{address}</p>
              )}
              <p className="text-[10px] text-gray-400 font-medium mt-1">
                📍 Property location
              </p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
