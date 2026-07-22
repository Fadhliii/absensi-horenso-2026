'use client';

import { useState, useEffect, useCallback } from 'react';
import { getActiveSesiInfoAction, selesaiSesiAction } from '@/app/actions/sesi';
import { Clock, QrCode, XCircle, ArrowRight, Radio } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ActiveSessionBanner() {
  const pathname = usePathname();
  const [activeInfo, setActiveInfo] = useState<{
    active: boolean;
    sessionId?: string;
    remainingSeconds?: number;
    userRole?: string;
  }>({ active: false });

  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isClosing, setIsClosing] = useState(false);

  const checkActiveSession = useCallback(async () => {
    try {
      const res = await getActiveSesiInfoAction();
      if (res && res.active && res.remainingSeconds !== undefined) {
        setActiveInfo(res);
        setTimeLeft(res.remainingSeconds);
      } else {
        setActiveInfo({ active: false });
        setTimeLeft(0);
      }
    } catch (err) {
      setActiveInfo({ active: false });
    }
  }, []);

  useEffect(() => {
    checkActiveSession();
    const interval = setInterval(() => {
      checkActiveSession();
    }, 10000); // Polling setiap 10 detik

    return () => clearInterval(interval);
  }, [checkActiveSession, pathname]);

  // Countdown timer per detik
  useEffect(() => {
    if (!activeInfo.active || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          checkActiveSession(); // Re-check saat 0
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeInfo.active, timeLeft, checkActiveSession]);

  const handleManualClose = async () => {
    if (!activeInfo.sessionId) return;
    if (!confirm('Apakah Anda yakin ingin mematikan sesi absensi ini untuk semua siswa?')) return;

    setIsClosing(true);
    await selesaiSesiAction(activeInfo.sessionId);
    setIsClosing(false);
    checkActiveSession();
  };

  if (!activeInfo.active || timeLeft <= 0) {
    return null;
  }

  // Format MM:SS
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Jangan tampilkan banner jika user sudah berada di halaman scanner atau live QR itu sendiri
  const isCurrentLiveQRPage = activeInfo.sessionId && pathname.includes(`/admin/sesi/${activeInfo.sessionId}`);

  return (
    <div className="bg-[#ffe600] border-b-4 border-black px-4 py-2.5 z-50 sticky top-0 shadow-[0_4px_0_0_#000]">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-black">
        
        {/* Sisi Kiri: Status & Timer */}
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600 border border-black"></span>
          </span>

          <div className="flex items-center gap-2 font-black uppercase text-xs sm:text-sm tracking-wide">
            <Radio className="w-4 h-4 text-black animate-pulse" />
            <span>Sesi Absensi QR Sedang Berjalan!</span>
          </div>

          <div className="flex items-center gap-1.5 bg-black text-[#ffe600] px-2.5 py-1 neo-border text-xs font-mono font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>Sisa: {formattedTime}</span>
          </div>
        </div>

        {/* Sisi Kanan: Tombol Aksi */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {activeInfo.userRole === 'siswa' && (
            <Link
              href="/siswa/scan"
              className="bg-[#00f0ff] hover:bg-[#00d8e6] text-black font-black px-3 py-1 neo-btn text-xs uppercase flex items-center gap-1"
            >
              <QrCode className="w-3.5 h-3.5" /> Scan QR Sekarang <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}

          {(activeInfo.userRole === 'admin' || activeInfo.userRole === 'instruktur') && (
            <>
              {!isCurrentLiveQRPage && (
                <Link
                  href={`/admin/sesi/${activeInfo.sessionId}`}
                  className="bg-[#00f0ff] hover:bg-[#00d8e6] text-black font-black px-3 py-1 neo-btn text-xs uppercase flex items-center gap-1"
                >
                  <QrCode className="w-3.5 h-3.5" /> Lihat Live QR
                </Link>
              )}
              <button
                onClick={handleManualClose}
                disabled={isClosing}
                className="bg-[#ff00c8] hover:bg-[#d000a3] text-white font-black px-3 py-1 neo-btn text-xs uppercase flex items-center gap-1 disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" /> {isClosing ? 'Mematikan...' : 'Matikan Sesi'}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
