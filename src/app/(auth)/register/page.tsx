'use client';

import { useState, useEffect } from 'react';
import { registerAction } from '@/app/actions/auth';
import { getPublicPerusahaanWithBatchesAction } from '@/app/actions/master';
import IndonesianClock from '@/components/IndonesianClock';
import Link from 'next/link';
import { Building2, Layers } from 'lucide-react';

type Perusahaan = {
  id: string;
  nama: string;
};

type Batch = {
  id: string;
  perusahaan_id: string;
  nama_batch: string;
  tanggal_berangkat?: string | null;
};

export default function RegisterPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form selections
  const [role, setRole] = useState<'siswa' | 'instruktur'>('siswa');
  const [perusahaanList, setPerusahaanList] = useState<Perusahaan[]>([]);
  const [allBatches, setAllBatches] = useState<Batch[]>([]);
  const [selectedPerusahaanId, setSelectedPerusahaanId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');

  useEffect(() => {
    async function loadPerusahaanAndBatches() {
      const res = await getPublicPerusahaanWithBatchesAction();
      if (res.perusahaan) setPerusahaanList(res.perusahaan);
      if (res.batches) setAllBatches(res.batches);
    }
    loadPerusahaanAndBatches();
  }, []);

  // Filter batches for selected company
  const availableBatches = allBatches.filter(b => b.perusahaan_id === selectedPerusahaanId);

  const handlePerusahaanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    setSelectedPerusahaanId(pId);
    setSelectedBatchId(''); // reset batch selection
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirm = formData.get('confirm_password') as string;

    if (password !== confirm) {
      setError('Password dan Konfirmasi Password tidak cocok!');
      setLoading(false);
      return;
    }

    const result = await registerAction(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else if (result?.success) {
      setSuccess(true);
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="mb-6">
          <IndonesianClock />
        </div>
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registrasi Berhasil!</h2>
          <p className="text-gray-600 text-sm mb-6">Akun kamu sedang menunggu persetujuan admin. Kamu baru bisa login setelah akun di-approve.</p>
          <Link href="/login" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md shadow-blue-500/20">
            Kembali ke Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 py-8">
      {/* Live Indonesian Clock Standard Header */}
      <div className="mb-4">
        <IndonesianClock />
      </div>

      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Daftar Akun Baru</h2>
          <p className="text-xs text-gray-500 font-medium mt-1">Lengkapi data diri Anda untuk memulai registrasi</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Daftar Sebagai *</label>
            <select
              name="role"
              required
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-gray-900 bg-white"
            >
              <option value="siswa">Siswa (Peserta Pelatihan)</option>
              <option value="instruktur">Instruktur (Pengajar)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nama Lengkap *</label>
            <input 
              type="text" 
              name="name" 
              required
              placeholder="Masukkan nama lengkap"
              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email *</label>
            <input 
              type="email" 
              name="email" 
              required
              placeholder="contoh@email.com"
              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">No. Handphone *</label>
            <input 
              type="tel" 
              name="phone" 
              required
              placeholder="08123456789"
              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-gray-900"
            />
          </div>

          {/* Opsi Perusahaan & Batch untuk Siswa */}
          {role === 'siswa' && (
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
              <div>
                <label className="block text-xs font-bold text-blue-900 uppercase mb-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" /> Perusahaan Mitra (Opsional)
                </label>
                <select
                  name="perusahaan_id"
                  value={selectedPerusahaanId}
                  onChange={handlePerusahaanChange}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-gray-900 bg-white"
                >
                  <option value="">-- Belum Memiliki Perusahaan / LPK Only --</option>
                  {perusahaanList.map(p => (
                    <option key={p.id} value={p.id}>{p.nama}</option>
                  ))}
                </select>
              </div>

              {selectedPerusahaanId && (
                <div>
                  <label className="block text-xs font-bold text-blue-900 uppercase mb-1 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-600" /> Pilih Batch / Angkatan *
                  </label>
                  <select
                    name="batch_id"
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    required={availableBatches.length > 0}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-gray-900 bg-white"
                  >
                    {availableBatches.length === 0 ? (
                      <option value="">-- Tidak ada batch tersedia di perusahaan ini --</option>
                    ) : (
                      <>
                        <option value="">-- Pilih Batch --</option>
                        {availableBatches.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.nama_batch} {b.tanggal_berangkat ? `(Berangkat: ${new Date(b.tanggal_berangkat).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})` : ''}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Password *</label>
            <input 
              type="password" 
              name="password" 
              required
              minLength={6}
              placeholder="Minimal 6 karakter"
              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Konfirmasi Password *</label>
            <input 
              type="password" 
              name="confirm_password" 
              required
              minLength={6}
              placeholder="Ulangi password di atas"
              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-gray-900"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Memproses...' : 'Daftar Sekarang'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-600 font-medium mt-6">
          Sudah punya akun? <Link href="/login" className="text-blue-600 font-bold hover:underline">Masuk di sini</Link>
        </p>
      </div>
    </div>
  );
}
