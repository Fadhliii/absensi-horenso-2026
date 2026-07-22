'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, User, Check, X, AlertCircle, Search, RefreshCw } from 'lucide-react';

interface StudentAttendance {
  siswa_id: string;
  name: string;
  batch?: string;
  status_absensi: 'hadir' | 'tidak_hadir' | 'izin' | 'sakit' | 'belum_diabsen';
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
  const [savingMap, setSavingMap] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState('');

  const fetchDetailAndAttendance = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch class info
      const resClass = await fetch(`/api/soft-skill/${classId}`);
      const jsonClass = await resClass.json();
      if (resClass.ok) {
        setClassDetail(jsonClass.data);
      } else {
        setError(jsonClass.error || 'Gagal memuat detail kelas');
        setLoading(false);
        return;
      }

      // Fetch active students and attendance
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

  const filteredStudents = students.filter(
    (s) =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.batch?.toLowerCase().includes(search.toLowerCase())
  );

  const totalHadir = students.filter((s) => s.status_absensi === 'hadir').length;
  const totalTidakHadir = students.filter((s) => s.status_absensi === 'tidak_hadir').length;
  const totalIzinSakit = students.filter((s) => s.status_absensi === 'izin' || s.status_absensi === 'sakit').length;

  return (
    <div className="min-h-screen bg-[#f4f4f0] font-sans pb-12">
      {/* Header */}
      <header className="bg-white border-b-4 border-black mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/soft-skill" className="text-black hover:text-gray-700">
              <ArrowLeft className="w-6 h-6 stroke-[3]" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight uppercase">
                {classDetail ? classDetail.judul_materi : 'Detail Kelas Soft Skill'}
              </h1>
              {classDetail && (
                <p className="text-xs sm:text-sm font-bold text-gray-600">
                  Pemateri: <span className="text-black">{classDetail.pengisi_acara}</span>
                </p>
              )}
            </div>
          </div>

          <button
            onClick={fetchDetailAndAttendance}
            className="bg-white text-black px-3 py-2 neo-btn text-xs font-black uppercase flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4 stroke-[3]" /> Refresh Data
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {classDetail && (
          <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-black stroke-[2.5]" />
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase block">Tanggal</span>
                <span className="font-black text-sm text-black">
                  {new Date(classDetail.tanggal).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-black stroke-[2.5]" />
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase block">Waktu Sesi</span>
                <span className="font-black text-sm text-black">
                  {classDetail.waktu_mulai.slice(0, 5)}{' '}
                  {classDetail.waktu_selesai ? `- ${classDetail.waktu_selesai.slice(0, 5)}` : ''} WIB
                </span>
              </div>
            </div>

            <div className="md:col-span-2 flex items-center justify-around bg-[#ffe700] p-4 border-3 border-black">
              <div className="text-center">
                <span className="block text-2xl font-black text-black">{students.length}</span>
                <span className="text-xs font-black uppercase text-black">Total Siswa Aktif</span>
              </div>
              <div className="text-center border-l-2 border-black pl-4">
                <span className="block text-2xl font-black text-green-700">{totalHadir}</span>
                <span className="text-xs font-black uppercase text-black">Hadir</span>
              </div>
              <div className="text-center border-l-2 border-black pl-4">
                <span className="block text-2xl font-black text-red-600">{totalTidakHadir}</span>
                <span className="text-xs font-black uppercase text-black">Tdk Hadir</span>
              </div>
              <div className="text-center border-l-2 border-black pl-4">
                <span className="block text-2xl font-black text-blue-700">{totalIzinSakit}</span>
                <span className="text-xs font-black uppercase text-black">Izin/Sakit</span>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar & Table */}
        <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <h2 className="text-lg font-black text-black uppercase">
              Absensi Manual Siswa Hari Ini (Sinkron Real-time)
            </h2>

            <div className="relative w-full sm:w-72">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 stroke-[2.5]" />
              <input
                type="text"
                placeholder="Cari Nama / Batch..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-3 border-black font-bold text-sm focus:outline-none focus:bg-[#ffe700]/20"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 font-bold text-gray-600 animate-pulse">
              Memuat Presensi Siswa...
            </div>
          ) : error ? (
            <div className="bg-[#ff003c] text-white p-4 font-bold text-center neo-card">{error}</div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-gray-500 font-bold border-2 border-dashed border-gray-300">
              Tidak ada siswa ditemukan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border-3 border-black">
                <thead>
                  <tr className="bg-black text-white text-xs font-black uppercase tracking-wider">
                    <th className="p-3 border-r-2 border-white">No</th>
                    <th className="p-3 border-r-2 border-white">Nama Siswa</th>
                    <th className="p-3 border-r-2 border-white">Batch / Angkatan</th>
                    <th className="p-3 border-r-2 border-white text-center">Status Kehadiran</th>
                    <th className="p-3 text-center">Aksi Presensi Hari Ini</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black font-bold text-sm">
                  {filteredStudents.map((s, idx) => {
                    const isSaving = savingMap[s.siswa_id];
                    return (
                      <tr key={s.siswa_id} className="hover:bg-[#f4f4f0] transition-colors">
                        <td className="p-3 border-r-2 border-black text-center">{idx + 1}</td>
                        <td className="p-3 border-r-2 border-black font-black text-black">
                          {s.name || 'Siswa Tanpa Nama'}
                        </td>
                        <td className="p-3 border-r-2 border-black text-gray-700">
                          {s.batch || '-'}
                        </td>
                        <td className="p-3 border-r-2 border-black text-center">
                          {s.status_absensi === 'hadir' && (
                            <span className="bg-[#74ee15] text-black px-2.5 py-1 border border-black font-black text-xs uppercase inline-block">
                              Hadir
                            </span>
                          )}
                          {s.status_absensi === 'tidak_hadir' && (
                            <span className="bg-[#ff003c] text-white px-2.5 py-1 border border-black font-black text-xs uppercase inline-block">
                              Tidak Hadir
                            </span>
                          )}
                          {s.status_absensi === 'izin' && (
                            <span className="bg-[#ffe700] text-black px-2.5 py-1 border border-black font-black text-xs uppercase inline-block">
                              Izin
                            </span>
                          )}
                          {s.status_absensi === 'sakit' && (
                            <span className="bg-[#4deeea] text-black px-2.5 py-1 border border-black font-black text-xs uppercase inline-block">
                              Sakit
                            </span>
                          )}
                          {s.status_absensi === 'belum_diabsen' && (
                            <span className="bg-gray-200 text-gray-700 px-2.5 py-1 border border-black font-bold text-xs uppercase inline-block">
                              Belum Absen
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <button
                              disabled={isSaving}
                              onClick={() => handleUpdateStatus(s.siswa_id, 'hadir')}
                              className={`px-3 py-1 text-xs font-black uppercase border-2 border-black transition-transform ${
                                s.status_absensi === 'hadir'
                                  ? 'bg-[#74ee15] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                  : 'bg-white hover:bg-green-100 text-gray-800'
                              }`}
                            >
                              Hadir
                            </button>
                            <button
                              disabled={isSaving}
                              onClick={() => handleUpdateStatus(s.siswa_id, 'tidak_hadir')}
                              className={`px-3 py-1 text-xs font-black uppercase border-2 border-black transition-transform ${
                                s.status_absensi === 'tidak_hadir'
                                  ? 'bg-[#ff003c] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                  : 'bg-white hover:bg-red-100 text-gray-800'
                              }`}
                            >
                              Tdk Hadir
                            </button>
                            <button
                              disabled={isSaving}
                              onClick={() => handleUpdateStatus(s.siswa_id, 'izin')}
                              className={`px-3 py-1 text-xs font-black uppercase border-2 border-black transition-transform ${
                                s.status_absensi === 'izin'
                                  ? 'bg-[#ffe700] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                  : 'bg-white hover:bg-yellow-100 text-gray-800'
                              }`}
                            >
                              Izin
                            </button>
                            <button
                              disabled={isSaving}
                              onClick={() => handleUpdateStatus(s.siswa_id, 'sakit')}
                              className={`px-3 py-1 text-xs font-black uppercase border-2 border-black transition-transform ${
                                s.status_absensi === 'sakit'
                                  ? 'bg-[#4deeea] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                  : 'bg-white hover:bg-cyan-100 text-gray-800'
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
