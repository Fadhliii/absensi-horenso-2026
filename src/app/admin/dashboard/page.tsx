'use client';

import { useState, useEffect, useCallback } from 'react';
import { getDashboardStatsAction } from '@/app/actions/dashboard';
import { getPendingCountAction } from '@/app/actions/approval';
import { logoutAction } from '@/app/actions/auth';
import IndonesianClock from '@/components/IndonesianClock';
import { Users, UserCheck, UserPlus, LogOut, ExternalLink, MapPin, CheckCircle2, ShieldCheck, DoorOpen, Calendar, Building2, BookOpen, UserCog, ClipboardList, Layers } from 'lucide-react';
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

  const fetchData = useCallback(async () => {
    try {
      const result = await getDashboardStatsAction();
      if (result.success) {
        setData(result);
      } else {
        setError(result.error || 'Terjadi kesalahan saat memuat data');
      }

      const countRes = await getPendingCountAction();
      setPendingMasukCount(countRes.count);
    } catch (err: any) {
      setError(err.message || 'Error jaringan');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
              <ShieldCheck className="w-6 h-6 text-purple-700" /> Dashboard Admin
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
            
            {/* HERO BANNER: APPROVAL ABSENSI MASUK KELAS */}
            <div className="bg-[#00f0ff] neo-card p-5 border-4 border-black flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#ffe600] neo-border flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-7 h-7 text-black" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-black uppercase tracking-tight">Persetujuan Masuk Kelas (Setujui Berjamaah)</h2>
                    {pendingMasukCount > 0 && (
                      <span className="bg-[#ff003c] text-white text-xs font-black px-2 py-0.5 rounded-full neo-border animate-pulse">
                        {pendingMasukCount} PENDING
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-gray-800">
                    Siswa menekan &quot;Masuk Kelas&quot; di HP mereka. Instruktur/Admin menyetujui kehadiran siswa secara langsung di sini.
                  </p>
                </div>
              </div>
              <Link 
                href="/admin/approval-absensi"
                className="w-full md:w-auto bg-[#ffe600] hover:bg-[#ebd300] text-black font-black px-6 py-3 neo-btn text-xs uppercase flex items-center justify-center gap-2 shadow-lg shrink-0"
              >
                <span>Buka Persetujuan Masal ({pendingMasukCount})</span>
                <CheckCircle2 className="w-4 h-4" />
              </Link>
            </div>

            {/* RINGKASAN MENU TERBAGI KATEGORI */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* Kategori 1: Presensi & Kelas Hari Ini */}
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
                    <span className="flex items-center gap-2"><DoorOpen className="w-4 h-4" /> Buka Sesi Kelas & GPS</span>
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
              {data.role === 'admin' ? (
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
              ) : (
                <div className="bg-white neo-card p-5 space-y-3">
                  <div className="flex items-center gap-2 border-b-3 border-black pb-2 mb-3">
                    <BookOpen className="w-5 h-5 text-green-600" />
                    <h3 className="text-xs font-black text-black uppercase tracking-wider">2. Kegiatan Pelatihan</h3>
                  </div>
                  <div className="space-y-2">
                    <Link href="/admin/soft-skill" className="bg-[#74ee15] hover:bg-[#62cb12] text-black p-2.5 neo-btn text-xs font-black uppercase flex items-center justify-between">
                      <span className="flex items-center gap-2"><BookOpen className="w-4 h-4" /> Kelas Soft Skill</span>
                    </Link>
                  </div>
                </div>
              )}

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

                  {data.role === 'admin' && (
                    <Link href="/admin/users" className="bg-black text-white p-2.5 neo-btn text-xs font-black uppercase flex items-center justify-between hover:bg-gray-800">
                      <span className="flex items-center gap-2"><UserCog className="w-4 h-4" /> Manajemen User / Instruktur</span>
                    </Link>
                  )}

                  {data.isSesiAktif && (
                    <Link href="/admin/sesi/aktif" target="_blank" className="bg-[#ff003c] text-white p-2.5 neo-btn text-xs font-black uppercase flex items-center justify-between">
                      <span className="flex items-center gap-2"><ExternalLink className="w-4 h-4" /> Tampilan Sesi Aktif</span>
                    </Link>
                  )}
                </div>
              </div>

            </div>

            {/* STATISTIK CARDS */}
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

            {/* Layout Bawah: Grafik & Log Pemindaian */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Grafik Mingguan */}
              <div className="lg:col-span-2 bg-[#ffffff] neo-card p-6">
                <h3 className="text-lg font-black text-black uppercase mb-6 border-b-4 border-black pb-2 inline-block">
                  Grafik Kehadiran (7 Hari)
                </h3>
                <div className="mt-4">
                  <DashboardChart data={data.chartData} />
                </div>
              </div>

              {/* Log Pemindaian Terakhir */}
              <div className="bg-[#f000ff] neo-card p-6 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6 bg-white p-3 neo-border">
                  <h3 className="text-sm font-black text-black uppercase">Aktivitas Terakhir</h3>
                  <Link href="/admin/laporan" className="text-[11px] font-black text-black hover:bg-black hover:text-white px-2 py-1 neo-border flex items-center uppercase">
                    Eksport <ExternalLink className="w-3 h-3 ml-1" />
                  </Link>
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
    </div>
  );
}
