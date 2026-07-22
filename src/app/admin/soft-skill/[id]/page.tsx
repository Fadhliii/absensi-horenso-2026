'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, RefreshCw, CheckCircle2, Filter, Zap, CheckSquare, XSquare } from 'lucide-react';
import { getAllKelasAction } from '@/app/actions/kelas';
import { getAllPerusahaanAction } from '@/app/actions/master';

interface StudentAttendance {
  siswa_id: string;
  name: string;
  kelas_id?: string | null;
  nama_kelas?: string | null;
  perusahaan_id?: string | null;
  nama_perusahaan?: string | null;
  batch?: string | null;
  status_absensi: 'hadir' | 'tidak_hadir' | 'izin' | 'sakit' | 'belum_diabsen';
  status_pagi?: string;
  waktu_absen?: string;
}

interface SoftSkillClass {
  id: string;
  judul_materi: string;
  pengisi_acara: string;
  tanggal: string;
  waktu_mulai: string;
  waktu_selesai?: string;
}

export default function SoftSkillDetailPage() {
  const params = useParams();
  const classId = params.id as string;

  const [classDetail, setClassDetail] = useState<SoftSkillClass | null>(null);
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [savingMap, setSavingMap] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState('');

  // Master lists for filters
  const [kelasList, setKelasList] = useState<{id: string, nama_kelas: string}[]>([]);
  const [perusahaanList, setPerusahaanList] = useState<{id: string, nama: string}[]>([]);

  // Filter selections
  const [filterKelas, setFilterKelas] = useState('');
  const [filterPerusahaan, setFilterPerusahaan] = useState('');

  // Selected Checkboxes
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchFilters = useCallback(async () => {
    const [resK, resP] = await Promise.all([
      getAllKelasAction(),
      getAllPerusahaanAction()
    ]);
    if (resK.success && resK.data) setKelasList(resK.data);
    if (resP.data) setPerusahaanList(resP.data);
  }, []);

  const fetchDetailAndAttendance = async () => {
    try {
      setLoading(true);
      setError('');

      const resClass = await fetch(`/api/soft-skill/${classId}`);
      const jsonClass = await resClass.json();
      if (resClass.ok) {
        setClassDetail(jsonClass.data);
      } else {
        setError(jsonClass.error || 'Gagal memuat detail kelas');
        setLoading(false);
        return;
      }

      const resAttendance = await fetch(`/api/soft-skill/${classId}/absensi`);
      const jsonAttendance = await resAttendance.json();
      if (resAttendance.ok) {
        setStudents(jsonAttendance.data || []);
      } else {
        setError(jsonAttendance.error || 'Gagal memuat daftar siswa');
      }
    } catch (err: any) {
      setError(err.message || 'Koneksi bermasalah');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    if (classId) {
      fetchDetailAndAttendance();
    }
  }, [classId]);

  const handleUpdateStatus = async (siswaId: string, status: 'hadir' | 'tidak_hadir' | 'izin' | 'sakit') => {
    setSavingMap((prev) => ({ ...prev, [siswaId]: true }));
    try {
      const res = await fetch(`/api/soft-skill/${classId}/absensi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siswa_id: siswaId, status }),
      });

      if (res.ok) {
        setStudents((prev) =>
          prev.map((s) =>
            s.siswa_id === siswaId
              ? { ...s, status_absensi: status, waktu_absen: new Date().toISOString() }
              : s
          )
        );
      } else {
        const json = await res.json();
        alert(json.error || 'Gagal memperbarui status absensi');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingMap((prev) => ({ ...prev, [siswaId]: false }));
    }
  };

  // Bulk update status
  const handleBulkUpdateStatus = async (targetIds: string[], status: 'hadir' | 'tidak_hadir' | 'izin' | 'sakit') => {
    if (targetIds.length === 0) return;
    setBulkLoading(true);

    try {
      const res = await fetch(`/api/soft-skill/${classId}/absensi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siswa_ids: targetIds, status }),
      });

      if (res.ok) {
        setStudents((prev) =>
          prev.map((s) =>
            targetIds.includes(s.siswa_id)
              ? { ...s, status_absensi: status, waktu_absen: new Date().toISOString() }
              : s
          )
        );
        setSelectedIds([]);
      } else {
        const json = await res.json();
        alert(json.error || 'Gagal memperbarui presensi massal');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  // Derived filtered students
  const filteredStudents = students.filter((s) => {
    const matchSearch =
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.batch?.toLowerCase().includes(search.toLowerCase()) ||
      s.nama_kelas?.toLowerCase().includes(search.toLowerCase());

    const matchKelas = filterKelas ? s.kelas_id === filterKelas : true;
    const matchPerusahaan = filterPerusahaan ? s.perusahaan_id === filterPerusahaan : true;

    return matchSearch && matchKelas && matchPerusahaan;
  });

  const handleSelectAllFiltered = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredStudents.map((s) => s.siswa_id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const totalHadir = students.filter((s) => s.status_absensi === 'hadir').length;
  const totalTidakHadir = students.filter((s) => s.status_absensi === 'tidak_hadir').length;
  const totalIzinSakit = students.filter((s) => s.status_absensi === 'izin' || s.status_absensi === 'sakit').length;

  return (
    <div className="min-h-screen bg-[#f4f4f0] font-sans pb-12">
      {/* Header */}
      <header className="bg-white border-b-4 border-black mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/soft-skill" className="p-2 text-black hover:bg-black hover:text-white neo-border transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight uppercase">
                {classDetail ? classDetail.judul_materi : 'Detail Presensi Soft Skill'}
              </h1>
              {classDetail && (
                <p className="text-xs sm:text-sm font-bold text-gray-700 mt-0.5">
                  Pemateri: <span className="text-black font-black underline">{classDetail.pengisi_acara}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDetailAndAttendance}
              className="bg-[#00f0ff] hover:bg-[#00d8e6] text-black px-3.5 py-2 neo-btn text-xs font-black uppercase flex items-center gap-1.5"
              title="Tarik & Sync ulang data absen pagi"
            >
              <Zap className="w-4 h-4 text-black fill-yellow-300" /> Auto-Sync Absen Pagi (Jam 7)
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Detail Sesi Info Card */}
        {classDetail && (
          <div className="bg-[#ffe600] neo-card p-5 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div className="flex items-center gap-3">
              <Calendar className="w-7 h-7 text-black shrink-0" />
              <div>
                <span className="text-[10px] font-black text-black uppercase block">Tanggal Sesi</span>
                <span className="font-black text-sm text-black uppercase">
                  {new Date(classDetail.tanggal).toLocaleDateString('id-ID', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="w-7 h-7 text-black shrink-0" />
              <div>
                <span className="text-[10px] font-black text-black uppercase block">Waktu Sesi</span>
                <span className="font-black text-sm text-black uppercase">
                  {classDetail.waktu_mulai.slice(0, 5)}{' '}
                  {classDetail.waktu_selesai ? `- ${classDetail.waktu_selesai.slice(0, 5)}` : ''} WIB
                </span>
              </div>
            </div>

            <div className="md:col-span-2 flex items-center justify-around bg-white p-3 neo-border text-black">
              <div className="text-center">
                <span className="block text-xl font-black">{students.length}</span>
                <span className="text-[10px] font-black uppercase">Total Siswa</span>
              </div>
              <div className="text-center border-l-2 border-black pl-3">
                <span className="block text-xl font-black text-green-600">{totalHadir}</span>
                <span className="text-[10px] font-black uppercase">Hadir</span>
              </div>
              <div className="text-center border-l-2 border-black pl-3">
                <span className="block text-xl font-black text-red-600">{totalTidakHadir}</span>
                <span className="text-[10px] font-black uppercase">Tdk Hadir</span>
              </div>
              <div className="text-center border-l-2 border-black pl-3">
                <span className="block text-xl font-black text-blue-600">{totalIzinSakit}</span>
                <span className="text-[10px] font-black uppercase">Izin/Sakit</span>
              </div>
            </div>
          </div>
        )}

        {/* Filter Bar & Bulk Actions Panel */}
        <div className="bg-white neo-card p-5 space-y-4">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-base font-black text-black uppercase flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filter & Presensi Massal
            </h2>

            {/* Quick Bulk Action Button for Current Filter */}
            <button
              onClick={() => handleBulkUpdateStatus(filteredStudents.map((s) => s.siswa_id), 'hadir')}
              disabled={bulkLoading || filteredStudents.length === 0}
              className="bg-[#00e676] hover:bg-[#00c853] text-black font-black px-4 py-2 neo-btn text-xs uppercase flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" /> Tandai HADIR Semua Siswa Terfilter ({filteredStudents.length})
            </button>
          </div>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-black text-black uppercase mb-1">Filter Kelas</label>
              <select
                value={filterKelas}
                onChange={(e) => setFilterKelas(e.target.value)}
                className="w-full px-3 py-2 neo-input text-xs font-bold"
              >
                <option value="">Semua Kelas</option>
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama_kelas}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-black uppercase mb-1">Filter Perusahaan</label>
              <select
                value={filterPerusahaan}
                onChange={(e) => setFilterPerusahaan(e.target.value)}
                className="w-full px-3 py-2 neo-input text-xs font-bold"
              >
                <option value="">Semua Perusahaan Mitra</option>
                {perusahaanList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-black uppercase mb-1">Cari Nama / Batch</label>
              <input
                type="text"
                placeholder="Cari..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 neo-input text-xs font-bold"
              />
            </div>
          </div>

          {/* Selected Checkboxes Panel */}
          {selectedIds.length > 0 && (
            <div className="bg-[#ff00c8] text-white p-3 neo-card flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-black uppercase">
                {selectedIds.length} Siswa Tercentang Massal
              </span>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleBulkUpdateStatus(selectedIds, 'hadir')}
                  disabled={bulkLoading}
                  className="bg-[#00e676] text-black font-black px-3 py-1 neo-btn text-xs uppercase"
                >
                  Set Hadir
                </button>
                <button
                  onClick={() => handleBulkUpdateStatus(selectedIds, 'tidak_hadir')}
                  disabled={bulkLoading}
                  className="bg-[#ff1744] text-white font-black px-3 py-1 neo-btn text-xs uppercase"
                >
                  Set Tdk Hadir
                </button>
                <button
                  onClick={() => handleBulkUpdateStatus(selectedIds, 'izin')}
                  disabled={bulkLoading}
                  className="bg-[#ffe600] text-black font-black px-3 py-1 neo-btn text-xs uppercase"
                >
                  Set Izin
                </button>
                <button
                  onClick={() => handleBulkUpdateStatus(selectedIds, 'sakit')}
                  disabled={bulkLoading}
                  className="bg-[#4deeea] text-black font-black px-3 py-1 neo-btn text-xs uppercase"
                >
                  Set Sakit
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Attendance Table */}
        <div className="bg-white neo-card overflow-hidden">
          {loading ? (
            <div className="p-10 text-center font-bold text-gray-600 animate-pulse text-sm">
              Memuat Presensi Soft Skill...
            </div>
          ) : error ? (
            <div className="bg-[#ff1744] text-white p-4 font-black text-center neo-border text-xs uppercase">
              ⚠️ {error}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-10 text-center text-gray-700 font-bold text-xs">
              Tidak ada data siswa ditemukan untuk kriteria filter ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y-3 divide-black">
                <thead className="bg-[#fffde7] border-b-3 border-black">
                  <tr className="text-xs font-black text-black uppercase tracking-wider">
                    <th scope="col" className="px-4 py-3 text-left w-10">
                      <input
                        type="checkbox"
                        onChange={handleSelectAllFiltered}
                        checked={
                          filteredStudents.length > 0 &&
                          filteredStudents.every((s) => selectedIds.includes(s.siswa_id))
                        }
                        className="w-4 h-4 text-blue-600 border-2 border-black rounded focus:ring-0"
                      />
                    </th>
                    <th scope="col" className="px-4 py-3 text-left">Nama Siswa</th>
                    <th scope="col" className="px-4 py-3 text-left">Kelas</th>
                    <th scope="col" className="px-4 py-3 text-left">Perusahaan & Batch</th>
                    <th scope="col" className="px-4 py-3 text-center">Status Absen Pagi (Jam 7)</th>
                    <th scope="col" className="px-4 py-3 text-center">Status Presensi Soft Skill</th>
                    <th scope="col" className="px-4 py-3 text-center">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y-2 divide-black text-xs font-bold text-black">
                  {filteredStudents.map((s) => {
                    const isSaving = savingMap[s.siswa_id];
                    return (
                      <tr key={s.siswa_id} className="hover:bg-[#ffe600] hover:text-black font-black transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(s.siswa_id)}
                            onChange={() => handleSelectOne(s.siswa_id)}
                            className="w-4 h-4 text-blue-600 border-2 border-black rounded focus:ring-0"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-black">
                          {s.name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {s.nama_kelas ? (
                            <span className="bg-yellow-300 text-black px-2 py-0.5 rounded text-[11px] font-black uppercase">
                              {s.nama_kelas}
                            </span>
                          ) : (
                            <span className="text-gray-400 font-normal">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {s.nama_perusahaan ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-green-800 font-bold">{s.nama_perusahaan}</span>
                              {s.batch && <span className="text-[10px] text-gray-600">Batch {s.batch}</span>}
                            </div>
                          ) : (
                            <span className="text-gray-400 font-normal">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {s.status_pagi === 'hadir' || s.status_pagi === 'telat' ? (
                            <span className="bg-green-100 text-green-900 border border-green-300 px-2 py-0.5 rounded text-[10px] font-bold">
                              ✓ Hadir Pagi
                            </span>
                          ) : (
                            <span className="bg-gray-100 text-gray-600 border border-gray-300 px-2 py-0.5 rounded text-[10px] font-bold">
                              - Belum/Alpha
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {s.status_absensi === 'hadir' && (
                            <span className="bg-[#00e676] text-black px-2.5 py-1 neo-border font-black text-[11px] uppercase inline-block">
                              Hadir
                            </span>
                          )}
                          {s.status_absensi === 'tidak_hadir' && (
                            <span className="bg-[#ff1744] text-white px-2.5 py-1 neo-border font-black text-[11px] uppercase inline-block">
                              Tidak Hadir
                            </span>
                          )}
                          {s.status_absensi === 'izin' && (
                            <span className="bg-[#ffe600] text-black px-2.5 py-1 neo-border font-black text-[11px] uppercase inline-block">
                              Izin
                            </span>
                          )}
                          {s.status_absensi === 'sakit' && (
                            <span className="bg-[#4deeea] text-black px-2.5 py-1 neo-border font-black text-[11px] uppercase inline-block">
                              Sakit
                            </span>
                          )}
                          {s.status_absensi === 'belum_diabsen' && (
                            <span className="bg-gray-200 text-gray-700 px-2.5 py-1 border border-black font-bold text-[11px] uppercase inline-block">
                              Belum Presensi
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              disabled={isSaving || bulkLoading}
                              onClick={() => handleUpdateStatus(s.siswa_id, 'hadir')}
                              className={`px-2.5 py-1 text-[11px] font-black uppercase neo-btn ${
                                s.status_absensi === 'hadir' ? 'bg-[#00e676] text-black' : 'bg-white text-gray-800'
                              }`}
                            >
                              Hadir
                            </button>
                            <button
                              disabled={isSaving || bulkLoading}
                              onClick={() => handleUpdateStatus(s.siswa_id, 'tidak_hadir')}
                              className={`px-2.5 py-1 text-[11px] font-black uppercase neo-btn ${
                                s.status_absensi === 'tidak_hadir' ? 'bg-[#ff1744] text-white' : 'bg-white text-gray-800'
                              }`}
                            >
                              Tdk Hadir
                            </button>
                            <button
                              disabled={isSaving || bulkLoading}
                              onClick={() => handleUpdateStatus(s.siswa_id, 'izin')}
                              className={`px-2.5 py-1 text-[11px] font-black uppercase neo-btn ${
                                s.status_absensi === 'izin' ? 'bg-[#ffe600] text-black' : 'bg-white text-gray-800'
                              }`}
                            >
                              Izin
                            </button>
                            <button
                              disabled={isSaving || bulkLoading}
                              onClick={() => handleUpdateStatus(s.siswa_id, 'sakit')}
                              className={`px-2.5 py-1 text-[11px] font-black uppercase neo-btn ${
                                s.status_absensi === 'sakit' ? 'bg-[#4deeea] text-black' : 'bg-white text-gray-800'
                              }`}
                            >
                              Sakit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
