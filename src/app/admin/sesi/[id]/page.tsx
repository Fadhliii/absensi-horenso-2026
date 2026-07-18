'use client';

import { useState, useEffect, useRef, useCallback, use } from 'react';
import { getDetailSesiAction, selesaiSesiAction, getJumlahHadirAction } from '@/app/actions/sesi';
import { QRCodeSVG } from 'qrcode.react';
import { Users, Loader2, MapPin, StopCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ActiveSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: sessionId } = use(params);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [sessionData, setSessionData] = useState<any>(null);
  const [qrToken, setQrToken] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(0);
  const [hadirCount, setHadirCount] = useState<number>(0);

  // Refs untuk menghindar dari stale closure di dalam setInterval
  const intervalRef = useRef<number>(0);
  const tokenTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch token baru dari API
  const generateNewToken = useCallback(async (interval: number) => {
    try {
      const res = await fetch('/api/qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, interval })
      });
      const data = await res.json();
      if (data.token) {
        setQrToken(data.token);
        setCountdown(interval);
      } else {
        console.error('Gagal generate token:', data.error);
      }
    } catch (err) {
      console.error('Network error generate token', err);
    }
  }, [sessionId]);

  // Inisialisasi awal
  useEffect(() => {
    async function init() {
      const { data, error } = await getDetailSesiAction(sessionId);
      if (error || !data) {
        setError('Sesi tidak ditemukan atau terjadi kesalahan.');
        setLoading(false);
        return;
      }

      if (data.status !== 'aktif') {
        setError('Sesi ini sudah ditutup.');
        setLoading(false);
        return;
      }

      setSessionData(data);
      intervalRef.current = data.interval_qr_detik;
      
      // Generate token pertama
      await generateNewToken(data.interval_qr_detik);
      setLoading(false);
    }
    
    init();
  }, [sessionId, generateNewToken]);

  // Effect untuk Countdown & Refresh Token
  useEffect(() => {
    if (loading || error || !sessionData) return;

    // Bersihkan interval lama jika ada
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Waktu habis, generate token baru
          generateNewToken(intervalRef.current);
          return intervalRef.current; // Reset counter sementara menunggu token baru
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [loading, error, sessionData, generateNewToken]);

  // Effect untuk Polling Jumlah Kehadiran (setiap 3 detik)
  useEffect(() => {
    if (loading || error || !sessionData) return;

    async function pollKehadiran() {
      const result = await getJumlahHadirAction(sessionId);
      if (result.count !== undefined) {
        setHadirCount(result.count);
      }
    }

    // Panggil pertama kali
    pollKehadiran();

    pollingIntervalRef.current = setInterval(() => {
      pollKehadiran();
    }, 3000);

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [sessionId, loading, error, sessionData]);

  async function handleTutupSesi() {
    if (!confirm('Yakin ingin menutup sesi ini? Siswa tidak akan bisa absen lagi.')) return;
    
    // Bersihkan semua timer
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    const result = await selesaiSesiAction(sessionId);
    
    if (result?.error) {
      setError(result.error);
    } else {
      router.push('/admin/dashboard');
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-red-50 text-red-600 p-6 rounded-lg max-w-md text-center shadow-sm">
          <p className="font-semibold">{error}</p>
          <button onClick={() => router.push('/admin/dashboard')} className="mt-4 px-4 py-2 bg-white border border-red-200 rounded text-red-600 text-sm hover:bg-red-50">Kembali ke Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header Info */}
      <div className="bg-gray-800 text-white p-4 shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-wide">Sesi Absensi Aktif</h1>
          <p className="text-gray-200 text-xs mt-1 flex items-center font-medium">
            <MapPin className="w-3 h-3 mr-1" />
            Radius {sessionData.radius_meter}m • Refresh tiap {sessionData.interval_qr_detik} detik
          </p>
        </div>
        <button 
          onClick={handleTutupSesi}
          className="flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <StopCircle className="w-4 h-4 mr-2" /> Tutup Sesi
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        
        {/* QR Code Container */}
        <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center w-full max-w-md transform transition-all">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Scan untuk Absen</h2>
            <p className="text-gray-900 font-semibold mt-1">Gunakan aplikasi siswa untuk scan kode ini</p>
          </div>

          <div className="relative p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            {qrToken ? (
              <QRCodeSVG 
                value={qrToken} 
                size={250} 
                level="H"
                includeMargin={true}
                className="rounded-lg shadow-sm"
              />
            ) : (
              <div className="w-[250px] h-[250px] flex items-center justify-center bg-gray-100 rounded-lg">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}
            
            {/* Visual Countdown Overlay Indicator */}
            {countdown <= 2 && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center rounded-xl z-10 transition-all duration-300">
                <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg animate-pulse">
                  Mengganti QR...
                </span>
              </div>
            )}
          </div>

          {/* Countdown Text */}
          <div className="mt-8 flex items-center justify-center space-x-2">
            <span className="text-gray-900 font-bold">Berubah dalam:</span>
            <span className={`text-2xl font-black tabular-nums ${countdown <= 3 ? 'text-red-600 animate-pulse' : 'text-blue-600'}`}>
              {countdown}
            </span>
            <span className="text-gray-900 font-bold">detik</span>
          </div>
        </div>

        {/* Live Counter (Bottom Panel) */}
        <div className="mt-12 bg-gray-800 rounded-full px-6 py-3 flex items-center shadow-lg border border-gray-700">
          <div className="bg-green-500 w-2.5 h-2.5 rounded-full animate-pulse mr-3"></div>
          <Users className="w-5 h-5 text-gray-100 mr-2" />
          <span className="text-gray-100 font-semibold mr-2">Total Kehadiran:</span>
          <span className="text-white font-bold text-xl">{hadirCount}</span>
          <span className="text-gray-200 font-semibold ml-1">Siswa</span>
        </div>

      </div>
    </div>
  );
}
