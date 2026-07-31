'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getStudentDashboardDataAction } from '@/app/actions/siswa';
import { ajukanIzinAction, getInstrukturAction } from '@/app/actions/izin';
import { masukKelasDirectAction } from '@/app/actions/absensi';
import { logoutAction } from '@/app/actions/auth';
import IndonesianClock from '@/components/IndonesianClock';
import { formatIndonesianDate, formatIndonesianTime } from '@/lib/date';
import { getAccurateLocation } from '@/lib/geo';
import { QrCode, LogOut, Calendar, Clock, MapPin, CheckCircle, XCircle, AlertCircle, Building2, Filter, DoorOpen, Loader2, HelpCircle, Smartphone, X } from 'lucide-react';
import Link from 'next/link';
import SoftSkillHistoryAccordion from '@/components/SoftSkillHistoryAccordion';

export default function SiswaDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Masuk Kelas State
  const [masukLoading, setMasukLoading] = useState(false);
  const [masukMsg, setMasukMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Bantuan GPS Android / iPhone
  const [isGpsHelpOpen, setIsGpsHelpOpen] = useState(false);

  // Filter bulan & kategori
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [monthFilter, setMonthFilter] = useState(currentMonth);
  const [historyFilter, setHistoryFilter] = useState<'semua' | 'hadir' | 'gagal' | 'tidak_masuk'>('semua');
  
  // State untuk modal izin
  const [isIzinModalOpen, setIsIzinModalOpen] = useState(false);
  const [izinTanggal, setIzinTanggal] = useState('');
  const [izinTipe, setIzinTipe] = useState<'izin' | 'sakit'>('izin');
  const [izinAlasan, setIzinAlasan] = useState('');
  const [izinDilaporkanKe, setIzinDilaporkanKe] = useState('');
  const [izinLoading, setIzinLoading] = useState(false);
  const [izinError, setIzinError] = useState('');
  const [instrukturList, setInstrukturList] = useState<{id: string, name: string}[]>([]);

  // Live Notification State
  const [showLiveToast, setShowLiveToast] = useState(false);
  const [toastSesiInfo, setToastSesiInfo] = useState<any>(null);
  const prevSesiIdRef = useRef<string | null | undefined>(undefined);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getStudentDashboardDataAction(monthFilter);
    if (result.error) {
      setError(result.error);
    } else {
      setData(result);
      
      // Deteksi Sesi Baru untuk Live Notification Popup
      if (result.sesiAktif) {
        if (prevSesiIdRef.current !== undefined && prevSesiIdRef.current !== result.sesiAktif.id) {
          setToastSesiInfo(result.sesiAktif);
          setShowLiveToast(true);
          // Auto-hide setelah 8 detik
          setTimeout(() => setShowLiveToast(false), 8000);
        }
        prevSesiIdRef.current = result.sesiAktif.id;
      } else {
        prevSesiIdRef.current = null; // null berarti sedang tidak ada sesi
      }
    }
    
    const insRes = await getInstrukturAction();
    if (insRes.data) {
      setInstrukturList(insRes.data);
    }
    
    setLoading(false);
  }, [monthFilter]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const formatDate = (isoString: string) => formatIndonesianDate(isoString);
  const formatTime = (isoString: string) => formatIndonesianTime(isoString);

  const handleMasukKelas = async () => {
    setMasukLoading(true);
    setMasukMsg(null);

    getAccurateLocation(
      async (pos) => {
        const res = await masukKelasDirectAction(pos.latitude, pos.longitude);
        if (res.error) {
          setMasukMsg({ type: 'error', text: res.error });
        } else {
          setMasukMsg({ type: 'success', text: res.message || 'Permintaan Masuk Kelas berhasil dikirim!' });
          await fetchData();
        }
        setMasukLoading(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setMasukMsg({
          type: 'error',
          text: err.message || 'Gagal mendeteksi lokasi GPS.'
        });
        setMasukLoading(false);
      }
    );
  };

  const handleAjukanIzin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIzinError('');
    setIzinLoading(true);

    const formData = new FormData();
    formData.append('tanggal', izinTanggal);
    formData.append('tipe', izinTipe);
    const targetInsId = data?.profile?.instrukturKelasId || izinDilaporkanKe;
    if (targetInsId) formData.append('dilaporkan_ke', targetInsId);

    const result = await ajukanIzinAction(formData);
    if (result.error) {
      setIzinError(result.error);
    } else {
      setIsIzinModalOpen(false);
      setIzinTanggal('');
      setIzinAlasan('');
      alert('Permohonan izin/sakit berhasil diajukan.');
      fetchData();
    }
    setIzinLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f4f0] font-sans flex flex-col relative">
      {/* LIVE NOTIFICATION TOAST (POPUP) */}
      {showLiveToast && toastSesiInfo && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm bg-[#16a34a] text-white p-4 rounded neo-shadow-lg border-2 border-[#0f172a] flex items-start gap-3 transition-transform animate-in slide-in-from-top-10 fade-in duration-500">
           <div className="bg-white text-[#16a34a] p-2 rounded neo-border shrink-0 mt-0.5 animate-pulse">
             <DoorOpen className="w-6 h-6" />
           </div>
           <div className="flex-1">
             <h4 className="font-black text-sm uppercase leading-tight tracking-wide">Kelas Telah Dibuka!</h4>
             <p className="text-xs font-bold text-green-100 mt-1.5 leading-relaxed">
               Presensi kelas <span className="text-white bg-green-800 px-1.5 py-0.5 rounded uppercase">{toastSesiInfo.kelas?.nama_kelas || 'Sesi Baru'}</span> sudah dibuka. 
               Silakan lakukan absensi sekarang!
             </p>
           </div>
           <button onClick={() => setShowLiveToast(false)} className="bg-white/20 hover:bg-white/40 p-1 rounded-full text-white transition-colors neo-border">
             <X className="w-4 h-4" />
           </button>
        </div>
      )}

      {/* Ringkas Header */}
      <header className="bg-white border-b-4 border-black sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
          <div className="flex items-center justify-between">
            <h1 className="text-base sm:text-lg font-black text-black uppercase tracking-tight">Portal Siswa</h1>
            <form action={logoutAction} className="sm:hidden">
              <button className="flex items-center text-black bg-white hover:bg-black hover:text-white px-2 py-1 neo-btn text-xs font-black uppercase">
                <LogOut className="w-3.5 h-3.5 mr-1" /> Logout
              </button>
            </form>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            <IndonesianClock className="w-full sm:w-auto" />
            <form action={logoutAction} className="hidden sm:block">
              <button className="flex items-center text-black bg-white hover:bg-black hover:text-white px-2.5 py-1 neo-btn text-xs font-black uppercase">
                <LogOut className="w-3.5 h-3.5 mr-1" /> Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-5 space-y-5">
        
        {/* Skeleton Screen when initial loading */}
        {loading && !data ? (
          <div className="space-y-5 animate-pulse">
            {/* Profile Card Skeleton */}
            <div className="bg-[#e2e8f0] neo-card p-4 h-32 flex flex-col justify-between border-2 border-[#0f172a]">
              <div className="flex justify-between items-center">
                <div className="space-y-2 w-1/2">
                  <div className="h-3 bg-slate-300 rounded w-1/3"></div>
                  <div className="h-6 bg-slate-300 rounded w-3/4"></div>
                </div>
                <div className="h-7 bg-slate-300 rounded w-24"></div>
              </div>
              <div className="h-8 bg-slate-300 rounded w-full"></div>
            </div>

            {/* Action Banner Skeleton */}
            <div className="bg-[#e2e8f0] neo-card p-5 h-44 flex flex-col justify-between border-2 border-[#0f172a]">
              <div className="h-6 bg-slate-300 rounded w-1/3"></div>
              <div className="h-10 bg-slate-300 rounded w-full"></div>
              <div className="h-8 bg-slate-300 rounded w-1/2"></div>
            </div>

            {/* History Card Skeleton */}
            <div className="bg-[#e2e8f0] neo-card p-4 h-64 space-y-4 border-2 border-[#0f172a]">
              <div className="flex justify-between items-center border-b-2 border-[#0f172a] pb-3">
                <div className="h-5 bg-slate-300 rounded w-1/3"></div>
                <div className="h-7 bg-slate-300 rounded w-24"></div>
              </div>
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-slate-300 rounded w-full"></div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Compact Profile Card */}
            {data && (
              <div className="bg-[#dc2626] text-white neo-card p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black/30 pb-3 mb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase text-white/80">Siswa LPK Horenso</span>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">{data.profile.name}</h2>
                  </div>

                  {data.profile.namaKelas ? (
                    <div className="bg-[#1d4ed8] text-white px-3 py-1 neo-border text-xs font-black self-start sm:self-auto uppercase">
                      🎓 Kelas: {data.profile.namaKelas}
                    </div>
                  ) : (
                    <div className="bg-white text-black px-3 py-1 neo-border text-xs font-black self-start sm:self-auto uppercase">
                      ⚪ Belum Ada Kelas
                    </div>
                  )}
                </div>
                
                {/* Status Penempatan Compact */}
                {data.profile.statusPenempatan === 'sudah' ? (
                  <div className="flex items-center bg-[#16a34a] text-white neo-border p-2.5 text-xs font-black">
                    <Building2 className="w-4 h-4 mr-2 shrink-0" />
                    <span>Penempatan: <span className="underline">{data.profile.namaPerusahaan}</span></span>
                  </div>
                ) : (
                  <div className="flex items-center bg-black text-white neo-border p-2.5 text-xs font-black">
                    <AlertCircle className="w-4 h-4 mr-2 shrink-0 text-yellow-400" />
                    <span>Belum Ditempatkan di Perusahaan Mitra</span>
                  </div>
                )}
              </div>
            )}

        {/* Action Buttons Grid / Status Banner */}
        {data?.profile?.statusPendidikan === 'tunggu_terbang' ? (
          <div className="bg-[#ffe600] neo-card p-5 border-4 border-black text-center space-y-2">
            <span className="text-3xl block">✈️ 🎌</span>
            <h3 className="text-lg font-black text-black uppercase tracking-tight">Status: Menunggu Keberangkatan Ke Jepang</h3>
            <p className="text-xs font-bold text-black max-w-md mx-auto">
              Selamat! Anda telah menyelesaikan masa pelatihan di LPK dan saat ini dalam status <u>Menunggu Keberangkatan (Tunggu Terbang)</u>. Anda bebas dari presensi harian. Tetap jaga kesehatan!
            </p>
          </div>
        ) : data?.profile?.statusPendidikan === 'alumni' ? (
          <div className="bg-[#00f0ff] neo-card p-5 border-4 border-black text-center space-y-2">
            <span className="text-3xl block">⛩️ ✈️</span>
            <h3 className="text-lg font-black text-black uppercase tracking-tight">Status: Alumni (Sudah Berada di Jepang)</h3>
            <p className="text-xs font-bold text-black max-w-md mx-auto">
              Semoga sukses selalu meniti karir di Jepang! Ganbatte kudasai!
            </p>
          </div>
        ) : (
          <>
            {data?.profile?.statusPendidikan === 'belum_mulai' && (
              <div className="bg-[#fffde7] neo-card p-4 border-3 border-black text-center space-y-1 mb-3">
                <span className="text-xl block">⚪ 🎓</span>
                <h3 className="text-xs font-black text-black uppercase tracking-tight">Status: Belum Mulai Kelas</h3>
                <p className="text-[11px] font-bold text-gray-700 max-w-md mx-auto">
                  Silakan klik <b>Masuk Kelas</b> di bawah ini pada hari pertama kelas Anda untuk mengaktifkan akun secara otomatis!
                </p>
              </div>
            )}

            {masukMsg && (
              <div className={`p-3 border-2 border-black neo-border text-xs font-bold mb-3 space-y-2 ${
                masukMsg.type === 'error' ? 'bg-red-100 text-red-900 border-red-400' : 'bg-green-100 text-green-900'
              }`}>
                <div>{masukMsg.text}</div>
                {masukMsg.type === 'error' && (
                  <button
                    type="button"
                    onClick={() => setIsGpsHelpOpen(true)}
                    className="inline-flex items-center gap-1.5 bg-red-600 text-white px-2.5 py-1 rounded text-[11px] font-black uppercase hover:bg-red-700 transition-colors shadow-sm"
                  >
                    <HelpCircle className="w-3.5 h-3.5" /> 💡 Panduan Solusi Lokasi HP Android / iPhone
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {data?.sudahMasukKelas ? (
                /* STATE 3: SUDAH MASUK KELAS (WARNA HIJAU + TULISAN SUDAH MASUK) */
                <button
                  disabled
                  className="flex items-center justify-center gap-2 bg-[#74ee15] text-black font-black py-3 px-3 neo-btn text-xs uppercase cursor-default shadow-sm"
                >
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  <span>
                    {['pending_hadir', 'pending_telat'].includes(data?.statusAbsensiToday)
                      ? 'Menunggu ACC Guru'
                      : 'Sudah Masuk Kelas'}
                  </span>
                </button>
              ) : data?.isSesiAktif ? (
                /* STATE 2: SESI AKTIF & BELUM MASUK (WARNA BIRU INTERAKTIF) */
                <button 
                  onClick={handleMasukKelas}
                  disabled={masukLoading}
                  className="flex items-center justify-center gap-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-black py-3 px-3 neo-btn text-xs uppercase shadow-md active:scale-95 transition-transform"
                >
                  {masukLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 shrink-0 animate-spin" />
                      <span>Mendapatkan Lokasi...</span>
                    </>
                  ) : (
                    <>
                      <DoorOpen className="w-5 h-5 shrink-0" />
                      <span>Masuk Kelas</span>
                    </>
                  )}
                </button>
              ) : (
                /* STATE 1: SESI BELUM DIBUKA / GA ADA KELAS (WARNA PUDAR ABU-ABU DISABLED) */
                <button 
                  disabled
                  className="flex items-center justify-center gap-2 bg-gray-300 text-gray-600 font-black py-3 px-3 border-2 border-gray-400 text-xs uppercase cursor-not-allowed opacity-80"
                  title="Sesi kelas belum dibuka oleh Admin atau Instruktur"
                >
                  <Clock className="w-5 h-5 shrink-0 text-gray-500" />
                  <span>Sesi Belum Dibuka</span>
                </button>
              )}

              <button 
                onClick={() => setIsIzinModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-[#ff007f] hover:bg-[#d8006b] text-white font-black py-3 px-3 neo-btn text-xs uppercase"
              >
                <Calendar className="w-5 h-5 shrink-0" />
                <span>Ajukan Izin/Sakit</span>
              </button>
            </div>
          </>
        )}

        {/* Soft Skill History Accordion */}
        <SoftSkillHistoryAccordion />

        {/* Riwayat Absensi Ringkas & Integrated Filter */}
        <div className="bg-[#00f0ff] neo-card overflow-hidden">
          {/* Header Card Ringkas: Judul & Dropdown Filter Bersatu */}
          <div className="p-3 bg-[#fffde7] border-b-3 border-black flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="font-black text-black uppercase flex items-center text-xs sm:text-sm">
              <Calendar className="w-4 h-4 mr-1.5 text-black" />
              Riwayat Absensi
            </h3>

            <div className="flex items-center gap-2">
              {/* Filter Kategori Dropdown */}
              <div className="relative">
                <select
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value as any)}
                  className="text-xs font-bold neo-input py-1 pl-7 pr-2 bg-white text-black"
                >
                  <option value="semua">Semua Status</option>
                  <option value="hadir">Hadir / Telat</option>
                  <option value="gagal">Gagal Presensi / Luar Radius</option>
                  <option value="tidak_masuk">Tidak Masuk / Alpha / Izin</option>
                </select>
                <Filter className="w-3.5 h-3.5 absolute left-2 top-2 text-black pointer-events-none" />
              </div>

              {/* Month Filter */}
              <input 
                type="month" 
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="text-xs font-bold neo-input py-1 px-2 bg-white text-black"
              />
            </div>
          </div>

          {/* List Content */}
          <div className="p-0">
            {loading ? (
              <div className="p-4 space-y-3 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-10 bg-slate-200 rounded w-full border border-slate-300"></div>
                ))}
              </div>
            ) : error ? (
              <div className="p-6 text-center text-red-600 font-semibold text-xs">{error}</div>
            ) : (() => {
              const filteredRiwayat = (data?.riwayat || []).filter((absen: any) => {
                if (historyFilter === 'hadir') {
                  return ['hadir', 'telat', 'pending_hadir', 'pending_telat'].includes(absen.status);
                }
                if (historyFilter === 'gagal') {
                  return ['ditolak_lokasi', 'ditolak_expired', 'pending_luar_radius'].includes(absen.status);
                }
                if (historyFilter === 'tidak_masuk') {
                  return ['alpha', 'izin_pending', 'izin', 'sakit', 'belum_absen'].includes(absen.status);
                }
                return true;
              });

              if (filteredRiwayat.length === 0) {
                return (
                  <div className="p-8 text-center flex flex-col items-center bg-white">
                    <Calendar className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-gray-700 font-bold text-xs">Tidak ada data untuk kategori filter ini.</p>
                  </div>
                );
              }

              return (
                <ul className="divide-y divide-gray-200 bg-white">
                  {filteredRiwayat.map((absen: any) => (
                    <li key={absen.id} className="p-3 hover:bg-[#ffe600] transition-colors">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="text-xs font-black text-gray-900 mb-0.5">{formatDate(absen.waktu_scan)}</p>
                          <div className="flex items-center text-[11px] text-gray-700 font-medium">
                            <Clock className="w-3 h-3 mr-1 text-gray-500" /> {formatTime(absen.waktu_scan)}
                          </div>
                          {absen.alasan_izin && (
                            <p className="text-[11px] text-gray-600 italic mt-1 bg-gray-50 p-1.5 rounded border border-gray-200">
                              &quot;{absen.alasan_izin}&quot;
                            </p>
                          )}
                        </div>
                        
                        {/* Status Badge */}
                        <div className="flex flex-col items-end shrink-0">
                          {absen.status === 'hadir' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-green-100 text-green-900 border border-green-300">
                              <CheckCircle className="w-3 h-3 mr-1 text-green-600" /> Hadir
                            </span>
                          )}
                          {absen.status === 'telat' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-yellow-100 text-yellow-900 border border-yellow-300">
                              <Clock className="w-3 h-3 mr-1 text-yellow-600" /> Terlambat
                            </span>
                          )}
                          {absen.status === 'pending_hadir' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-400">
                              <Clock className="w-3 h-3 mr-1 text-amber-600 animate-pulse" /> Pending Approval (Hadir)
                            </span>
                          )}
                          {absen.status === 'pending_telat' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-400">
                              <Clock className="w-3 h-3 mr-1 text-amber-600 animate-pulse" /> Pending Approval (Telat)
                            </span>
                          )}
                          {absen.status === 'pending_luar_radius' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-900 border border-red-300">
                              <MapPin className="w-3 h-3 mr-1 text-red-600" /> Pending (Luar Radius)
                            </span>
                          )}
                          {absen.status === 'ditolak_lokasi' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-900 border border-red-300">
                              <MapPin className="w-3 h-3 mr-1 text-red-600" /> Luar Radius (Ditolak)
                            </span>
                          )}
                          {absen.status === 'ditolak_expired' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-900 border border-red-300">
                              <XCircle className="w-3 h-3 mr-1 text-red-600" /> Sesi Expired
                            </span>
                          )}
                          {absen.status === 'izin_pending' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-400">
                              <AlertCircle className="w-3 h-3 mr-1 text-amber-600" /> Izin (Pending)
                            </span>
                          )}
                          {absen.status === 'izin' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                              <Calendar className="w-3 h-3 mr-1 text-blue-600" /> Izin (Disetujui)
                            </span>
                          )}
                          {absen.status === 'sakit' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                              <AlertCircle className="w-3 h-3 mr-1 text-purple-600" /> Sakit (Disetujui)
                            </span>
                          )}
                          {absen.status === 'alpha' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-600 text-white border border-red-800">
                              <XCircle className="w-3 h-3 mr-1" /> Tidak Masuk (Alpha)
                            </span>
                          )}
                          {absen.status === 'belum_absen' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-800 border border-gray-300">
                              <Clock className="w-3 h-3 mr-1 text-gray-500" /> Belum Absen
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </div>
        </div>
      </>
      )}
      </main>

      {/* Modal Izin/Sakit */}
      {isIzinModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Pengajuan Izin/Sakit</h3>
            
            {izinError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">
                {izinError}
              </div>
            )}
            
            <form onSubmit={handleAjukanIzin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tanggal</label>
                <input 
                  type="date" 
                  required
                  value={izinTanggal}
                  onChange={(e) => setIzinTanggal(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Jenis</label>
                <select 
                  value={izinTipe}
                  onChange={(e) => setIzinTipe(e.target.value as 'izin' | 'sakit')}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="izin">Izin</option>
                  <option value="sakit">Sakit</option>
                </select>
              </div>

              <div className="bg-[#f0fdf4] border-2 border-[#16a34a] neo-border p-3 rounded-lg">
                <label className="block text-xs font-black text-[#15803d] uppercase mb-1">
                  📢 Dilaporkan Kepada (Instruktur Kelas)
                </label>
                <div className="text-sm font-black text-black flex items-center gap-2">
                  <span>👨‍🏫 {data?.profile?.namaInstrukturKelas || 'Instruktur Kelas / Admin LPK'}</span>
                </div>
                {data?.profile?.namaKelas && (
                  <div className="text-xs font-bold text-gray-600 mt-0.5">
                    Kelas: {data.profile.namaKelas}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Alasan</label>
                <textarea 
                  required
                  value={izinAlasan}
                  onChange={(e) => setIzinAlasan(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  rows={3}
                  placeholder="Jelaskan alasan izin/sakit..."
                ></textarea>
              </div>
              
              <div className="pt-2 text-xs text-gray-500 italic">
                * Bukti foto/surat dokter silakan dikirimkan langsung melalui WhatsApp Instruktur atau Admin LPK.
              </div>

              <div className="flex space-x-3 pt-4 border-t mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsIzinModalOpen(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-[#ffe600]"
                  disabled={izinLoading}
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 px-4 bg-blue-600 rounded-xl text-white font-bold hover:bg-blue-700"
                  disabled={izinLoading}
                >
                  {izinLoading ? 'Mengirim...' : 'Kirim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Bantuan Solusi GPS Android & iPhone */}
      {isGpsHelpOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black neo-card max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b-3 border-black pb-3">
              <div className="flex items-center gap-2 text-black font-black uppercase text-base">
                <Smartphone className="w-6 h-6 text-purple-700" />
                <h2>Solusi Error Lokasi HP Android & iPhone</h2>
              </div>
              <button 
                onClick={() => setIsGpsHelpOpen(false)}
                className="p-1 text-black hover:bg-black hover:text-white neo-border"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-bold text-gray-800 leading-relaxed">
              {/* Langkah 1: Android Chrome */}
              <div className="bg-purple-50 p-3 neo-border border-purple-300 space-y-1.5">
                <h3 className="font-black text-purple-900 uppercase text-xs flex items-center gap-1.5">
                  📱 Solusi HP Android (Google Chrome / Browser):
                </h3>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] text-gray-700">
                  <li><b>Nyalakan GPS HP</b>: Usap layar dari atas ke bawah, aktifkan tombol <b>Lokasi / GPS</b>.</li>
                  <li><b>Izinkan Akses Lokasi di Chrome</b>: Klik tombol <b>Gembok 🔒</b> atau <b>Info ℹ️</b> di samping kiri URL/alamat web di bagian atas browser Chrome Anda.</li>
                  <li>Pilih <b>Izin Situs (Site Settings)</b> ➔ <b>Lokasi (Location)</b> ➔ Ubah menjadi <b>IZINKAN (Allow)</b>.</li>
                  <li><b>Matikan Mode Hemat Baterai</b> (Baterai Saver) jika aktif karena dapat mematikan sensor GPS HP.</li>
                  <li>Kembali ke web lalu <b>Refresh/Muat Ulang Halaman</b> dan coba klik <b>Masuk Kelas</b> kembali.</li>
                </ol>
              </div>

              {/* Langkah 2: iPhone iOS Safari */}
              <div className="bg-blue-50 p-3 neo-border border-blue-300 space-y-1.5">
                <h3 className="font-black text-blue-900 uppercase text-xs flex items-center gap-1.5">
                  🍎 Solusi iPhone (Safari):
                </h3>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] text-gray-700">
                  <li>Buka <b>Pengaturan (Settings) iPhone</b> ➔ <b>Privasi & Keamanan (Privacy & Security)</b> ➔ <b>Layanan Lokasi (Location Services)</b>. Pastikan AKTIF.</li>
                  <li>Scroll ke bawah, pilih <b>Situs Web Safari (Safari Websites)</b> ➔ Pilih <b>Saat Menggunakan Pengaplikasian</b> & aktifkan <b>Lokasi Tepat (Precise Location)</b>.</li>
                  <li>Buka kembali Safari, refresh halaman lalu coba klik <b>Masuk Kelas</b>.</li>
                </ol>
              </div>

              {/* Catatan Penting HTTPS */}
              <div className="bg-amber-50 p-2.5 neo-border border-amber-300 text-[11px] text-amber-900 font-bold">
                ⚠️ <b>Penting</b>: Pastikan Anda membuka web menggunakan koneksi aman (alamat diawali <code>https://</code>). Browser Android & iPhone secara otomatis memblokir GPS jika diawali <code>http://</code> biasa.
              </div>
            </div>

            <div className="pt-3 border-t-2 border-black text-right">
              <button
                onClick={() => setIsGpsHelpOpen(false)}
                className="bg-[#ffe600] text-black font-black uppercase text-xs px-5 py-2 neo-btn"
              >
                Saya Mengerti, Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
