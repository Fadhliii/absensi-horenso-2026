'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

export default function CreateSoftSkillPage() {
  const router = useRouter();
  const [judulMateri, setJudulMateri] = useState('');
  const [pengisiAcara, setPengisiAcara] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [waktuMulai, setWaktuMulai] = useState('');
  const [waktuSelesai, setWaktuSelesai] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judulMateri || !pengisiAcara || !tanggal || !waktuMulai) {
      setError('Harap isi semua kolom wajib!');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/soft-skill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          judul_materi: judulMateri,
          pengisi_acara: pengisiAcara,
          tanggal,
          waktu_mulai: waktuMulai,
          waktu_selesai: waktuSelesai || null,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        router.push('/admin/soft-skill');
      } else {
        setError(json.error || 'Gagal membuat jadwal');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f4f0] font-sans pb-12">
      {/* Header */}
      <header className="bg-white border-b-4 border-black mb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex items-center gap-4">
          <Link href="/admin/soft-skill" className="text-black hover:text-gray-700">
            <ArrowLeft className="w-6 h-6 stroke-[3]" />
          </Link>
          <h1 className="text-2xl font-black text-black tracking-tight uppercase">
            Tambah Jadwal Soft Skill Baru
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="bg-white border-4 border-black p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          {error && (
            <div className="mb-6 bg-[#ff003c] text-white p-4 neo-card text-center font-bold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-black uppercase text-black mb-2">
                Judul Materi / Sesi <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={judulMateri}
                onChange={(e) => setJudulMateri(e.target.value)}
                placeholder="Contoh: Communication & Personal Branding"
                required
                className="w-full px-4 py-3 border-3 border-black font-bold focus:outline-none focus:bg-[#ffe700]/20 text-black placeholder:text-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-black uppercase text-black mb-2">
                Pengisi Acara / Pemateri <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={pengisiAcara}
                onChange={(e) => setPengisiAcara(e.target.value)}
                placeholder="Contoh: Dr. Supriyadi, M.Psi"
                required
                className="w-full px-4 py-3 border-3 border-black font-bold focus:outline-none focus:bg-[#ffe700]/20 text-black placeholder:text-gray-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-black uppercase text-black mb-2">
                  Tanggal Pelaksanaan <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-3 border-black font-bold focus:outline-none focus:bg-[#ffe700]/20 text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-black uppercase text-black mb-2">
                  Jam Mulai <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={waktuMulai}
                  onChange={(e) => setWaktuMulai(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-3 border-black font-bold focus:outline-none focus:bg-[#ffe700]/20 text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-black uppercase text-black mb-2">
                  Jam Selesai (Opsional)
                </label>
                <input
                  type="time"
                  value={waktuSelesai}
                  onChange={(e) => setWaktuSelesai(e.target.value)}
                  className="w-full px-4 py-3 border-3 border-black font-bold focus:outline-none focus:bg-[#ffe700]/20 text-black"
                />
              </div>
            </div>

            <div className="pt-4 border-t-2 border-black flex justify-end gap-3">
              <Link
                href="/admin/soft-skill"
                className="px-5 py-3 border-2 border-black font-black uppercase text-sm bg-gray-100 hover:bg-gray-200"
              >
                Batal
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 border-3 border-black font-black uppercase text-sm bg-[#74ee15] hover:bg-[#60ce0f] flex items-center gap-2 neo-btn active:translate-x-1 active:translate-y-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 stroke-[3]" /> Simpan Jadwal
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
