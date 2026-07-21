'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSemuaIzinAction, setStatusIzinAction } from '@/app/actions/izin';
import Link from 'next/link';
import { ArrowLeft, Check, X, FileText, Calendar } from 'lucide-react';
import IndonesianClock from '@/components/IndonesianClock';
import { formatIndonesianDate } from '@/lib/date';

export default function DaftarIzinPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getSemuaIzinAction();
    if (result.error) {
      setError(result.error);
    } else {
      setData(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    if (!confirm(`Apakah Anda yakin ingin mengubah status menjadi ${status.toUpperCase()}?`)) return;
    
    const result = await setStatusIzinAction(id, status);
    if (result.error) {
      alert(result.error);
    } else {
      fetchData();
    }
  };

  const formatDate = (dateString: string) => formatIndonesianDate(dateString);

  return (
    <div className="min-h-screen bg-[#f4f4f0] font-sans">
      <header className="bg-white border-b-4 border-black mb-8">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/admin/dashboard" className="mr-4 hover:-translate-x-1 transition-transform">
              <ArrowLeft className="w-8 h-8 text-black" />
            </Link>
            <h1 className="text-2xl font-black text-black tracking-tight uppercase">Persetujuan Izin/Sakit</h1>
          </div>
          <IndonesianClock className="hidden sm:inline-flex" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pb-10">
        <div className="bg-white neo-card p-6">
          <div className="flex items-center mb-6 border-b-4 border-black pb-4">
            <FileText className="w-8 h-8 mr-3 text-black" />
            <h2 className="text-xl font-black text-black uppercase">Daftar Permohonan</h2>
          </div>

          {loading ? (
            <div className="text-center py-10 font-black animate-pulse">Memuat Data...</div>
          ) : error ? (
            <div className="bg-[#ff003c] text-white p-4 neo-border font-bold">{error}</div>
          ) : data.length === 0 ? (
            <div className="text-center py-10 font-bold border-4 border-dashed border-gray-300">Belum ada permohonan.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border-4 border-black">
                <thead>
                  <tr className="bg-black text-white">
                    <th className="p-3 border-r-4 border-black font-black uppercase text-sm">Siswa</th>
                    <th className="p-3 border-r-4 border-black font-black uppercase text-sm">Tanggal Izin</th>
                    <th className="p-3 border-r-4 border-black font-black uppercase text-sm">Jenis</th>
                    <th className="p-3 border-r-4 border-black font-black uppercase text-sm">Alasan</th>
                    <th className="p-3 border-r-4 border-black font-black uppercase text-sm">Laporan Ke</th>
                    <th className="p-3 border-r-4 border-black font-black uppercase text-sm">Status</th>
                    <th className="p-3 font-black uppercase text-sm">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => (
                    <tr key={item.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-[#f4f4f0]'} border-b-4 border-black hover:bg-[#4deeea] transition-colors group`}>
                      <td className="p-3 border-r-4 border-black">
                        <p className="font-bold">{item.users?.name}</p>
                        <p className="text-xs font-semibold text-gray-600">{item.users?.email}</p>
                      </td>
                      <td className="p-3 border-r-4 border-black font-bold whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(item.tanggal)}
                        </div>
                      </td>
                      <td className="p-3 border-r-4 border-black">
                        <span className={`inline-block px-2 py-1 text-xs font-black uppercase neo-border ${item.tipe === 'sakit' ? 'bg-[#ff003c] text-white' : 'bg-[#ffe700] text-black'}`}>
                          {item.tipe}
                        </span>
                      </td>
                      <td className="p-3 border-r-4 border-black max-w-xs truncate font-medium" title={item.alasan}>
                        {item.alasan}
                      </td>
                      <td className="p-3 border-r-4 border-black font-bold text-sm">
                        {item.instruktur?.name || '-'}
                      </td>
                      <td className="p-3 border-r-4 border-black">
                        {item.status === 'pending' && <span className="bg-yellow-200 text-yellow-800 px-2 py-1 text-xs font-black uppercase neo-border">Pending</span>}
                        {item.status === 'approved' && <span className="bg-[#74ee15] text-black px-2 py-1 text-xs font-black uppercase neo-border">Disetujui</span>}
                        {item.status === 'rejected' && <span className="bg-[#ff003c] text-white px-2 py-1 text-xs font-black uppercase neo-border">Ditolak</span>}
                      </td>
                      <td className="p-3 space-x-2 whitespace-nowrap">
                        {item.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => handleUpdateStatus(item.id, 'approved')}
                              className="bg-[#74ee15] hover:bg-green-500 text-black p-2 neo-border active:translate-x-1 active:translate-y-1 inline-flex"
                              title="Setujui"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(item.id, 'rejected')}
                              className="bg-[#ff003c] hover:bg-red-600 text-white p-2 neo-border active:translate-x-1 active:translate-y-1 inline-flex"
                              title="Tolak"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
