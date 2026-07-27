'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Calendar, Clock, UserCheck, BookOpen, Trash2, Search, CheckCircle2, History, Users } from 'lucide-react';

interface SoftSkillClass {
  id: string;
  judul_materi: string;
  pengisi_acara: string;
  tanggal: string;
  waktu_mulai: string;
  waktu_selesai?: string;
  dibuat_oleh?: {
    name: string;
  };
  summary?: {
    totalHadir: number;
    totalTidakHadir: number;
    totalIzinSakit: number;
    totalTerdaftar: number;
  };
}

export default function SoftSkillPage() {
  const [classes, setClasses] = useState<SoftSkillClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'semua' | 'selesai' | 'mendatang'>('semua');
  const [searchQuery, setSearchQuery] = useState('');

  const todayStr = new Date().toISOString().slice(0, 10);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/soft-skill');
      const json = await res.json();
      if (res.ok) {
        setClasses(json.data || []);
      } else {
        setError(json.error || 'Gagal mengambil data kelas');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Apakah Anda yakin ingin menghapus kelas ini?')) return;

    try {
      const res = await fetch(`/api/soft-skill/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setClasses(classes.filter((c) => c.id !== id));
      } else {
        const json = await res.json();
        alert(json.error || 'Gagal menghapus kelas');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filtered Classes based on tab and search query
  const filteredClasses = useMemo(() => {
    return classes.filter((item) => {
      const isPast = item.tanggal < todayStr;
      const isToday = item.tanggal === todayStr;
      const isFuture = item.tanggal > todayStr;

      const matchTab = 
        activeTab === 'semua' ? true :
        activeTab === 'selesai' ? (isPast || isToday) :
        isFuture;

      const matchSearch = 
        item.judul_materi.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.pengisi_acara.toLowerCase().includes(searchQuery.toLowerCase());

      return matchTab && matchSearch;
    });
  }, [classes, activeTab, searchQuery, todayStr]);

  const countSelesai = classes.filter(c => c.tanggal <= todayStr).length;
  const countMendatang = classes.filter(c => c.tanggal > todayStr).length;

  return (
    <div className="min-h-screen bg-[#f4f4f0] font-sans pb-16">
      {/* Header */}
      <header className="bg-white border-b-4 border-black mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="p-2 text-black hover:bg-black hover:text-white neo-border transition-colors">
              <ArrowLeft className="w-5 h-5 stroke-[3]" />
            </Link>
            <div>
              <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100 px-2 py-0.5 rounded border border-purple-300">
                Manajemen Pelatihan Soft Skill
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight uppercase">
                Jadwal & Riwayat Kelas Soft Skill
              </h1>
            </div>
          </div>
          <Link
            href="/admin/soft-skill/create"
            className="bg-[#74ee15] hover:bg-green-500 text-black px-4 py-2.5 neo-btn flex items-center gap-2 font-black uppercase text-xs shadow-md"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> + Buat Jadwal Baru
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Filter Bar & Tabs */}
        <div className="bg-white neo-card p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('semua')}
              className={`px-3.5 py-2 text-xs font-black uppercase neo-btn transition-all ${
                activeTab === 'semua' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              Semua Kelas ({classes.length})
            </button>

            <button
              onClick={() => setActiveTab('selesai')}
              className={`px-3.5 py-2 text-xs font-black uppercase neo-btn transition-all flex items-center gap-1.5 ${
                activeTab === 'selesai' ? 'bg-[#00e676] text-black' : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Sudah Terjadi ({countSelesai})</span>
            </button>

            <button
              onClick={() => setActiveTab('mendatang')}
              className={`px-3.5 py-2 text-xs font-black uppercase neo-btn transition-all flex items-center gap-1.5 ${
                activeTab === 'mendatang' ? 'bg-[#00f0ff] text-black' : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Mendatang ({countMendatang})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input 
              type="text"
              placeholder="Cari materi / pemateri..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full neo-input pl-9 pr-3 py-2 text-xs font-bold bg-white text-black"
            />
          </div>

        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex justify-center py-20">
            <span className="animate-pulse font-black text-sm uppercase text-gray-600">Memuat Jadwal & Riwayat Kelas...</span>
          </div>
        ) : error ? (
          <div className="bg-[#ff003c] text-white p-6 neo-card text-center max-w-md mx-auto">
            <p className="font-bold text-xs uppercase">{error}</p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="bg-white p-10 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center max-w-lg mx-auto space-y-3">
            <BookOpen className="w-12 h-12 mx-auto text-gray-400 stroke-[2]" />
            <h3 className="text-base font-black uppercase text-black">Tidak Ada Kelas Ditemukan</h3>
            <p className="text-xs font-bold text-gray-600">
              {activeTab === 'selesai' ? 'Belum ada riwayat kelas soft skill yang sudah dilaksanakan.' : 'Belum ada jadwal kelas soft skill.'}
            </p>
            <Link
              href="/admin/soft-skill/create"
              className="inline-flex items-center gap-2 bg-[#74ee15] text-black px-4 py-2 neo-btn font-black text-xs uppercase"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Buat Jadwal Baru
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClasses.map((item) => {
              const isPast = item.tanggal < todayStr;
              const isToday = item.tanggal === todayStr;

              return (
                <div
                  key={item.id}
                  className="bg-white border-4 border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform space-y-4"
                >
                  <div>
                    {/* Status Badge */}
                    <div className="flex justify-between items-start mb-3">
                      {isToday ? (
                        <span className="bg-[#ff003c] text-white text-[10px] font-black uppercase px-2.5 py-1 neo-border flex items-center gap-1 animate-pulse">
                          🔴 HARI INI
                        </span>
                      ) : isPast ? (
                        <span className="bg-[#74ee15] text-black text-[10px] font-black uppercase px-2.5 py-1 neo-border flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> SUDAH SELESAI
                        </span>
                      ) : (
                        <span className="bg-[#00f0ff] text-black text-[10px] font-black uppercase px-2.5 py-1 neo-border flex items-center gap-1">
                          🗓️ MENDATANG
                        </span>
                      )}

                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                        title="Hapus Kelas"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h2 className="text-lg font-black text-black uppercase mb-1 line-clamp-2">
                      {item.judul_materi}
                    </h2>
                    <p className="text-xs font-bold text-gray-700 mb-3">
                      Pemateri: <span className="text-black underline">{item.pengisi_acara}</span>
                    </p>

                    {/* Date & Time Info */}
                    <div className="space-y-1.5 text-xs font-bold text-gray-600 border-t-2 border-gray-200 pt-3 mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-black shrink-0" />
                        <span>{new Date(item.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-black shrink-0" />
                        <span>
                          {item.waktu_mulai.slice(0, 5)}
                          {item.waktu_selesai ? ` - ${item.waktu_selesai.slice(0, 5)}` : ''} WIB
                        </span>
                      </div>
                    </div>

                    {/* Attendance Summary Box */}
                    {item.summary && (
                      <div className="bg-[#fffde7] neo-border p-2.5 flex items-center justify-between text-xs font-black text-black">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-purple-700" />
                          <span>Status Kehadiran Siswa:</span>
                        </div>
                        <span className="bg-[#00e676] text-black px-2 py-0.5 neo-border text-[11px]">
                          {item.summary.totalHadir} Hadir
                        </span>
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/admin/soft-skill/${item.id}`}
                    className="w-full text-center bg-[#ffe600] hover:bg-[#e6cf00] text-black font-black uppercase py-2.5 neo-btn text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95"
                  >
                    <UserCheck className="w-4 h-4 stroke-[3]" />
                    <span>LIHAT DAFTAR SISWA & PRESENSI</span>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
