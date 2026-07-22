'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getRekapAbsensiAction, getRekapSoftSkillAction, getStudentDetailSummaryAction } from '@/app/actions/rekap';
import { inputIzinManualAction } from '@/app/actions/izin';
import { getAllPerusahaanAction } from '@/app/actions/master';
import { logoutAction } from '@/app/actions/auth';
import { LogOut, ArrowLeft, Loader2, CalendarDays, PlusCircle, Download, BookOpen, User, CheckCircle2, AlertCircle, Clock, XCircle, Building2, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function RekapGridPage() {
  const [activeTab, setActiveTab] = useState<'harian' | 'soft_skill'>('harian');
  const [loading, setLoading] = useState(true);

  // Rekap Absensi Harian Data
  const [rekapData, setRekapData] = useState<{
    id: string;
    name: string;
    created_at: string;
    tanggal_berangkat: string | null;
    attendance: Record<number, { status: string; alasan?: string; softSkill?: { judul: string; pemateri: string; waktu: string } }>;
  }[]>([]);

  // Rekap Soft Skill Data
  const [softSkillRekap, setSoftSkillRekap] = useState<{
    classes: any[];
    students: any[];
  }>({ classes: [], students: [] });

  const [perusahaanList, setPerusahaanList] = useState<{ id: string; nama: string }[]>([]);
  const [holidays, setHolidays] = useState<Record<string, string>>({});

  // Filters
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPerusahaan, setSelectedPerusahaan] = useState('');
  const [showDeparted, setShowDeparted] = useState(false);

  // Modal Input Manual
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [inputSiswaIds, setInputSiswaIds] = useState<string[]>([]);
  const [inputTanggal, setInputTanggal] = useState('');
  const [inputTipe, setInputTipe] = useState<'izin' | 'sakit'>('izin');
  const [inputAlasan, setInputAlasan] = useState('');
  const [inputLoading, setInputLoading] = useState(false);
  const [inputError, setInputError] = useState('');

  // Modal Detail Siswa (Clickable Name)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentDetail, setStudentDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchFilters = useCallback(async () => {
    const res = await getAllPerusahaanAction();
    if (res.data) setPerusahaanList(res.data);
  }, []);

  const fetchHolidays = useCallback(async () => {
    try {
      const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${selectedYear}/ID`);
      if (res.ok) {
        const data = await res.json();
        const holidayMap: Record<string, string> = {};
        data.forEach((h: any) => {
          holidayMap[h.date] = h.localName;
        });
        setHolidays(holidayMap);
      }
    } catch (error) {
      console.error('Failed to fetch holidays:', error);
    }
  }, [selectedYear]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (activeTab === 'harian') {
      const res = await getRekapAbsensiAction(selectedYear, selectedMonth, selectedPerusahaan || undefined);
      if (res.success && res.data) {
        setRekapData(res.data);
      }
    } else {
      const res = await getRekapSoftSkillAction(selectedYear, selectedMonth, selectedPerusahaan || undefined);
      if (res.success) {
        setSoftSkillRekap({
          classes: res.classes || [],
          students: res.students || []
        });
      }
    }
    setLoading(false);
  }, [activeTab, selectedYear, selectedMonth, selectedPerusahaan]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Clickable Student Name Handler
  const handleOpenStudentDetail = async (studentId: string) => {
    setSelectedStudentId(studentId);
    setDetailLoading(true);
    setStudentDetail(null);
    const res = await getStudentDetailSummaryAction(studentId);
    if (res.success && res.data) {
      setStudentDetail(res.data);
    }
    setDetailLoading(false);
  };

  const handleInputManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputSiswaIds.length === 0 || !inputTanggal || !inputAlasan) return;

    setInputError('');
    setInputLoading(true);

    const formData = new FormData();
    formData.append('siswa_ids', JSON.stringify(inputSiswaIds));
    formData.append('tanggal', inputTanggal);
    formData.append('tipe', inputTipe);
    formData.append('alasan', inputAlasan);

    const result = await inputIzinManualAction(formData);
    
    if (result.error) {
      setInputError(result.error);
    } else {
      setIsInputModalOpen(false);
      setInputSiswaIds([]);
      setInputTanggal('');
      setInputAlasan('');
      alert('Berhasil menginput absen manual.');
      fetchData();
    }
    setInputLoading(false);
  };

  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  const getDayName = useCallback((day: number) => {
    const date = new Date(selectedYear, selectedMonth - 1, day);
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    return dayNames[date.getDay()];
  }, [selectedYear, selectedMonth]);

  const getHolidayName = useCallback((day: number) => {
    const m = selectedMonth.toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    const dateStr = `${selectedYear}-${m}-${d}`;
    return holidays[dateStr];
  }, [selectedYear, selectedMonth, holidays]);

  const isWeekend = useCallback((day: number) => {
    const date = new Date(selectedYear, selectedMonth - 1, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  }, [selectedYear, selectedMonth]);

  const filteredData = useMemo(() => {
    return rekapData.filter(siswa => {
      if (showDeparted) return true;
      if (!siswa.tanggal_berangkat) return true;
      const tglBerangkat = new Date(siswa.tanggal_berangkat);
      const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
      return tglBerangkat >= startOfMonth;
    });
  }, [rekapData, showDeparted, selectedYear, selectedMonth]);

  const filteredSoftSkillStudents = useMemo(() => {
    return softSkillRekap.students.filter(siswa => {
      if (showDeparted) return true;
      if (!siswa.tanggal_berangkat) return true;
      const tglBerangkat = new Date(siswa.tanggal_berangkat);
      const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
      return tglBerangkat >= startOfMonth;
    });
  }, [softSkillRekap.students, showDeparted, selectedYear, selectedMonth]);

  const exportToExcel = async () => {
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Rekap Absensi');

      const headerRow = ['Nama Siswa'];
      daysArray.forEach(day => headerRow.push(day.toString()));
      worksheet.addRow(headerRow);
      worksheet.getRow(1).font = { bold: true };

      filteredData.forEach(siswa => {
        const rowData: any[] = [siswa.name];
        daysArray.forEach(day => {
          const statusObj = siswa.attendance[day];
          if (statusObj) {
            if (statusObj.status === 'H') rowData.push('1');
            else if (statusObj.status === 'SS') rowData.push('SS');
            else if (statusObj.status === 'I') rowData.push('I');
            else if (statusObj.status === 'S') rowData.push('S');
            else rowData.push('0');
          } else {
            const weekend = isWeekend(day);
            const holidayName = getHolidayName(day);
            if (weekend || holidayName) {
              rowData.push('');
            } else {
              rowData.push('0');
            }
          }
        });
        worksheet.addRow(rowData);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rekap_Absensi_${selectedYear}_${selectedMonth}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting to Excel', error);
      alert('Gagal mengekspor ke Excel');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900 flex items-center">
              <CalendarDays className="w-5 h-5 mr-2 text-blue-600" />
              Rekapitulasi Absensi (Grid View)
            </h1>
          </div>
          <form action={logoutAction}>
            <button className="flex items-center text-gray-600 hover:text-red-600 text-sm font-medium transition-colors">
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 max-w-[100vw] overflow-hidden flex flex-col p-4 sm:p-6 lg:p-8 space-y-4">
        
        {/* Navigation Tabs (Neo-Brutalist) */}
        <div className="flex items-center gap-2 border-b-4 border-black pb-2">
          <button
            onClick={() => setActiveTab('harian')}
            className={`px-5 py-2.5 neo-btn text-xs font-black uppercase flex items-center gap-2 ${
              activeTab === 'harian'
                ? 'bg-[#ffe600] text-black shadow-[3px_3px_0px_0px_#000]'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <CalendarDays className="w-4 h-4" /> Absensi Harian (QR Pagi)
          </button>
          <button
            onClick={() => setActiveTab('soft_skill')}
            className={`px-5 py-2.5 neo-btn text-xs font-black uppercase flex items-center gap-2 ${
              activeTab === 'soft_skill'
                ? 'bg-[#ff00c8] text-white shadow-[3px_3px_0px_0px_#000]'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Rekap Soft Skill
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
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
          
          <div className="flex items-center ml-auto gap-3">
            <label className="flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={showDeparted} 
                onChange={(e) => setShowDeparted(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                Tampilkan Alumni (Berangkat)
              </span>
            </label>
            
            {activeTab === 'harian' && (
              <>
                <button
                  onClick={exportToExcel}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center transition-colors"
                >
                  <Download className="w-4 h-4 mr-1.5" /> Export Excel
                </button>
                <button
                  onClick={() => setIsInputModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center transition-colors"
                >
                  <PlusCircle className="w-4 h-4 mr-1.5" /> Input Manual
                </button>
              </>
            )}
          </div>

          {loading && <Loader2 className="w-5 h-5 animate-spin text-blue-600 mb-2 ml-2" />}
        </div>

        {/* TAB 1: ABSENSI HARIAN GRID */}
        {activeTab === 'harian' && (
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col relative">
            <div className="overflow-x-auto h-full max-h-[65vh]">
              <table className="w-full text-sm text-left whitespace-nowrap border-collapse">
                <thead className="text-xs text-gray-700 bg-gray-100 sticky top-0 z-20">
                  <tr>
                    <th scope="col" className="px-4 py-3 sticky left-0 bg-gray-100 z-30 border-r border-b border-gray-200 min-w-[200px] align-bottom uppercase">
                      Nama Siswa (Klik utk Detail)
                    </th>
                    {daysArray.map(day => {
                      const isWknd = isWeekend(day);
                      const holidayName = getHolidayName(day);
                      const isHoliday = !!holidayName;
                      return (
                        <th 
                          key={day} 
                          scope="col" 
                          title={holidayName || ''}
                          className={`px-2 py-2 border-b border-gray-200 text-center w-10 min-w-[40px] ${(isWknd || isHoliday) ? 'bg-gray-200 text-gray-500' : ''}`}
                        >
                          <div className={`text-[10px] uppercase font-bold ${(isWknd || isHoliday) ? 'text-red-500' : 'text-gray-500'}`}>
                            {getDayName(day)}
                          </div>
                          <div className="text-sm mt-1">{day}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={daysInMonth + 1} className="px-6 py-8 text-center text-gray-500">
                        Tidak ada data siswa untuk filter tersebut.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((siswa) => (
                      <tr key={siswa.id} className="border-b border-gray-100 hover:bg-[#ffe600] hover:text-black font-black transition-colors">
                        {/* Clickable Student Name */}
                        <td className="px-4 py-2 font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-[#ffe600] hover:text-black font-black">
                          <button
                            onClick={() => handleOpenStudentDetail(siswa.id)}
                            className="font-black text-blue-600 hover:text-blue-800 hover:underline text-left truncate max-w-[200px] flex items-center gap-1"
                            title="Klik untuk melihat detail profil & statistik absensi"
                          >
                            <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="truncate">{siswa.name}</span>
                          </button>
                        </td>
                        
                        {daysArray.map(day => {
                          const statusObj = siswa.attendance[day];
                          const status = statusObj?.status;
                          const alasan = statusObj?.alasan;
                          const softSkill = statusObj?.softSkill;

                          const isSoftSkill = status === 'SS';
                          const hadir = status === 'H';
                          const izin = status === 'I';
                          const sakit = status === 'S';
                          
                          const weekend = isWeekend(day);
                          const holidayName = getHolidayName(day);
                          const isHoliday = !!holidayName;
                          
                          const currentDate = new Date(selectedYear, selectedMonth - 1, day);
                          const isDeparted = siswa.tanggal_berangkat && currentDate >= new Date(siswa.tanggal_berangkat);
                          
                          const createdAtDate = new Date(siswa.created_at);
                          createdAtDate.setHours(0,0,0,0);
                          const isNotJoinedYet = currentDate < createdAtDate;
                          
                          let cellClass = "px-1 py-1 text-center border-r border-gray-50 last:border-0";
                          let innerClass = "w-7 h-7 mx-auto rounded flex items-center justify-center text-xs font-bold transition-all ";
                          let content: React.ReactNode = '0';

                          if (isDeparted) {
                            innerClass += "bg-blue-100 text-blue-600";
                            content = '✈️';
                          } else if (isNotJoinedYet) {
                            innerClass += "bg-gray-100 text-gray-400";
                            content = '-';
                          } else if (isSoftSkill) {
                            innerClass += "bg-[#6b21a8] text-white font-black shadow-md scale-110 border border-purple-900 cursor-pointer";
                            content = 'SS';
                          } else if (hadir) {
                            innerClass += "bg-green-500 text-white shadow-sm scale-110";
                            content = '1';
                          } else if (izin) {
                            innerClass += "bg-[#ffe700] text-black shadow-sm scale-110";
                            content = 'I';
                          } else if (sakit) {
                            innerClass += "bg-[#ff003c] text-white shadow-sm scale-110";
                            content = 'S';
                          } else if (weekend || isHoliday) {
                            innerClass += "bg-gray-200 text-transparent";
                            content = '';
                          } else {
                            innerClass += "bg-red-100 text-red-500";
                          }

                          let titleStr = isDeparted ? 'Sudah Berangkat' : (isNotJoinedYet ? 'Belum Bergabung' : (isHoliday ? holidayName : ''));
                          if (isSoftSkill && softSkill) {
                            titleStr = `Soft Skill: ${softSkill.judul} | Pemateri: ${softSkill.pemateri} | Jam: ${softSkill.waktu}`;
                          } else if (izin) {
                            titleStr = `Izin${alasan ? ' - ' + alasan : ''}`;
                          } else if (sakit) {
                            titleStr = `Sakit${alasan ? ' - ' + alasan : ''}`;
                          }

                          return (
                            <td key={day} className={cellClass} title={titleStr}>
                              <div className={innerClass}>
                                {content}
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
        )}

        {/* TAB 2: REKAP SOFT SKILL */}
        {activeTab === 'soft_skill' && (
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col relative">
            <div className="p-3 bg-[#fffde7] border-b border-gray-200 flex justify-between items-center">
              <span className="text-xs font-black uppercase text-black flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-purple-700" /> Matriks Kehadiran Sesi Soft Skill Bulan Ini ({softSkillRekap.classes.length} Sesi)
              </span>
            </div>

            <div className="overflow-x-auto h-full max-h-[65vh]">
              <table className="w-full text-sm text-left whitespace-nowrap border-collapse">
                <thead className="text-xs text-gray-700 bg-gray-100 sticky top-0 z-20">
                  <tr>
                    <th scope="col" className="px-4 py-3 sticky left-0 bg-gray-100 z-30 border-r border-b border-gray-200 min-w-[200px] uppercase">
                      Nama Siswa (Klik utk Detail)
                    </th>
                    <th scope="col" className="px-3 py-3 border-r border-b border-gray-200 uppercase min-w-[100px]">
                      Kelas
                    </th>
                    <th scope="col" className="px-3 py-3 border-r border-b border-gray-200 uppercase min-w-[140px]">
                      Perusahaan / Batch
                    </th>

                    {softSkillRekap.classes.length === 0 ? (
                      <th className="px-4 py-3 border-b border-gray-200 text-center italic text-gray-500 font-normal">
                        Tidak ada Sesi Soft Skill di bulan ini
                      </th>
                    ) : (
                      softSkillRekap.classes.map((cls) => (
                        <th
                          key={cls.id}
                          scope="col"
                          className="px-3 py-2 border-b border-r border-gray-200 text-center min-w-[160px] bg-purple-50"
                          title={`Pemateri: ${cls.pengisi_acara}`}
                        >
                          <div className="text-[10px] font-black text-purple-900 uppercase">
                            {new Date(cls.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </div>
                          <div className="text-xs font-black text-black truncate max-w-[150px]">{cls.judul_materi}</div>
                          <div className="text-[10px] font-medium text-gray-600">{cls.pengisi_acara}</div>
                        </th>
                      ))
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 text-xs font-bold">
                  {filteredSoftSkillStudents.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={3 + Math.max(1, softSkillRekap.classes.length)} className="px-6 py-8 text-center text-gray-500">
                        Tidak ada data siswa untuk filter tersebut.
                      </td>
                    </tr>
                  ) : (
                    filteredSoftSkillStudents.map((siswa) => (
                      <tr key={siswa.id} className="hover:bg-[#ffe600] hover:text-black font-black transition-colors">
                        {/* Clickable Student Name */}
                        <td className="px-4 py-2 font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          <button
                            onClick={() => handleOpenStudentDetail(siswa.id)}
                            className="font-black text-blue-600 hover:text-blue-800 hover:underline text-left truncate max-w-[190px] flex items-center gap-1"
                            title="Klik untuk melihat detail profil & statistik"
                          >
                            <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="truncate">{siswa.name}</span>
                          </button>
                        </td>

                        <td className="px-3 py-2 border-r border-gray-100 text-gray-800">
                          {siswa.nama_kelas ? (
                            <span className="bg-yellow-200 text-black px-2 py-0.5 rounded text-[10px] font-black uppercase">
                              {siswa.nama_kelas}
                            </span>
                          ) : (
                            <span className="text-gray-400 font-normal">-</span>
                          )}
                        </td>

                        <td className="px-3 py-2 border-r border-gray-100 text-gray-800">
                          {siswa.nama_perusahaan ? (
                            <span className="text-green-700 font-bold">{siswa.nama_perusahaan}</span>
                          ) : (
                            <span className="text-gray-400 font-normal">-</span>
                          )}
                        </td>

                        {softSkillRekap.classes.map((cls) => {
                          const status = siswa.attendance[cls.id] || 'belum_diabsen';

                          return (
                            <td key={cls.id} className="px-2 py-2 border-r border-gray-100 text-center">
                              {status === 'hadir' && (
                                <span className="bg-[#6b21a8] text-white px-2 py-1 rounded text-[10px] font-black uppercase shadow-sm inline-block">
                                  Hadir
                                </span>
                              )}
                              {status === 'tidak_hadir' && (
                                <span className="bg-[#ff1744] text-white px-2 py-1 rounded text-[10px] font-black uppercase inline-block">
                                  Absen
                                </span>
                              )}
                              {status === 'izin' && (
                                <span className="bg-[#ffe600] text-black px-2 py-1 rounded text-[10px] font-black uppercase inline-block">
                                  Izin
                                </span>
                              )}
                              {status === 'sakit' && (
                                <span className="bg-[#4deeea] text-black px-2 py-1 rounded text-[10px] font-black uppercase inline-block">
                                  Sakit
                                </span>
                              )}
                              {status === 'belum_diabsen' && (
                                <span className="bg-gray-100 text-gray-400 px-2 py-0.5 rounded text-[10px] font-normal inline-block">
                                  -
                                </span>
                              )}
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
        )}

        {/* Legenda Tabel */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-xs font-bold text-gray-800 mb-2 uppercase">Legenda Kode Tabel:</h3>
          <div className="flex flex-wrap gap-4 text-xs text-gray-700">
            <div className="flex items-center"><div className="w-5 h-5 rounded bg-green-500 text-white flex items-center justify-center font-bold text-xs mr-1.5">1</div> Hadir Pagi</div>
            <div className="flex items-center"><div className="w-5 h-5 rounded bg-[#6b21a8] text-white flex items-center justify-center font-bold text-xs mr-1.5">SS</div> Hadir Soft Skill (Hover untuk detail)</div>
            <div className="flex items-center"><div className="w-5 h-5 rounded bg-[#ffe600] text-black flex items-center justify-center font-bold text-xs mr-1.5">I</div> Izin</div>
            <div className="flex items-center"><div className="w-5 h-5 rounded bg-[#ff003c] text-white flex items-center justify-center font-bold text-xs mr-1.5">S</div> Sakit</div>
            <div className="flex items-center"><div className="w-5 h-5 rounded bg-red-100 text-red-500 flex items-center justify-center font-bold text-xs mr-1.5">0</div> Alpa / Tidak Hadir</div>
          </div>
        </div>

        {/* MODAL DETAIL SISWA (CLICKABLE NAME POPUP) */}
        {selectedStudentId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] neo-card">
              
              {/* Modal Header */}
              <div className="bg-[#ffe600] p-4 border-b-3 border-black flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <User className="w-6 h-6 text-black" />
                  <h3 className="text-lg font-black text-black uppercase tracking-tight">Detail Profil & Rekapitulasi Siswa</h3>
                </div>
                <button 
                  onClick={() => setSelectedStudentId(null)} 
                  className="bg-white text-black p-1 neo-btn hover:bg-black hover:text-white"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                {detailLoading ? (
                  <div className="p-12 text-center text-gray-700 font-bold flex items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" /> Memuat detail siswa...
                  </div>
                ) : studentDetail ? (
                  <>
                    {/* Header Info Siswa */}
                    <div className="bg-gray-50 border-2 border-black p-4 rounded-xl space-y-3">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-gray-300 pb-3">
                        <div>
                          <span className="text-[10px] font-black uppercase text-gray-500">Nama Lengkap Siswa</span>
                          <h4 className="text-xl font-black text-black uppercase">{studentDetail.name}</h4>
                        </div>

                        {studentDetail.nama_kelas && (
                          <span className="bg-[#ff00c8] text-white px-3 py-1 neo-border text-xs font-black uppercase self-start sm:self-auto">
                            Kelas: {studentDetail.nama_kelas}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold text-gray-800">
                        <div>
                          <span className="text-gray-500 block">Email:</span>
                          <span>{studentDetail.email}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">No Telepon:</span>
                          <span>{studentDetail.phone}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Perusahaan Mitra:</span>
                          <span className="text-green-700 font-black">
                            {studentDetail.nama_perusahaan ? `${studentDetail.nama_perusahaan} ${studentDetail.batch ? `(Batch ${studentDetail.batch})` : ''}` : 'Belum Ditempatkan'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Status Keberangkatan:</span>
                          <span>
                            {studentDetail.tanggal_berangkat 
                              ? `✈️ Berangkat: ${new Date(studentDetail.tanggal_berangkat).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}` 
                              : 'Belum Berangkat'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Ringkasan Stats Absensi Harian */}
                    <div>
                      <h5 className="text-xs font-black uppercase text-black mb-3 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-blue-600" /> Ringkasan Absensi Harian (Total Akumulasi)
                      </h5>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center text-xs font-bold">
                        <div className="bg-green-100 border border-green-300 p-2 rounded-lg">
                          <span className="block text-lg font-black text-green-700">{studentDetail.stats.hadir}</span>
                          <span className="text-[10px] text-green-900 uppercase">Hadir</span>
                        </div>
                        <div className="bg-yellow-100 border border-yellow-300 p-2 rounded-lg">
                          <span className="block text-lg font-black text-yellow-700">{studentDetail.stats.telat}</span>
                          <span className="text-[10px] text-yellow-900 uppercase">Telat</span>
                        </div>
                        <div className="bg-blue-100 border border-blue-300 p-2 rounded-lg">
                          <span className="block text-lg font-black text-blue-700">{studentDetail.stats.izin}</span>
                          <span className="text-[10px] text-blue-900 uppercase">Izin</span>
                        </div>
                        <div className="bg-purple-100 border border-purple-300 p-2 rounded-lg">
                          <span className="block text-lg font-black text-purple-700">{studentDetail.stats.sakit}</span>
                          <span className="text-[10px] text-purple-900 uppercase">Sakit</span>
                        </div>
                        <div className="bg-red-100 border border-red-300 p-2 rounded-lg">
                          <span className="block text-lg font-black text-red-700">{studentDetail.stats.luarRadius}</span>
                          <span className="text-[10px] text-red-900 uppercase">Gagal Radius</span>
                        </div>
                      </div>
                    </div>

                    {/* Riwayat Kehadiran Kelas Soft Skill */}
                    <div>
                      <h5 className="text-xs font-black uppercase text-black mb-3 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-purple-700" /> Riwayat Kelas Soft Skill yang Pernah Diikuti
                      </h5>
                      {studentDetail.softSkillHistory.length === 0 ? (
                        <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center text-xs text-gray-500 italic">
                          Siswa ini belum pernah mencatatkan kehadiran di kelas Soft Skill.
                        </div>
                      ) : (
                        <div className="bg-white border-2 border-black rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                          <ul className="divide-y divide-gray-200 text-xs font-bold">
                            {studentDetail.softSkillHistory.map((item: any, idx: number) => {
                              const cls = item.kelas_soft_skill;
                              return (
                                <li key={idx} className="p-3 flex justify-between items-center hover:bg-[#ffe600] hover:text-black font-black">
                                  <div>
                                    <p className="font-black text-black">{cls?.judul_materi || 'Materi Soft Skill'}</p>
                                    <p className="text-[10px] text-gray-600 font-medium">
                                      Pemateri: {cls?.pengisi_acara} • {cls?.tanggal ? new Date(cls.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                                    </p>
                                  </div>
                                  <div>
                                    {item.status === 'hadir' && (
                                      <span className="bg-[#6b21a8] text-white px-2.5 py-0.5 rounded text-[10px] font-black uppercase">
                                        Hadir
                                      </span>
                                    )}
                                    {item.status === 'tidak_hadir' && (
                                      <span className="bg-[#ff1744] text-white px-2.5 py-0.5 rounded text-[10px] font-black uppercase">
                                        Tdk Hadir
                                      </span>
                                    )}
                                    {item.status === 'izin' && (
                                      <span className="bg-[#ffe600] text-black px-2.5 py-0.5 rounded text-[10px] font-black uppercase">
                                        Izin
                                      </span>
                                    )}
                                    {item.status === 'sakit' && (
                                      <span className="bg-[#4deeea] text-black px-2.5 py-0.5 rounded text-[10px] font-black uppercase">
                                        Sakit
                                      </span>
                                    )}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-6 text-center text-red-600 font-bold text-xs">
                    Gagal memuat detail siswa.
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setSelectedStudentId(null)}
                  className="bg-black text-white px-5 py-2 neo-btn text-xs font-black uppercase"
                >
                  Tutup
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Modal Input Manual */}
        {isInputModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-900 flex items-center">
                  <PlusCircle className="w-5 h-5 mr-2 text-blue-600" />
                  Input Izin/Sakit Manual
                </h3>
                <button onClick={() => setIsInputModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <span className="sr-only">Close</span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto">
                {inputError && (
                  <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                    {inputError}
                  </div>
                )}
                <form id="form-input-manual" onSubmit={handleInputManual} className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-gray-700">Pilih Siswa</label>
                      <button 
                        type="button" 
                        onClick={() => setInputSiswaIds(inputSiswaIds.length === rekapData.length ? [] : rekapData.map(s => s.id))}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {inputSiswaIds.length === rekapData.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                      </button>
                    </div>
                    <div className="w-full h-40 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white space-y-1">
                      {rekapData.length === 0 ? (
                        <div className="text-sm text-gray-500 text-center p-2">Tidak ada siswa yang ditampilkan di tabel</div>
                      ) : (
                        rekapData.map(s => (
                          <label key={s.id} className="flex items-center p-1.5 hover:bg-[#ffe600] hover:text-black font-black rounded cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={inputSiswaIds.includes(s.id)}
                              onChange={(e) => {
                                if (e.target.checked) setInputSiswaIds([...inputSiswaIds, s.id]);
                                else setInputSiswaIds(inputSiswaIds.filter(id => id !== s.id));
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
                            />
                            <span className="text-sm text-gray-700 truncate">{s.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                    {inputSiswaIds.length === 0 && <p className="text-xs text-red-500 mt-1">Pilih minimal 1 siswa</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                    <input 
                      type="date" 
                      required
                      value={inputTanggal}
                      onChange={(e) => setInputTanggal(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
                    <select 
                      required
                      value={inputTipe}
                      onChange={(e) => setInputTipe(e.target.value as 'izin' | 'sakit')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="izin">Izin</option>
                      <option value="sakit">Sakit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan / Alasan</label>
                    <textarea 
                      required
                      value={inputAlasan}
                      onChange={(e) => setInputAlasan(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Contoh: Sakit demam, Izin urusan keluarga..."
                    />
                  </div>
                </form>
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsInputModalOpen(false)}
                  disabled={inputLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-[#ffe600] hover:text-black font-black"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  form="form-input-manual"
                  disabled={inputLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {inputLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Simpan Data
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
