'use client';

import { useState } from 'react';
import { mulaiSesiAction } from '@/app/actions/sesi';
import { logoutAction } from '@/app/actions/auth';
import { getAccurateLocation } from '@/lib/geo';
import { MapPin, LogOut, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { 
  ssr: false, 
  loading: () => (
    <div className="h-[400px] w-full bg-slate-100 animate-pulse rounded-xl flex flex-col items-center justify-center text-slate-500 border-2 border-slate-200 border-dashed">
      <Loader2 className="w-8 h-8 animate-spin mb-2" />
      <p className="font-medium">Memuat Peta (OpenStreetMap)...</p>
    </div>
  ) 
});

export default function BukaSesiPage() {
  const router = useRouter();
  const [lat, setLat] = useState<number | ''>('');
  const [lng, setLng] = useState<number | ''>('');
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState('');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [radius, setRadius] = useState(50);
  
  const [intervalType, setIntervalType] = useState('10'); // default 10 detik
  const [customInterval, setCustomInterval] = useState('');

  function handleGetLocation() {
    setLocLoading(true);
    setLocError('');
    setAccuracy(null);

    getAccurateLocation(
      (res) => {
        setLat(res.latitude);
        setLng(res.longitude);
        setAccuracy(res.accuracy);
        setLocLoading(false);
      },
      (err) => {
        setLocError(`Gagal mengambil lokasi presisi: ${err.message}`);
        setLocLoading(false);
      },
      (currentAcc) => {
        setAccuracy(currentAcc);
      }
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lat === '' || lng === '') {
      setSubmitError('Silakan ambil lokasi GPS terlebih dahulu!');
      return;
    }
    
    setSubmitLoading(true);
    setSubmitError('');
    
    const formData = new FormData(e.currentTarget);
    // Masukkan latitude & longitude yang diambil ke form data (karena inputnya readOnly / disabled)
    formData.set('latitude', lat.toString());
    formData.set('longitude', lng.toString());
    
    // Tentukan interval aktual
    const finalInterval = intervalType === 'custom' ? customInterval : intervalType;
    formData.set('interval', finalInterval);

    const result = await mulaiSesiAction(formData);
    
    if (result?.error) {
      setSubmitError(result.error);
      setSubmitLoading(false);
    } else if (result?.success && result.sessionId) {
      // Jika sukses, redirect ke halaman QR Live menggunakan router client
      router.push(`/admin/sesi/${result.sessionId}`);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="text-black hover:text-black">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-black">Buka Sesi Absensi</h1>
          </div>
          <form action={logoutAction}>
            <button className="flex items-center text-black hover:text-red-600 text-sm font-medium transition-colors">
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white shadow rounded-lg p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-black">Pengaturan Sesi Baru</h2>
            <p className="text-sm text-black mt-1">Siswa hanya bisa absen jika berada di dalam radius toleransi dari lokasi Anda saat ini.</p>
          </div>

          {submitError && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm">
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Radius */}
            <div>
              <label className="block text-sm font-semibold text-black mb-1">Radius Toleransi (Meter)</label>
              <input 
                type="number" 
                name="radius" 
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value) || 10)}
                min="10" 
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-black bg-blue-50/50 font-medium text-lg text-blue-900"
              />
              <p className="text-xs text-black mt-1">Lingkaran pada peta akan membesar/mengecil sesuai radius ini.</p>
            </div>

            {/* Lokasi GPS + Map */}
            <div className="border border-gray-200 rounded-xl bg-gray-50 overflow-hidden shadow-sm">
              <div className="p-4 bg-white border-b border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <label className="block text-sm font-semibold text-black">Titik Pusat Absensi</label>
                  <p className="text-xs text-black mt-0.5">Geser pin di peta untuk menyesuaikan lokasi presisi.</p>
                </div>
                <button 
                  type="button" 
                  onClick={handleGetLocation} 
                  disabled={locLoading}
                  className="inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-70 transition-colors shrink-0"
                >
                  {locLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}
                  Ambil Lokasi Saat Ini
                </button>
              </div>

              {locError && <p className="text-xs text-red-500 p-4 pb-0">{locError}</p>}

              <div className="p-4">
                <MapPicker 
                  lat={lat} 
                  lng={lng} 
                  radius={radius} 
                  onLocationChange={(newLat, newLng) => {
                    setLat(newLat);
                    setLng(newLng);
                  }} 
                />
              </div>

              {/* Readonly info lat/lng & accuracy for debugging/transparency */}
              <div className="px-4 py-3 bg-gray-100 border-t border-gray-200 flex flex-wrap justify-between items-center text-xs text-black gap-2">
                <span>Lat: {lat === '' ? '-' : (lat as number).toFixed(6)}</span>
                <span>Lng: {lng === '' ? '-' : (lng as number).toFixed(6)}</span>
                {accuracy !== null && (
                  <span className={`font-bold px-2 py-0.5 rounded flex items-center gap-1 ${accuracy > 50 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-green-100 text-green-700'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Akurasi Perangkat: ±{accuracy} meter
                  </span>
                )}
              </div>
            </div>

            {accuracy !== null && accuracy > 30 && (
              <div className="bg-[#ffe600] border-2 border-black p-3.5 rounded-lg text-xs font-bold text-black flex items-start gap-2 shadow-[2px_2px_0px_0px_#000]">
                <span className="text-base leading-none">💡</span>
                <div>
                  <p className="uppercase font-black">Petunjuk Presisi Lokasi Laptop/PC:</p>
                  <p className="mt-0.5 font-medium">Browser PC/Laptop menggunakan lokasi WiFi (akurasi ±{accuracy}m). Silakan <b>KLIK atau GESER PIN MERAH di peta</b> persis ke lokasi ruang kelas Anda agar titik absensi 100% presisi!</p>
                </div>
              </div>
            )}

            {/* Interval Refresh QR */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">Interval Refresh QR Code</label>
              <select 
                value={intervalType}
                onChange={(e) => setIntervalType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-black mb-2"
              >
                <option value="3">3 Detik (Paling Aman, Realtime)</option>
                <option value="5">5 Detik (Disarankan)</option>
                <option value="10">10 Detik (Lebih Longgar)</option>
                <option value="custom">Custom / Input Manual</option>
              </select>

              {intervalType === 'custom' && (
                <input 
                  type="number" 
                  value={customInterval}
                  onChange={(e) => setCustomInterval(e.target.value)}
                  placeholder="Masukkan angka dalam detik (misal: 15)"
                  min="2"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-black"
                />
              )}
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={submitLoading || lat === ''}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
              >
                {submitLoading ? 'Menyiapkan Sesi...' : 'Mulai Sesi Absensi & Tampilkan QR'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
