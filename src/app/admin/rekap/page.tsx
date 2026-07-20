'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getRekapAbsensiAction } from '@/app/actions/rekap';
import { getAllPerusahaanAction } from '@/app/actions/master';
import { logoutAction } from '@/app/actions/auth';
import { LogOut, ArrowLeft, Loader2, CalendarDays } from 'lucide-react';
import Link from 'next/link';

export default function RekapGridPage() {
  const [loading, setLoading] = useState(true);
  const [rekapData, setRekapData] = useState<{id: string, name: string, attendance: number[]}[]>([]);
  const [perusahaanList, setPerusahaanList] = useState<{id: string, nama: string}[]>([]);
  
  // Filters
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPerusahaan, setSelectedPerusahaan] = useState('');

  const fetchFilters = useCallback(async () => {
    const res = await getAllPerusahaanAction();
    if (res.data) setPerusahaanList(res.data);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await getRekapAbsensiAction(selectedYear, selectedMonth, selectedPerusahaan || undefined);
    if (res.success && res.data) {
      setRekapData(res.data);
    }
    setLoading(false);
  }, [selectedYear, selectedMonth, selectedPerusahaan]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Generate days array for the selected month
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  // Helper to check if a day is weekend
  const isWeekend = useCallback((day: number) => {
    const date = new Date(selectedYear, selectedMonth - 1, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0 is Sunday, 6 is Saturday
  }, [selectedYear, selectedMonth]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900 flex items-center">
              <CalendarDays className="w-5 h-5 mr-2 text-blue-600" />
              Rekap Absensi (Grid View)
            </h1>
          </div>
          <form action={logoutAction}>
            <button className="flex items-center text-gray-600 hover:text-red-600 text-sm font-medium transition-colors">
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 max-w-[100vw] overflow-hidden flex flex-col p-4 sm:p-6 lg:p-8">
        
        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Bulan</label>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-blue-500 focus:border-blue-500"
            >
              {[
                'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
              ].map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Tahun</label>
            <input 
              type="number" 
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Perusahaan Mitra</label>
            <select 
              value={selectedPerusahaan} 
              onChange={(e) => setSelectedPerusahaan(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-blue-500 focus:border-blue-500 min-w-[200px]"
            >
              <option value="">Semua Perusahaan</option>
              {perusahaanList.map(p => (
                <option key={p.id} value={p.id}>{p.nama}</option>
              ))}
            </select>
          </div>

          {loading && <Loader2 className="w-5 h-5 animate-spin text-blue-600 mb-2 ml-2" />}
        </div>

        {/* Grid Table Container */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col relative">
          <div className="overflow-x-auto h-full max-h-[70vh]">
            <table className="w-full text-sm text-left whitespace-nowrap border-collapse">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0 z-20">
                <tr>
                  <th scope="col" className="px-4 py-3 sticky left-0 bg-gray-100 z-30 border-r border-b border-gray-200 min-w-[200px]">
                    Nama Siswa
                  </th>
                  {daysArray.map(day => (
                    <th 
                      key={day} 
                      scope="col" 
                      className={`px-2 py-3 border-b border-gray-200 text-center w-8 ${isWeekend(day) ? 'bg-gray-200 text-gray-500' : ''}`}
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rekapData.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={daysInMonth + 1} className="px-6 py-8 text-center text-gray-500">
                      Tidak ada data siswa untuk filter tersebut.
                    </td>
                  </tr>
                ) : (
                  rekapData.map((siswa, idx) => (
                    <tr key={siswa.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2 font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-gray-50">
                        <div className="truncate max-w-[200px]" title={siswa.name}>{siswa.name}</div>
                      </td>
                      
                      {daysArray.map(day => {
                        const hadir = siswa.attendance.includes(day);
                        const weekend = isWeekend(day);
                        
                        let cellClass = "px-1 py-1 text-center border-r border-gray-50 last:border-0";
                        let innerClass = "w-6 h-6 mx-auto rounded flex items-center justify-center text-xs font-bold transition-all ";

                        if (hadir) {
                          innerClass += "bg-green-500 text-white shadow-sm scale-110";
                        } else if (weekend) {
                          innerClass += "bg-gray-200 text-transparent";
                        } else {
                          innerClass += "bg-red-100 text-red-500";
                        }

                        return (
                          <td key={day} className={cellClass}>
                            <div className={innerClass}>
                              {hadir ? '1' : (weekend ? '' : '0')}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
