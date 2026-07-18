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
    <div className="min-h-screen bg-gray-50">
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Dashboard Admin</h1>
          <form action={logoutAction}>
            <button className="flex items-center text-gray-600 hover:text-red-600 text-sm font-medium transition-colors">
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
            <div className="flex flex-wrap gap-2 mb-2">
              <Link href="/admin/approval" className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">Menu Approval</Link>
              <Link href="/admin/siswa" className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">Data Siswa</Link>
              <Link href="/admin/perusahaan" className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">Data Perusahaan</Link>
              <Link href="/admin/sesi" className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors shadow-sm">Buka Sesi Kelas</Link>
            </div>

            {/* Statistik Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center">
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                  <Users className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Siswa Aktif</p>
                  <p className="text-3xl font-bold text-gray-900">{data.stats.totalSiswa}</p>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mr-4">
                  <UserCheck className="w-7 h-7 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Hadir Hari Ini</p>
                  <p className="text-3xl font-bold text-gray-900">{data.stats.hadirHariIni}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center relative overflow-hidden">
                <div className="w-14 h-14 rounded-full bg-yellow-100 flex items-center justify-center mr-4">
                  <UserPlus className="w-7 h-7 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Pending Approval</p>
                  <p className="text-3xl font-bold text-gray-900">{data.stats.pendingApproval}</p>
                </div>
                {data.stats.pendingApproval > 0 && (
                  <Link href="/admin/approval" className="absolute top-0 right-0 h-full w-2 flex items-center justify-center bg-yellow-400 hover:w-full transition-all group opacity-80">
                    <span className="hidden group-hover:block text-yellow-900 font-bold text-sm tracking-wide">Cek Sekarang</span>
                  </Link>
                )}
              </div>
              
            </div>

            {/* Layout Bawah: Grafik (Kiri) & Log (Kanan) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Grafik Mingguan */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Grafik Kehadiran (7 Hari Terakhir)</h3>
                <DashboardChart data={data.chartData} />
              </div>

              {/* Log Audit Terakhir */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-800">Log Pemindaian</h3>
                  <Link href="/admin/laporan" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center bg-blue-50 px-2 py-1 rounded">
                    Eksport <ExternalLink className="w-3 h-3 ml-1" />
                  </Link>
                </div>

                <div className="flex-1 overflow-y-auto pr-2">
                  {data.logAbsensi.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center mt-10">Belum ada aktivitas.</p>
                  ) : (
                    <ul className="space-y-4">
                      {data.logAbsensi.map((log: any) => (
                        <li key={log.id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{log.users?.name}</p>
                              <p className="text-xs text-gray-500">{formatDate(log.waktu_scan)} • {formatTime(log.waktu_scan)}</p>
                            </div>
                            
                            {/* Badges Status */}
                            {log.status === 'hadir' && (
                              <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 uppercase tracking-wider">
                                Hadir
                              </span>
                            )}
                            {log.status === 'ditolak_lokasi' && (
                              <div className="flex flex-col items-end">
                                <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 uppercase tracking-wider mb-1">
                                  Ditolak
                                </span>
                                <span className="text-[10px] text-gray-500 flex items-center">
                                  <MapPin className="w-3 h-3 mr-0.5 text-red-500" /> {log.jarak_meter}m
                                </span>
                              </div>
                            )}
                            {log.status === 'ditolak_expired' && (
                              <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 uppercase tracking-wider">
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
