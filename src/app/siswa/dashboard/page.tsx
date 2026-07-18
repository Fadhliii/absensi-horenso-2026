'use client';

import { useState, useEffect, useCallback } from 'react';
import { getStudentDashboardDataAction } from '@/app/actions/siswa';
import { logoutAction } from '@/app/actions/auth';
import { QrCode, LogOut, Calendar, Clock, MapPin, CheckCircle, XCircle, AlertCircle, Building2 } from 'lucide-react';
import Link from 'next/link';

export default function SiswaDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Ambil bulan saat ini (YYYY-MM)
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [monthFilter, setMonthFilter] = useState(currentMonth);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getStudentDashboardDataAction(monthFilter);
    if (result.error) {
      setError(result.error);
    } else {
      setData(result);
    }
    setLoading(false);
  }, [monthFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper untuk format tanggal & jam
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };
  
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-md">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Portal Siswa</h1>
          <form action={logoutAction}>
            <button className="flex items-center text-blue-100 hover:text-white transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
        
        {/* Profile & Placement Badge */}
        {data && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
            <h2 className="text-gray-800 text-sm font-semibold">Selamat datang,</h2>
            <p className="text-2xl font-bold text-gray-900 mb-4">{data.profile.name}</p>
            
            {data.profile.statusPenempatan === 'sudah' ? (
              <div className="flex items-start bg-green-50 border border-green-200 rounded-xl p-3">
                <Building2 className="w-5 h-5 text-green-700 mr-3 mt-0.5" />
                <div>
                  <p className="text-xs text-green-800 font-bold uppercase tracking-wider">Status Penempatan</p>
                  <p className="text-sm font-semibold text-green-950 mt-0.5">Sudah ditempatkan di <span className="font-bold">{data.profile.namaPerusahaan}</span></p>
                </div>
              </div>
            ) : (
              <div className="flex items-start bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                <AlertCircle className="w-5 h-5 text-yellow-700 mr-3 mt-0.5" />
                <div>
                  <p className="text-xs text-yellow-800 font-bold uppercase tracking-wider">Status Penempatan</p>
                  <p className="text-sm font-semibold text-yellow-950 mt-0.5">Belum ditempatkan di Perusahaan Mitra.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scan Action Button */}
        <div className="mb-8">
          <Link 
            href="/siswa/scan"
            className="flex items-center justify-center w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all text-white font-bold py-4 px-4 rounded-2xl shadow-lg"
          >
            <QrCode className="w-6 h-6 mr-3" />
            Scan QR Absensi Sekarang
          </Link>
        </div>

        {/* Attendance History Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h3 className="font-bold text-gray-900 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-600" />
              Riwayat Absensi
            </h3>
            
            <input 
              type="month" 
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="text-sm border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white py-1.5 px-3 text-gray-900 font-semibold"
            />
          </div>

          <div className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-800 font-medium">Memuat riwayat...</div>
            ) : error ? (
              <div className="p-8 text-center text-red-600 font-semibold">{error}</div>
            ) : data?.riwayat?.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <Calendar className="w-8 h-8 text-gray-500" />
                </div>
                <p className="text-gray-800 font-medium">Belum ada riwayat absensi pada bulan ini.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {data.riwayat.map((absen: any) => (
                  <li key={absen.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-gray-900 mb-1">{formatDate(absen.waktu_scan)}</p>
                        <div className="flex items-center text-xs text-gray-800 font-medium space-x-3">
                          <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1 text-gray-700" /> {formatTime(absen.waktu_scan)}</span>
                        </div>
                      </div>
                      
                      {/* Status Badge */}
                      <div className="flex flex-col items-end">
                        {absen.status === 'hadir' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" /> Hadir
                          </span>
                        )}
                        {absen.status === 'ditolak_lokasi' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <MapPin className="w-3 h-3 mr-1" /> Luar Radius
                          </span>
                        )}
                        {absen.status === 'telat' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Clock className="w-3 h-3 mr-1" /> Terlambat
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
