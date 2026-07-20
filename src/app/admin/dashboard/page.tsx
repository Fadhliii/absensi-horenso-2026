'use client';

import { useState, useEffect, useCallback } from 'react';
import { getDashboardStatsAction } from '@/app/actions/dashboard';
import { logoutAction } from '@/app/actions/auth';
import { Users, UserCheck, UserPlus, LogOut, ExternalLink, MapPin, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Lazy loading komponen Recharts agar halaman pertama dimuat seketika tanpa menunggu library grafik
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
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const result = await getDashboardStatsAction();
    if (result.success) {
      setData(result);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Format jam helper
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-screen bg-[#f4f4f0] font-sans">
      
      {/* Header */}
      <header className="bg-white border-b-4 border-black mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <h1 className="text-2xl font-black text-black tracking-tight uppercase">Dashboard Admin</h1>
          <form action={logoutAction}>
            <button className="flex items-center text-black hover:bg-black hover:text-white px-3 py-1 neo-border text-sm font-black transition-colors uppercase">
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {loading ? (
          <div className="flex justify-center py-20"><span className="animate-pulse text-gray-500">Memuat Data...</span></div>
        ) : data && (
          <div className="space-y-6">
            
            {/* Quick Menu */}
            <div className="flex flex-wrap gap-4 mb-6">
              <Link href="/admin/approval" className="bg-white text-black px-4 py-2 neo-btn shadow-none active:translate-x-1 active:translate-y-1">Menu Approval</Link>
              <Link href="/admin/siswa" className="bg-white text-black px-4 py-2 neo-btn shadow-none active:translate-x-1 active:translate-y-1">Data Siswa</Link>
              <Link href="/admin/perusahaan" className="bg-white text-black px-4 py-2 neo-btn shadow-none active:translate-x-1 active:translate-y-1">Data Perusahaan</Link>
              <Link href="/admin/sesi" className="bg-[#4deeea] text-black px-4 py-2 neo-btn shadow-none active:translate-x-1 active:translate-y-1">Buka Sesi Kelas</Link>
              <Link href="/admin/sesi/aktif" target="_blank" className="bg-[#74ee15] text-black px-4 py-2 neo-btn shadow-none active:translate-x-1 active:translate-y-1 flex items-center" title="Link Dedicated untuk menampilkan QR Sesi Aktif yang bisa digunakan oleh Guru lain">
                <ExternalLink className="w-4 h-4 mr-1" /> Sesi Aktif (QR)
              </Link>
              <Link href="/admin/rekap" className="bg-[#ffe700] text-black px-4 py-2 neo-btn shadow-none active:translate-x-1 active:translate-y-1 flex items-center">
                Rekap Grid
              </Link>
            </div>

            {/* Statistik Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              
              <div className="bg-[#4deeea] neo-card p-6 flex items-center">
                <div className="w-14 h-14 bg-white neo-border flex items-center justify-center mr-4">
                  <Users className="w-7 h-7 text-black" />
                </div>
                <div>
                  <p className="text-sm font-black text-black uppercase mb-1">Total Siswa Aktif</p>
                  <p className="text-4xl font-black text-black">{data.stats.totalSiswa}</p>
                </div>
              </div>
              
              <div className="bg-[#74ee15] neo-card p-6 flex items-center">
                <div className="w-14 h-14 bg-white neo-border flex items-center justify-center mr-4">
                  <UserCheck className="w-7 h-7 text-black" />
                </div>
                <div>
                  <p className="text-sm font-black text-black uppercase mb-1">Hadir Hari Ini</p>
                  <p className="text-4xl font-black text-black">{data.stats.hadirHariIni}</p>
                </div>
              </div>

              <div className="bg-[#ffe700] neo-card p-6 flex items-center relative overflow-hidden group hover:-translate-y-1 transition-transform">
                <div className="w-14 h-14 bg-white neo-border flex items-center justify-center mr-4">
                  <UserPlus className="w-7 h-7 text-black" />
                </div>
                <div>
                  <p className="text-sm font-black text-black uppercase mb-1">Pending Approval</p>
                  <p className="text-4xl font-black text-black">{data.stats.pendingApproval}</p>
                </div>
                {data.stats.pendingApproval > 0 && (
                  <Link href="/admin/approval" className="absolute top-0 right-0 h-full w-4 flex items-center justify-center bg-black hover:w-full transition-all opacity-100">
                    <span className="hidden group-hover:block text-white font-black text-lg tracking-wide uppercase">Cek Sekarang</span>
                  </Link>
                )}
              </div>
              
            </div>

            {/* Layout Bawah: Grafik (Kiri) & Log (Kanan) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Grafik Mingguan */}
              <div className="lg:col-span-2 bg-[#ffffff] neo-card p-6">
                <h3 className="text-xl font-black text-black uppercase mb-6 border-b-4 border-black pb-2 inline-block">Grafik Kehadiran (7 Hari)</h3>
                <div className="mt-4">
                  <DashboardChart data={data.chartData} />
                </div>
              </div>

              {/* Log Audit Terakhir */}
              <div className="bg-[#f000ff] neo-card p-6 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6 bg-white p-3 neo-border">
                  <h3 className="text-lg font-black text-black uppercase">Log Pemindaian</h3>
                  <Link href="/admin/laporan" className="text-xs font-black text-black hover:bg-black hover:text-white px-2 py-1 neo-border flex items-center uppercase">
                    Eksport <ExternalLink className="w-3 h-3 ml-1" />
                  </Link>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 bg-white neo-border p-4">
                  {data.logAbsensi.length === 0 ? (
                    <p className="text-black text-sm text-center mt-10 font-black uppercase">Belum ada aktivitas.</p>
                  ) : (
                    <ul className="space-y-4">
                      {data.logAbsensi.map((log: any) => (
                        <li key={log.id} className="border-b-4 border-black pb-3 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-md font-black text-black">{log.users?.name}</p>
                              <p className="text-xs text-black font-bold uppercase">{formatDate(log.waktu_scan)} • {formatTime(log.waktu_scan)}</p>
                            </div>
                            
                            {/* Badges Status */}
                            {log.status === 'hadir' && (
                              <span className="inline-flex items-center text-[10px] font-black px-2 py-0.5 bg-[#74ee15] text-black uppercase neo-border">
                                Hadir
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
                            {log.status === 'ditolak_expired' && (
                              <span className="inline-flex items-center text-[10px] font-black px-2 py-0.5 bg-black text-white uppercase neo-border">
                                Expired
                              </span>
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
