'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Calendar, Clock, UserCheck, BookOpen, Trash2 } from 'lucide-react';

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
}

export default function SoftSkillPage() {
  const [classes, setClasses] = useState<SoftSkillClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <div className="min-h-screen bg-[#f4f4f0] font-sans pb-12">
      {/* Header */}
      <header className="bg-white border-b-4 border-black mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="text-black hover:text-gray-700">
              <ArrowLeft className="w-6 h-6 stroke-[3]" />
            </Link>
            <h1 className="text-2xl font-black text-black tracking-tight uppercase">
              Jadwal Kelas Soft Skill
            </h1>
          </div>
          <Link
            href="/admin/soft-skill/create"
            className="bg-[#74ee15] text-black px-4 py-2 neo-btn flex items-center gap-2 font-black uppercase text-sm"
          >
            <Plus className="w-5 h-5 stroke-[3]" /> Buat Jadwal
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <span className="animate-pulse font-bold text-gray-600">Memuat Jadwal Kelas...</span>
          </div>
        ) : error ? (
          <div className="bg-[#ff003c] text-white p-6 neo-card text-center max-w-md mx-auto">
            <p className="font-bold">{error}</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="bg-white p-8 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center max-w-lg mx-auto">
            <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-3 stroke-[2]" />
            <h3 className="text-lg font-black uppercase text-black mb-1">Belum Ada Jadwal</h3>
            <p className="text-sm font-semibold text-gray-600 mb-4">
              Belum ada materi atau pemateri soft skill yang dijadwalkan.
            </p>
            <Link
              href="/admin/soft-skill/create"
              className="inline-flex items-center gap-2 bg-[#74ee15] text-black px-4 py-2 neo-btn font-black text-sm uppercase"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Buat Jadwal Baru
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((item) => (
              <div
                key={item.id}
                className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-[#ffe700] text-black text-xs font-black uppercase px-2.5 py-1 border-2 border-black">
                      Soft Skill
                    </span>
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                      title="Hapus Kelas"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <h2 className="text-xl font-black text-black uppercase mb-2 line-clamp-2">
                    {item.judul_materi}
                  </h2>
                  <p className="text-sm font-bold text-gray-700 mb-4">
                    Pemateri: <span className="text-black underline">{item.pengisi_acara}</span>
                  </p>

                  <div className="space-y-1.5 text-xs font-bold text-gray-600 border-t-2 border-dashed border-gray-300 pt-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-black" />
                      <span>{new Date(item.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-black" />
                      <span>
                        {item.waktu_mulai.slice(0, 5)}
                        {item.waktu_selesai ? ` - ${item.waktu_selesai.slice(0, 5)}` : ''} WIB
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/admin/soft-skill/${item.id}`}
                  className="w-full text-center bg-[#4deeea] text-black font-black uppercase py-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#34d8d4] transition-colors flex items-center justify-center gap-2"
                >
                  <UserCheck className="w-4 h-4 stroke-[3]" /> Absen Siswa / Detail
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
