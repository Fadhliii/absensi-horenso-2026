'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAllPerusahaanAction } from '@/app/actions/master';
import { logoutAction } from '@/app/actions/auth';
import { Download, FileSpreadsheet, LogOut, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function LaporanPage() {
  const [perusahaanList, setPerusahaanList] = useState<{id: string, nama: string}[]>([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusPenempatan, setStatusPenempatan] = useState('semua');
  const [perusahaanId, setPerusahaanId] = useState('');

  const fetchPerusahaan = useCallback(async () => {
    const res = await getAllPerusahaanAction();
    if (res.data) setPerusahaanList(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPerusahaan();
  }, [fetchPerusahaan]);

  const handleExport = () => {
    // Bangun URL Query Parameter
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (statusPenempatan !== 'semua') params.append('statusPenempatan', statusPenempatan);
    if (statusPenempatan === 'sudah' && perusahaanId) params.append('perusahaanId', perusahaanId);

    // Buka tab baru untuk trigger download dari API Endpoint
    const url = `/api/export?${params.toString()}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Export Laporan</h1>
          </div>
          <form action={logoutAction}>
            <button className="flex items-center text-gray-600 hover:text-red-600 text-sm font-medium transition-colors">
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white shadow rounded-2xl p-6 sm:p-8">
          
          <div className="flex items-center mb-6 border-b border-gray-100 pb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
              <FileSpreadsheet className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Unduh Data Absensi</h2>
              <p className="text-sm text-gray-800 font-medium">File akan diekspor dalam format Excel (.xlsx)</p>
            </div>
          </div>

          <div className="space-y-6">
            
            {/* Filter Tanggal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Mulai Tanggal</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900" 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Sampai Tanggal</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900" 
                />
              </div>
            </div>

            {/* Filter Penempatan */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">Filter Penempatan Siswa</label>
              <select 
                value={statusPenempatan}
                onChange={(e) => {
                  setStatusPenempatan(e.target.value);
                  if (e.target.value !== 'sudah') setPerusahaanId('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900"
              >
                <option value="semua">Semua Siswa</option>
                <option value="belum">Hanya Belum Ditempatkan</option>
                <option value="sudah">Hanya Sudah Ditempatkan</option>
              </select>
            </div>

            {/* Filter Perusahaan Spesifik */}
            {statusPenempatan === 'sudah' && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <label className="block text-sm font-bold text-gray-900 mb-1">Pilih Perusahaan Mitra (Opsional)</label>
                <select 
                  value={perusahaanId}
                  onChange={(e) => setPerusahaanId(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900"
                >
                  <option value="">-- Semua Perusahaan Mitra --</option>
                  {perusahaanList.map(p => (
                    <option key={p.id} value={p.id}>{p.nama}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="pt-4 border-t border-gray-100">
              <button 
                onClick={handleExport}
                className="w-full sm:w-auto flex items-center justify-center px-6 py-3 border border-transparent text-base font-bold rounded-xl text-white bg-green-600 hover:bg-green-700 shadow-md active:scale-[0.98] transition-all"
              >
                <Download className="w-5 h-5 mr-2" />
                Download Excel Sekarang
              </button>
            </div>
            
          </div>
        </div>
      </main>
    </div>
  );
}
