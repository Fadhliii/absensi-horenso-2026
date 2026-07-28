'use client';

import { useState, useEffect, useCallback } from 'react';
import { getDashboardStatsAction } from '@/app/actions/dashboard';
import { getPendingCountAction } from '@/app/actions/approval';
import { mulaiSesiAction, selesaiSesiAction, getActiveSesiInfoAction, mulaiSesiKelas1ClickAction } from '@/app/actions/sesi';
import { updateKelasLocationAction } from '@/app/actions/kelas';
import { logoutAction } from '@/app/actions/auth';
import IndonesianClock from '@/components/IndonesianClock';
import { Users, UserCheck, UserPlus, LogOut, ExternalLink, MapPin, CheckCircle2, ShieldCheck, DoorOpen, Calendar, Building2, BookOpen, UserCog, ClipboardList, Layers, Loader2, XCircle, Zap, Settings, X } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Lazy loading Recharts
const DashboardChart = dynamic(() => import('@/components/DashboardChart'), { 
  ssr: false, 
  loading: () => (
    <div className="h-64 w-full flex items-center justify-center bg-gray-50 rounded-xl border border-gray-100">
      <span className="text-gray-400 font-medium animate-pulse">Memuat Grafik...</span>
    </div>
  )
});

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [pendingMasukCount, setPendingMasukCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1-Click Buka Kelas State
  const [sesiInfo, setSesiInfo] = useState<{ active: boolean; sessionId?: string }>({ active: false });
  const [activeSesiMap, setActiveSesiMap] = useState<Record<string, { sessionId: string; remainingSeconds: number }>>({});
  const [activeKelasSearch, setActiveKelasSearch] = useState('');
  const [bukaSesiLoading, setBukaSesiLoading] = useState(false);
  const [selectedKelasIdForSession, setSelectedKelasIdForSession] = useState('');

  // Modal Set GPS Kelas Quick Action
  const [gpsModalKelas, setGpsModalKelas] = useState<{ id: string; nama_kelas: string; lat: string; lng: string; radius: string } | null>(null);
  const [savingGps, setSavingGps] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const result = await getDashboardStatsAction();
      if (result.success) {
        setData(result);
        if (result.assignedKelas?.id) {
          setSelectedKelasIdForSession(result.assignedKelas.id);
        } else if (result.allKelasList && result.allKelasList.length > 0) {
          setSelectedKelasIdForSession(result.allKelasList[0].id);
        }
      } else {
        setError(result.error || 'Terjadi kesalahan saat memuat data');
      }

      const countRes = await getPendingCountAction();
      setPendingMasukCount(countRes.count);

      const sesiRes = await getActiveSesiInfoAction();
      setSesiInfo({ active: sesiRes.active, sessionId: sesiRes.sessionId });
      setActiveSesiMap(sesiRes.activeMap || {});
    } catch (err: any) {
      setError(err.message || 'Error jaringan');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Quick Save GPS for Class
  const handleSaveGpsForKelas = async () => {
    if (!gpsModalKelas) return;
    const lat = parseFloat(gpsModalKelas.lat);
    const lng = parseFloat(gpsModalKelas.lng);
    const radius = parseInt(gpsModalKelas.radius) || 100;

    if (isNaN(lat) || isNaN(lng)) {
      alert('Koordinat Latitude dan Longitude wajib diisi!');
      return;
    }

    setSavingGps(true);
    const res = await updateKelasLocationAction(gpsModalKelas.id, lat, lng, radius);
    if (res.success) {
      alert(`📍 Titik Lokasi GPS untuk ${gpsModalKelas.nama_kelas} BERHASIL DISIMPAN & DITERAPKAN!`);
      setGpsModalKelas(null);
      fetchData();
    } else {
      alert('Gagal menyimpan lokasi: ' + res.error);
    }
    setSavingGps(false);
  };

  const handleDetectGpsForModal = () => {
    if (!navigator.geolocation) {
      alert('Browser Anda tidak mendukung GPS.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsModalKelas(prev => prev ? {
          ...prev,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6)
        } : null);
      },
      (err) => alert('Gagal mendeteksi lokasi GPS: ' + err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // 1-Click Buka Presensi Kelas (Menggunakan Koordinat Kelas yang ditentukan Admin)
  const handle1ClickBukaSesiKelas = async (targetKelasId: string) => {
    if (!targetKelasId) return;
    setBukaSesiLoading(true);

    const res = await mulaiSesiKelas1ClickAction(targetKelasId);
    if (res.error) {
      alert('⚠️ ' + res.error);
    } else {
      setSesiInfo({ active: true, sessionId: res.sessionId });
      alert(`🚀 BERHASIL! Presensi untuk ${res.namaKelas || 'Kelas'} telah DIBUKA (1-Click). Siswa kelas tersebut sudah bisa menekan tombol Masuk Kelas.`);
      fetchData();
    }
    setBukaSesiLoading(false);
  };

  // 1-Click Tutup Presensi Kelas Spesifik
  const handle1ClickTutupSesiKelas = async (sessionIdToClose: string, namaKelas: string) => {
    if (!sessionIdToClose) return;
    if (!confirm(`Apakah Anda yakin ingin menutup presensi untuk ${namaKelas}?`)) return;

    setBukaSesiLoading(true);
    const res = await selesaiSesiAction(sessionIdToClose);
    if (res.error) {
      alert('Gagal Tutup Presensi: ' + res.error);
    } else {
      alert(`Presensi untuk ${namaKelas} telah DITUTUP.`);
      fetchData();
    }
    setBukaSesiLoading(false);
  };

  // 1-Click Buka Kelas Handler (Gps Manual / Current Position)
  const handle1ClickBukaKelas = async () => {
    if (!navigator.geolocation) {
      alert('Browser Anda tidak mendukung GPS!');
      return;
    }

    setBukaSesiLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const formData = new FormData();
        formData.append('latitude', pos.coords.latitude.toString());
        formData.append('longitude', pos.coords.longitude.toString());
        formData.append('radius', '50');
        formData.append('interval', '10');

        const res = await mulaiSesiAction(formData);
        if (res.error) {
          alert('Gagal Buka Kelas: ' + res.error);
        } else {
          setSesiInfo({ active: true, sessionId: res.sessionId });
          alert('BERHASIL! Presensi lokasi GPS instan telah DIBUKA.');
          fetchData();
        }
        setBukaSesiLoading(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        alert('Gagal mendeteksi lokasi GPS. Harap izinkan akses lokasi (Location Permission) browser!');
        setBukaSesiLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // 1-Click Tutup Kelas Handler (Global)
  const handle1ClickTutupKelas = async () => {
    if (!sesiInfo.sessionId) return;
    if (!confirm('Apakah Anda yakin ingin menutup semua sesi kelas aktif?')) return;

    setBukaSesiLoading(true);
    const res = await selesaiSesiAction(sesiInfo.sessionId);
    if (res.error) {
      alert('Gagal Tutup Kelas: ' + res.error);
    } else {
      setSesiInfo({ active: false });
      alert('Sesi Presensi telah DITUTUP.');
      fetchData();
    }
    setBukaSesiLoading(false);
  };

  const activeSesiCount = Object.keys(activeSesiMap).length;

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-screen bg-[#f4f4f0] font-sans pb-12">
      
      {/* Header */}
      <header className="bg-white border-b-4 border-black mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
          <div className="flex items-center justify-between">
            <h1 className="text-lg sm:text-2xl font-black text-black tracking-tight uppercase flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-purple-700" />
              {data?.role === 'instruktur' ? 'Portal Instruktur / Guru' : 'Dashboard Admin'}
            </h1>
            <form action={logoutAction} className="sm:hidden">
              <button className="flex items-center text-black bg-white hover:bg-black hover:text-white px-2 py-1 neo-btn text-xs font-black uppercase">
                <LogOut className="w-3.5 h-3.5 mr-1" /> Logout
              </button>
            </form>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            <IndonesianClock className="w-full sm:w-auto" />
            <form action={logoutAction} className="hidden sm:block">
              <button className="flex items-center text-black hover:bg-black hover:text-white px-3 py-1.5 neo-border text-sm font-black transition-colors uppercase">
                <LogOut className="w-4 h-4 mr-1" /> Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
        
        {loading ? (
          <div className="flex justify-center py-20"><span className="animate-pulse text-gray-500 font-bold">Memuat Dashboard...</span></div>
        ) : error ? (
          <div className="flex justify-center py-20">
            <div className="bg-[#ff003c] text-white p-6 neo-card max-w-md text-center">
              <h2 className="text-xl font-black uppercase mb-2">Terjadi Kesalahan</h2>
              <p className="font-bold">{error}</p>
            </div>
          </div>
        ) : data && (
          <div className="space-y-6">            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* BANNER 1: PANEL KONTROL KELAS MULTI-CLASS (Bisa Muat Banyak Kelas) */}
              <div className="md:col-span-2 bg-white neo-card p-5 border-4 border-black space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b-3 border-black pb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <DoorOpen className="w-6 h-6 text-purple-700" />
                        <h2 className="text-base font-black text-black uppercase tracking-tight">
                          Kontrol Presensi Kelas (1-Klik Per Kelas)
                        </h2>
                        {activeSesiCount > 0 ? (
                          <span className="bg-green-700 text-white text-[11px] font-black px-2.5 py-0.5 rounded border border-black animate-pulse">
                            🟢 {activeSesiCount} KELAS AKTIF
                          </span>
                        ) : (
                          <span className="bg-gray-200 text-gray-700 text-[11px] font-black px-2.5 py-0.5 rounded border border-black">
                            ⚪ BELUM ADA KELAS BUKA
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-gray-600 mt-0.5">
                        Buka & tutup presensi 1-klik untuk setiap kelas secara mandiri menggunakan lokasi koordinat per kelas.
                      </p>
                    </div>

                    {/* Search Bar & Global GPS Fallback Button */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input
                        type="text"
                        placeholder="🔍 Cari Kelas..."
                        value={activeKelasSearch}
                        onChange={(e) => setActiveKelasSearch(e.target.value)}
                        className="neo-input px-3 py-1.5 text-xs font-bold bg-gray-50 text-black flex-1 sm:w-40"
                      />
                      <button
                        onClick={handle1ClickBukaKelas}
                        disabled={bukaSesiLoading}
                        className="bg-[#00f0ff] hover:bg-[#00d8e6] text-black px-3 py-1.5 neo-btn text-xs font-black uppercase shrink-0 flex items-center gap-1"
                        title="Buka Presensi Menggunakan Sinyal GPS HP Saat Ini"
                      >
                        <MapPin className="w-4 h-4 text-black" /> GPS Instan
                      </button>
                    </div>
                  </div>

                  {/* GRID DAFTAR KELAS - DAPAT MEMUAT SANGAT BANYAK KELAS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                    {data?.allKelasList && data.allKelasList.length > 0 ? (
                      data.allKelasList
                        .filter((k: any) => k.nama_kelas.toLowerCase().includes(activeKelasSearch.toLowerCase()))
                        .map((k: any) => {
                          const activeSesiData = activeSesiMap[k.id];
                          const isKelasActive = !!activeSesiData;
                          const isMyClass = data?.assignedKelas?.id === k.id;

                          return (
                            <div 
                              key={k.id}
                              className={`p-3 neo-card border-2 border-black flex flex-col justify-between space-y-2.5 transition-all ${
                                isKelasActive ? 'bg-[#74ee15] border-black' : isMyClass ? 'bg-[#fffde7]' : 'bg-white'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-black text-sm text-black uppercase flex items-center gap-1">
                                    🏫 {k.nama_kelas}
                                    {isMyClass && <span className="text-[9px] bg-purple-900 text-white px-1.5 py-0.5 rounded font-black uppercase">Anda Guru</span>}
                                  </span>
                                  {isKelasActive ? (
                                    <span className="bg-green-900 text-white text-[9px] font-black px-2 py-0.5 rounded border border-black animate-pulse">
                                      🟢 AKTIF
                                    </span>
                                  ) : (
                                    <span className="bg-gray-200 text-gray-600 text-[9px] font-black px-2 py-0.5 rounded border border-gray-400">
                                      🔴 TUTUP
                                    </span>
                                  )}
                                </div>

                                <p className="text-[11px] font-bold text-gray-700 mt-0.5">
                                  👥 {k.total_siswa} Siswa Terdaftar
                                </p>

                                {/* Daftar Guru / Instruktur Pengajar Kelas */}
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  <span className="text-[10px] font-black text-black">👨‍🏫 Pengajar:</span>
                                  {k.instruktur_list && k.instruktur_list.length > 0 ? (
                                    k.instruktur_list.map((ins: any) => {
                                      const isMe = data?.userId === ins.id;
                                      return (
                                        <span 
                                          key={ins.id} 
                                          className={`text-[9px] px-1.5 py-0.5 rounded font-black border border-black ${
                                            isMe ? 'bg-purple-900 text-white' : 'bg-blue-100 text-blue-900'
                                          }`}
                                        >
                                          {ins.name} {isMe && '⭐(Anda)'}
                                        </span>
                                      );
                                    })
                                  ) : (
                                    <span className="text-[10px] text-gray-500 italic">Belum ditugaskan</span>
                                  )}
                                </div>

                                {k.lokasi_lat !== null && k.lokasi_lat !== undefined && k.lokasi_lng !== null && k.lokasi_lng !== undefined ? (
                                  <div className="flex items-center justify-between gap-1 mt-1 bg-white/80 p-1.5 border border-black/30 rounded text-[10px] font-bold">
                                    <span>📍 {k.lokasi_lat}, {k.lokasi_lng} ({k.radius_meter || 100}m)</span>
                                    <button
                                      onClick={() => setGpsModalKelas({
                                        id: k.id,
                                        nama_kelas: k.nama_kelas,
                                        lat: String(k.lokasi_lat || ''),
                                        lng: String(k.lokasi_lng || ''),
                                        radius: String(k.radius_meter || 100)
                                      })}
                                      className="text-black hover:text-purple-700 underline font-black text-[10px] shrink-0"
                                    >
                                      ⚙️ Edit
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between gap-1 mt-1 bg-red-100 p-1.5 neo-border border-red-400 text-[10px] font-bold text-red-900">
                                    <span>⚠️ Belum Set GPS</span>
                                    <button
                                      onClick={() => setGpsModalKelas({
                                        id: k.id,
                                        nama_kelas: k.nama_kelas,
                                        lat: '',
                                        lng: '',
                                        radius: '100'
                                      })}
                                      className="bg-black text-white px-1.5 py-0.5 rounded font-black text-[9px] uppercase hover:bg-purple-900"
                                    >
                                      📍 Set GPS
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div>
                                {isKelasActive ? (
                                  <button
                                    onClick={() => handle1ClickTutupSesiKelas(activeSesiData.sessionId, k.nama_kelas)}
                                    disabled={bukaSesiLoading}
                                    className="w-full bg-[#ff003c] hover:bg-red-700 text-white font-black py-2 px-3 neo-btn text-[11px] uppercase flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                                  >
                                    {bukaSesiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                                    <span>TUTUP PRESENSI</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handle1ClickBukaSesiKelas(k.id)}
                                    disabled={bukaSesiLoading}
                                    className="w-full bg-[#00e676] hover:bg-green-500 text-black font-black py-2 px-3 neo-btn text-[11px] uppercase flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                                  >
                                    {bukaSesiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-black" />}
                                    <span>🚀 BUKA PRESENSI (1-KLIK)</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <div className="col-span-full py-8 text-center text-xs font-bold text-gray-500">
                        Belum ada data kelas yang terdaftar. Silakan tambahkan di menu Master Kelas.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* BANNER 2: PERSETUJUAN MASUK KELAS (SETUJUI BERJAMAAH) */}
              <div className="md:col-span-1 bg-[#d1fae5] neo-card p-5 border-4 border-black flex flex-col justify-between space-y-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white neo-border flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-7 h-7 text-emerald-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-black text-black uppercase tracking-tight">Persetujuan Masal</h2>
                        {pendingMasukCount > 0 ? (
                          <span className="bg-[#ff003c] text-white text-[11px] font-black px-2.5 py-0.5 rounded-full neo-border animate-pulse flex items-center gap-1 shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                            {pendingMasukCount} SISWA MASUK
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded">
                            Semua Disetujui
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-gray-700 mt-0.5">
                        Setujui presensi banyak siswa sekaligus setelah mereka menekan tombol Masuk Kelas.
                      </p>
                    </div>
                  </div>
                </div>

                <Link 
                  href="/admin/approval-absensi"
                  className="w-full bg-[#ffe600] hover:bg-[#ebd300] text-black font-black py-3.5 px-4 neo-btn text-xs uppercase flex items-center justify-center gap-2 shadow-md active:scale-95 relative"
                >
                  <ShieldCheck className="w-5 h-5 text-black" />
                  <span className="text-sm font-black tracking-wide">PERSETUJUAN BERJAMAAH</span>
                  {pendingMasukCount > 0 && (
                    <span className="bg-[#ff003c] text-white text-xs font-black px-2 py-0.5 rounded-full neo-border shadow-sm ml-1">
                      {pendingMasukCount}
                    </span>
                  )}
                </Link>
              </div>

            </div>           

            {/* RINGKASAN MENU TERBAGI KATEGORI */}
            {data.role === 'admin' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Kategori 1: Presensi & Sesi Kelas */}
                <div className="bg-white neo-card p-5 space-y-3">
                  <div className="flex items-center gap-2 border-b-3 border-black pb-2 mb-3">
                    <DoorOpen className="w-5 h-5 text-purple-700" />
                    <h3 className="text-xs font-black text-black uppercase tracking-wider">1. Presensi & Sesi Kelas</h3>
                  </div>
                  <div className="space-y-2">
                    <Link href="/admin/approval-absensi" className="bg-[#00f0ff] hover:bg-[#00d8e6] text-black p-2.5 neo-btn text-xs font-black uppercase flex items-center justify-between">
                      <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Approval Masuk Kelas</span>
                      {pendingMasukCount > 0 && <span className="bg-[#ff003c] text-white px-2 py-0.5 text-[10px] font-black rounded-full">{pendingMasukCount}</span>}
                    </Link>

                    <Link href="/admin/sesi" className="bg-[#ffe600] hover:bg-[#e6cf00] text-black p-2.5 neo-btn text-xs font-black uppercase flex items-center justify-between">
                      <span className="flex items-center gap-2"><DoorOpen className="w-4 h-4" /> Pengaturan Sesi & Lokasi</span>
                    </Link>

                    <Link href="/admin/rekap" className="bg-[#74ee15] hover:bg-[#62cb12] text-black p-2.5 neo-btn text-xs font-black uppercase flex items-center justify-between">
                      <span className="flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Rekap Grid Presensi</span>
                    </Link>

                    <Link href="/admin/izin" className="bg-[#ff00c8] hover:bg-[#d600a8] text-white p-2.5 neo-btn text-xs font-black uppercase flex items-center justify-between">
                      <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Permohonan Izin / Sakit</span>
                      {data.stats.pendingIzin > 0 && <span className="bg-[#ff003c] text-white px-2 py-0.5 text-[10px] font-black rounded-full">{data.stats.pendingIzin}</span>}
                    </Link>
                  </div>
                </div>

                {/* Kategori 2: Data Master & Akun Siswa */}
                <div className="bg-white neo-card p-5 space-y-3">
                  <div className="flex items-center gap-2 border-b-3 border-black pb-2 mb-3">
                    <Users className="w-5 h-5 text-amber-600" />
                    <h3 className="text-xs font-black text-black uppercase tracking-wider">2. Data Master & Siswa</h3>
                  </div>
                  <div className="space-y-2">
                    <Link href="/admin/siswa" className="bg-[#ff9900] hover:bg-[#e68a00] text-black p-2.5 neo-btn text-xs font-black uppercase flex items-center justify-between">
                      <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Data Siswa LPK</span>
                    </Link>

                    <Link href="/admin/approval" className="bg-[#ffe600] hover:bg-[#e6cf00] text-black p-2.5 neo-btn text-xs font-black uppercase flex items-center justify-between">
                      <span className="flex items-center gap-2"><UserPlus className="w-4 h-4" /> Approval Registrasi Akun</span>
                      {data.stats.pendingApproval > 0 && <span className="bg-[#ff003c] text-white px-2 py-0.5 text-[10px] font-black rounded-full">{data.stats.pendingApproval}</span>}
                    </Link>

                    <Link href="/admin/perusahaan" className="bg-[#00f0ff] hover:bg-[#00d8e6] text-black p-2.5 neo-btn text-xs font-black uppercase flex items-center justify-between">
                      <span className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Perusahaan Mitra</span>
                    </Link>

                    <Link href="/admin/kelas" className="bg-[#4deeea] hover:bg-[#3cdad6] text-black p-2.5 neo-btn text-xs font-black uppercase flex items-center justify-between">
                      <span className="flex items-center gap-2"><Layers className="w-4 h-4" /> Master Kelas</span>
                    </Link>
                  </div>
                </div>

                {/* Kategori 3: Pengaturan & Program Tambahan */}
                <div className="bg-white neo-card p-5 space-y-3">
                  <div className="flex items-center gap-2 border-b-3 border-black pb-2 mb-3">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    <h3 className="text-xs font-black text-black uppercase tracking-wider">3. Program & Akun</h3>
                  </div>
                  <div className="space-y-2">
                    <Link href="/admin/soft-skill" className="bg-[#74ee15] hover:bg-[#62cb12] text-black p-2.5 neo-btn text-xs font-black uppercase flex items-center justify-between">
                      <span className="flex items-center gap-2"><BookOpen className="w-4 h-4" /> Kelas Soft Skill</span>
                    </Link>

                    <Link href="/admin/users" className="bg-black text-white p-2.5 neo-btn text-xs font-black uppercase flex items-center justify-between hover:bg-gray-800">
                      <span className="flex items-center gap-2"><UserCog className="w-4 h-4" /> Manajemen User / Instruktur</span>
                    </Link>

                    {data.isSesiAktif && (
                      <Link href="/admin/sesi/aktif" target="_blank" className="bg-[#ff003c] text-white p-2.5 neo-btn text-xs font-black uppercase flex items-center justify-between">
                        <span className="flex items-center gap-2"><ExternalLink className="w-4 h-4" /> Tampilan Sesi Aktif</span>
                      </Link>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              /* MENU RAPI KHUSUS INSTRUKTUR (TANPA APPROVAL DUA KALI) */
              <div className="bg-white neo-card p-5 space-y-4">
                <div className="flex items-center gap-2 border-b-3 border-black pb-2">
                  <BookOpen className="w-5 h-5 text-purple-700" />
                  <h3 className="text-sm font-black text-black uppercase tracking-wider">Menu Operasional Instruktur / Guru</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Link href={data.assignedKelas ? `/admin/rekap?kelasId=${data.assignedKelas.id}` : '/admin/rekap'} className="bg-[#74ee15] hover:bg-[#62cb12] text-black p-3.5 neo-btn text-xs font-black uppercase flex items-center justify-between shadow-sm">
                    <span className="flex items-center gap-2"><ClipboardList className="w-5 h-5" /> Rekap Grid Presensi</span>
                  </Link>

                  <Link href="/admin/izin" className="bg-[#ff00c8] hover:bg-[#d600a8] text-white p-3.5 neo-btn text-xs font-black uppercase flex items-center justify-between shadow-sm">
                    <span className="flex items-center gap-2"><Calendar className="w-5 h-5" /> Permohonan Izin / Sakit</span>
                    {data.stats.pendingIzin > 0 && <span className="bg-[#ff003c] text-white px-2 py-0.5 text-[10px] font-black rounded-full">{data.stats.pendingIzin}</span>}
                  </Link>

                  <Link href="/admin/soft-skill" className="bg-[#ffe600] hover:bg-[#e6cf00] text-black p-3.5 neo-btn text-xs font-black uppercase flex items-center justify-between shadow-sm">
                    <span className="flex items-center gap-2"><BookOpen className="w-5 h-5" /> Kelas Soft Skill</span>
                  </Link>
                </div>
              </div>
            )}

            {/* STATISTIK CARDS */}
            {data.role === 'admin' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-[#4deeea] neo-card p-6 flex items-center">
                  <div className="w-14 h-14 bg-white neo-border flex items-center justify-center mr-4 shrink-0">
                    <Users className="w-7 h-7 text-black" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-black uppercase mb-1">Total Siswa Aktif</p>
                    <p className="text-3xl font-black text-black">{data.stats.totalSiswa}</p>
                  </div>
                </div>
                
                <div className="bg-[#74ee15] neo-card p-6 flex items-center">
                  <div className="w-14 h-14 bg-white neo-border flex items-center justify-center mr-4 shrink-0">
                    <UserCheck className="w-7 h-7 text-black" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-black uppercase mb-1">Hadir Hari Ini</p>
                    <p className="text-3xl font-black text-black">{data.stats.hadirHariIni}</p>
                  </div>
                </div>

                <div className="bg-[#ffe700] neo-card p-6 flex items-center">
                  <div className="w-14 h-14 bg-white neo-border flex items-center justify-center mr-4 shrink-0">
                    <CheckCircle2 className="w-7 h-7 text-black" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-black uppercase mb-1">Pending Masuk Kelas</p>
                    <p className="text-3xl font-black text-black">{pendingMasukCount}</p>
                  </div>
                </div>
              </div>
            ) : (
              /* CARDS KHUSUS INSTRUKTUR: ONLY 2 CARDS (TOTAL MURID KELAS X & PENDING MASUK KELAS) */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-[#00f0ff] neo-card p-6 flex items-center">
                  <div className="w-14 h-14 bg-white neo-border flex items-center justify-center mr-4 shrink-0">
                    <Users className="w-7 h-7 text-black" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-black uppercase mb-1">
                      Total Murid {data.assignedKelas ? `(${data.assignedKelas.nama_kelas})` : '(Belum Ditugaskan)'}
                    </p>
                    <p className="text-3xl font-black text-black">{data.assignedKelas?.total_siswa || 0} Siswa</p>
                  </div>
                </div>

                <div className="bg-[#ffe600] neo-card p-6 flex items-center">
                  <div className="w-14 h-14 bg-white neo-border flex items-center justify-center mr-4 shrink-0">
                    <CheckCircle2 className="w-7 h-7 text-black" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-black uppercase mb-1">Pending Masuk Kelas</p>
                    <p className="text-3xl font-black text-black">{pendingMasukCount} Siswa</p>
                  </div>
                </div>
              </div>
            )}

            {/* Layout Bawah: Grafik (Admin Only) & Log Pemindaian */}
            <div className={`grid grid-cols-1 ${data.role === 'admin' ? 'lg:grid-cols-3' : 'grid-cols-1'} gap-8`}>
              
              {/* Grafik Mingguan - HANYA UNTUK ADMIN */}
              {data.role === 'admin' && (
                <div className="lg:col-span-2 bg-[#ffffff] neo-card p-6">
                  <h3 className="text-lg font-black text-black uppercase mb-6 border-b-4 border-black pb-2 inline-block">
                    Grafik Kehadiran (7 Hari)
                  </h3>
                  <div className="mt-4">
                    <DashboardChart data={data.chartData} />
                  </div>
                </div>
              )}

              {/* Log Pemindaian Terakhir */}
              <div className={`${data.role === 'admin' ? '' : 'w-full'} bg-[#f000ff] neo-card p-6 flex flex-col h-full`}>
                <div className="flex justify-between items-center mb-6 bg-white p-3 neo-border">
                  <h3 className="text-sm font-black text-black uppercase">Aktivitas Presensi Terakhir</h3>
                  {data.role === 'admin' && (
                    <Link href="/admin/laporan" className="text-[11px] font-black text-black hover:bg-black hover:text-white px-2 py-1 neo-border flex items-center uppercase">
                      Eksport <ExternalLink className="w-3 h-3 ml-1" />
                    </Link>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto pr-2 bg-white neo-border p-4 max-h-[350px]">
                  {data.logAbsensi.length === 0 ? (
                    <p className="text-black text-xs text-center mt-10 font-black uppercase">Belum ada aktivitas.</p>
                  ) : (
                    <ul className="space-y-4">
                      {data.logAbsensi.map((log: any) => (
                        <li key={log.id} className="border-b-4 border-black pb-3 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs font-black text-black">{log.users?.name}</p>
                              <p className="text-[10px] text-gray-700 font-bold uppercase">{formatDate(log.waktu_scan)} • {formatTime(log.waktu_scan)}</p>
                            </div>
                            
                            {/* Badges Status */}
                            {log.status === 'hadir' && (
                              <span className="inline-flex items-center text-[10px] font-black px-2 py-0.5 bg-[#74ee15] text-black uppercase neo-border">
                                Hadir
                              </span>
                            )}
                            {log.status === 'telat' && (
                              <span className="inline-flex items-center text-[10px] font-black px-2 py-0.5 bg-yellow-400 text-black uppercase neo-border">
                                Telat
                              </span>
                            )}
                            {['pending_hadir', 'pending_telat'].includes(log.status) && (
                              <span className="inline-flex items-center text-[10px] font-black px-2 py-0.5 bg-amber-200 text-amber-900 uppercase neo-border">
                                Pending
                              </span>
                            )}
                            {log.status === 'ditolak_lokasi' && (
                              <div className="flex flex-col items-end">
                                <span className="inline-flex items-center text-[10px] font-black px-2 py-0.5 bg-[#ff003c] text-white uppercase neo-border mb-1">
                                  Ditolak
                                </span>
                                <span className="text-[10px] text-black font-bold flex items-center uppercase">
                                  <MapPin className="w-3 h-3 mr-0.5" /> {log.jarak_meter}m
                                </span>
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                
              </div>

            </div>

          </div>
        )}
      </main>

      {/* MODAL SET LOKASI GPS KELAS QUICK ACTION */}
      {gpsModalKelas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setGpsModalKelas(null)}></div>
          <div className="relative z-50 w-full max-w-md bg-white neo-card shadow-none space-y-4 p-6 border-4 border-black">
            <div className="flex justify-between items-center border-b-3 border-black pb-3">
              <h3 className="text-sm font-black text-black uppercase flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-700" />
                <span>Atur Lokasi GPS: {gpsModalKelas.nama_kelas}</span>
              </h3>
              <button onClick={() => setGpsModalKelas(null)} className="p-1 hover:bg-black hover:text-white neo-border">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-bold">
              {/* Opsi 1: Pilih dari Preset Lokasi Tersimpan */}
              {data?.lokasiPresets && data.lokasiPresets.length > 0 && (
                <div className="p-3 bg-[#fffde7] neo-border space-y-1.5">
                  <label className="block text-[11px] font-black text-black uppercase">
                    ⭐ Pilih dari Preset Lokasi Tersimpan:
                  </label>
                  <select
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const preset = data.lokasiPresets.find((p: any) => p.id === selectedId);
                      if (preset) {
                        setGpsModalKelas(prev => prev ? {
                          ...prev,
                          lat: String(preset.latitude),
                          lng: String(preset.longitude),
                          radius: String(preset.radius_meter || 100)
                        } : null);
                      }
                    }}
                    className="w-full neo-input p-2 text-xs font-bold bg-white"
                  >
                    <option value="">-- Pilih Lokasi Preset --</option>
                    {data.lokasiPresets.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        🏢 {p.nama_lokasi} ({p.latitude}, {p.longitude})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Opsi 2: Ambil GPS HP */}
              <button
                type="button"
                onClick={handleDetectGpsForModal}
                className="w-full bg-[#74ee15] hover:bg-[#60d60e] text-black font-black py-2.5 px-3 neo-btn text-xs uppercase flex items-center justify-center gap-2"
              >
                🎯 Gunakan Posisi GPS HP Saya Saat Ini
              </button>

              {/* Opsi 3: Input Manual */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-black text-gray-700 uppercase mb-0.5">Latitude *</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="-6.200000"
                    value={gpsModalKelas.lat}
                    onChange={(e) => setGpsModalKelas({...gpsModalKelas, lat: e.target.value})}
                    className="w-full neo-input p-2 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-700 uppercase mb-0.5">Longitude *</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="106.800000"
                    value={gpsModalKelas.lng}
                    onChange={(e) => setGpsModalKelas({...gpsModalKelas, lng: e.target.value})}
                    className="w-full neo-input p-2 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-700 uppercase mb-0.5">Radius Toleransi (Meter)</label>
                <input
                  type="number"
                  min="10"
                  max="5000"
                  value={gpsModalKelas.radius}
                  onChange={(e) => setGpsModalKelas({...gpsModalKelas, radius: e.target.value})}
                  className="w-full neo-input p-2 text-xs font-bold"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t-2 border-black">
              <button
                onClick={handleSaveGpsForKelas}
                disabled={savingGps}
                className="flex-1 bg-[#ffe600] text-black font-black py-2.5 text-xs neo-btn uppercase"
              >
                {savingGps ? 'Menyimpan...' : 'Simpan Lokasi Kelas'}
              </button>
              <button
                type="button"
                onClick={() => setGpsModalKelas(null)}
                className="bg-gray-200 text-black font-black px-4 py-2.5 text-xs neo-btn uppercase"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
