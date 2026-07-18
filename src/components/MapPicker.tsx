'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Memperbaiki icon marker Leaflet yang sering hilang di Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapPickerProps {
  lat: number | '';
  lng: number | '';
  radius: number;
  onLocationChange: (lat: number, lng: number) => void;
}

// Komponen helper untuk menggeser peta secara otomatis saat props lat/lng berubah dari luar (tombol GPS)
function RecenterAutomatically({lat, lng}: {lat: number, lng: number}) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 16, { animate: true });
  }, [lat, lng, map]);
  return null;
}

export default function MapPicker({ lat, lng, radius, onLocationChange }: MapPickerProps) {
  // Default center: Monas, Jakarta jika lokasi belum ada
  const defaultCenter: [number, number] = [-6.1754, 106.8272]; 
  const currentCenter: [number, number] = (lat !== '' && lng !== '') ? [lat as number, lng as number] : defaultCenter;

  const markerRef = useRef<any>(null);

  return (
    <div className="h-[400px] w-full rounded-xl overflow-hidden border-2 border-blue-100 shadow-inner relative z-0">
      <MapContainer center={currentCenter} zoom={16} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Jika lokasi valid, render helper recenter dan circle radius */}
        {(lat !== '' && lng !== '') && (
          <>
            <RecenterAutomatically lat={lat as number} lng={lng as number} />
            <Circle 
              center={currentCenter} 
              radius={radius} 
              pathOptions={{ 
                color: '#3b82f6', 
                fillColor: '#3b82f6', 
                fillOpacity: 0.2, 
                weight: 2 
              }} 
            />
          </>
        )}

        <Marker
          draggable={true}
          position={currentCenter}
          ref={markerRef}
          eventHandlers={{
            dragend() {
              const marker = markerRef.current;
              if (marker != null) {
                const position = marker.getLatLng();
                onLocationChange(position.lat, position.lng);
              }
            },
          }}
        >
        </Marker>
      </MapContainer>
      
      {/* Overlay petunjuk jika belum ambil lokasi GPS */}
      {(lat === '' || lng === '') && (
        <div className="absolute inset-0 z-[1000] bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
          <div className="bg-blue-600 text-white p-3 rounded-full mb-3 shadow-lg animate-bounce">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">Lokasi Belum Ditentukan</h3>
          <p className="text-sm text-slate-600 font-medium">Klik tombol <b>Ambil Lokasi Saat Ini</b> di bawah, atau geser pin pada peta.</p>
        </div>
      )}
    </div>
  );
}
