'use client';

import { useState, useEffect, useRef } from 'react';
import { submitAbsensiAction } from '@/app/actions/absensi';
import { getAccurateLocation } from '@/lib/geo';
import { Camera, MapPin, CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import IndonesianClock from '@/components/IndonesianClock';

type ScanState = 'idle' | 'request_camera' | 'scanning' | 'getting_location' | 'submitting' | 'success' | 'error';

export default function ScanAbsensiPage() {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [statusMessage, setStatusMessage] = useState('Siap untuk absen');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Ref untuk instance scanner agar bisa distop dari dalam fungsi lain
  const scannerRef = useRef<any>(null);

  // Bersihkan scanner saat komponen unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanner = async () => {
    setScanState('request_camera');
    setStatusMessage('Meminta akses kamera...');
    setErrorMessage('');

    try {
      // Dynamic import html5-qrcode
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
      
      // Inisialisasi scanner dengan object config (verbose wajib diisi)
      const html5QrCode = new Html5Qrcode('qr-reader', {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
      });
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' }, // Paksa kamera belakang
        {
          fps: 10,    // 10 frame per detik (optimal untuk HP low-end)
          qrbox: { width: 250, height: 250 }, // Area fokus
          aspectRatio: 1.0 // Kotak
        },
        (decodedText) => {
          // --- ON SUCCESS SCAN ---
          handleQrSuccess(decodedText, html5QrCode);
        },
        (error) => {
          // --- ON ERROR (Hanya log peringatan, jangan lempar error UI, wajar jika belum terbaca) ---
        }
      );

      setScanState('scanning');
      setStatusMessage('Arahkan kamera ke QR Code...');

    } catch (err: any) {
      console.error('Gagal memulai kamera', err);
      setScanState('error');
      setErrorMessage(`Kamera tidak dapat diakses: ${err?.message || 'Pastikan Anda memberikan izin kamera.'}`);
    }
  };

  const handleQrSuccess = async (qrToken: string, html5QrCode: any) => {
    // 1. Hentikan kamera segera setelah dapat token (hemat resource)
    if (html5QrCode.isScanning) {
      await html5QrCode.stop().catch(console.error);
    }
    
    // 2. Mulai proses validasi lokasi presisi
    setScanState('getting_location');
    setStatusMessage('Memvalidasi lokasi GPS presisi...');

    getAccurateLocation(
      async (res) => {
        // 3. Submit ke server action
        setScanState('submitting');
        setStatusMessage('Mencatat kehadiran...');

        const result = await submitAbsensiAction(qrToken, res.latitude, res.longitude);

        if (result?.error) {
          setScanState('error');
          setErrorMessage(result.error);
        } else {
          setScanState('success');
          setStatusMessage('Absensi Berhasil!');
        }
      },
      (err) => {
        setScanState('error');
        setErrorMessage(`Gagal mengambil lokasi GPS presisi: ${err.message}. Pastikan GPS Anda aktif.`);
      },
      (acc) => {
        setStatusMessage(`Mengunci GPS presisi (Akurasi: ±${acc}m)...`);
      }
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 p-4 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/siswa/dashboard" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-lg font-bold">Scan Absensi</h1>
        </div>
        <IndonesianClock className="bg-gray-900 border-gray-700 text-gray-200" />
      </header>

      {/* Main Scanner Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        
        {/* Status Text Area */}
        <div className="text-center mb-6 h-12 flex items-center justify-center">
          {scanState === 'request_camera' && <p className="text-yellow-400 animate-pulse">{statusMessage}</p>}
          {scanState === 'scanning' && <p className="text-blue-400 animate-pulse">{statusMessage}</p>}
          {scanState === 'getting_location' && (
            <p className="text-yellow-400 flex items-center gap-2">
              <MapPin className="w-4 h-4 animate-bounce" /> {statusMessage}
            </p>
          )}
          {scanState === 'submitting' && (
            <p className="text-blue-400 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> {statusMessage}
            </p>
          )}
          {scanState === 'success' && (
            <p className="text-green-400 flex items-center gap-2 font-bold text-lg">
              <CheckCircle className="w-5 h-5" /> {statusMessage}
            </p>
          )}
        </div>

        {/* Camera/Reader Viewport */}
        <div className="w-full max-w-sm relative">
          
          {/* DIV wajib untuk html5-qrcode merender video */}
          <div 
            id="qr-reader" 
            className={`w-full overflow-hidden bg-black rounded-2xl border-2 ${
              scanState === 'scanning' ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'border-gray-700'
            }`}
            style={{ 
              display: (scanState === 'idle' || scanState === 'success' || scanState === 'error') ? 'none' : 'block',
              minHeight: '300px'
            }}
          ></div>

          {/* Fallback View jika sedang tidak scan */}
          {(scanState === 'idle' || scanState === 'success' || scanState === 'error') && (
            <div className="w-full aspect-square bg-gray-800 rounded-2xl border-2 border-gray-700 flex flex-col items-center justify-center p-6 text-center shadow-inner">
              
              {scanState === 'idle' && (
                <>
                  <Camera className="w-16 h-16 text-gray-500 mb-4" />
                  <p className="text-gray-400 mb-6 text-sm">Pastikan Anda berada di area kelas dan memberikan izin akses kamera serta GPS.</p>
                  <button 
                    onClick={startScanner}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg active:scale-95"
                  >
                    Mulai Scan QR
                  </button>
                </>
              )}

              {scanState === 'success' && (
                <div className="flex flex-col items-center animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Sukses!</h3>
                  <p className="text-green-400 text-sm mb-6">Kehadiran Anda telah dicatat.</p>
                  <Link 
                    href="/siswa/dashboard"
                    className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                  >
                    Kembali ke Dashboard
                  </Link>
                </div>
              )}

              {scanState === 'error' && (
                <div className="flex flex-col items-center animate-in zoom-in duration-300 w-full">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                    <XCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Gagal Absen</h3>
                  <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm mb-6 w-full text-left border border-red-500/20">
                    {errorMessage}
                  </div>
                  <button 
                    onClick={startScanner}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg active:scale-95"
                  >
                    Coba Scan Ulang
                  </button>
                </div>
              )}

            </div>
          )}
        </div>
        
        {/* Helper Note */}
        {scanState === 'scanning' && (
          <p className="mt-8 text-gray-400 text-xs text-center max-w-xs">
            Pastikan gambar tidak blur. Sistem hanya akan memindai jika Anda berada di radius kelas.
          </p>
        )}

      </main>
    </div>
  );
}

// Catatan penting untuk css global jika diperlukan untuk html5-qrcode
// html5-qrcode akan otomatis inject beberapa elemen. Kita perlu memastikan tidak ada overflow.
// Tailwind class "overflow-hidden" pada div kontainer sudah cukup menahan agar video tidak keluar batas.
