'use client';

import { useState, useEffect } from 'react';
import { registerAction } from '@/app/actions/auth';
import { getPublicPerusahaanWithBatchesAction } from '@/app/actions/master';
import IndonesianClock from '@/components/IndonesianClock';
import Link from 'next/link';
import { Building2, Layers, Eye, EyeOff, PlusCircle } from 'lucide-react';

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

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form selections
  const [role, setRole] = useState<'siswa' | 'instruktur'>('siswa');
  const [perusahaanList, setPerusahaanList] = useState<Perusahaan[]>([]);
  const [allBatches, setAllBatches] = useState<Batch[]>([]);
  const [selectedPerusahaanId, setSelectedPerusahaanId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [customPerusahaanNama, setCustomPerusahaanNama] = useState('');
  const [customBatchNama, setCustomBatchNama] = useState('');

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

    if (role === 'siswa' && selectedPerusahaanId === 'other' && !customPerusahaanNama.trim()) {
      setError('Harap isi nama perusahaan baru kamu!');
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f4f0] p-4 font-sans">
        <div className="mb-6">
          <IndonesianClock />
        </div>
        <div className="max-w-md w-full bg-[#00f0ff] neo-card neo-shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-[#00e676] text-black neo-border neo-shadow-sm flex items-center justify-center mx-auto mb-4 text-2xl font-black">✓</div>
          <h2 className="text-2xl font-black text-black uppercase mb-2">Registrasi Berhasil!</h2>
          <p className="text-black font-bold text-sm mb-6">Akun kamu sedang menunggu persetujuan admin. Kamu baru bisa login setelah akun di-approve.</p>
          <Link href="/login" className="inline-block bg-[#ffe600] text-black neo-btn py-3 px-8 text-sm font-black uppercase">
            Kembali ke Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f4f0] p-4 py-8 font-sans">
      {/* Live Indonesian Clock Standard Header */}
      <div className="mb-6">
        <IndonesianClock />
      </div>

      <div className="max-w-md w-full bg-[#00f0ff] neo-card neo-shadow-lg p-8">
        <div className="text-center mb-8 border-b-4 border-black pb-4">
          <h2 className="text-3xl font-black text-black uppercase tracking-tight">Daftar Akun Baru</h2>
          <p className="text-xs text-black font-bold uppercase mt-1">Sistem Absensi & Penempatan LPK</p>
        </div>

        {error && (
          <div className="bg-[#ff1744] text-white neo-border p-4 mb-6 text-xs font-black uppercase">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-black text-black uppercase mb-1">Daftar Sebagai *</label>
            <select
              name="role"
              required
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full px-3.5 py-2.5 neo-input font-bold"
            >
              <option value="siswa">Siswa (Peserta Pelatihan)</option>
              <option value="instruktur">Instruktur (Pengajar)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-black uppercase mb-1">Nama Lengkap *</label>
            <input 
              type="text" 
              name="name" 
              required
              placeholder="Masukkan nama lengkap"
              className="w-full px-3.5 py-2.5 neo-input font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-black uppercase mb-1">Email *</label>
            <input 
              type="email" 
              name="email" 
              required
              placeholder="contoh@email.com"
              className="w-full px-3.5 py-2.5 neo-input font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-black uppercase mb-1">No. Handphone *</label>
            <input 
              type="tel" 
              name="phone" 
              required
              placeholder="08123456789"
              className="w-full px-3.5 py-2.5 neo-input font-bold"
            />
          </div>

          {/* Opsi Perusahaan & Batch untuk Siswa */}
          {role === 'siswa' && (
            <div className="p-4 bg-[#fff59d] neo-border neo-shadow-sm space-y-3">
              <div>
                <label className="block text-xs font-black text-black uppercase mb-1 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-black" /> Perusahaan Mitra (Opsional)
                </label>
                <select
                  name="perusahaan_id"
                  value={selectedPerusahaanId}
                  onChange={handlePerusahaanChange}
                  className="w-full px-3 py-2 neo-input text-xs font-bold"
                >
                  <option value="">-- Belum Memiliki Perusahaan / LPK Only --</option>
                  {perusahaanList.map(p => (
                    <option key={p.id} value={p.id}>{p.nama}</option>
                  ))}
                  <option value="other">➕ Lainnya (Tuliskan Perusahaan Baru...)</option>
                </select>
              </div>

              {/* Input Perusahaan Baru jika memilih Lainnya */}
              {selectedPerusahaanId === 'other' && (
                <div className="p-3 bg-white neo-border space-y-3 animate-fadeIn">
                  <div>
                    <label className="block text-[11px] font-black text-purple-900 uppercase mb-1 flex items-center gap-1">
                      <PlusCircle className="w-3.5 h-3.5 text-purple-700" /> Nama Perusahaan Baru *
                    </label>
                    <input 
                      type="text"
                      name="nama_perusahaan_baru"
                      required
                      value={customPerusahaanNama}
                      onChange={(e) => setCustomPerusahaanNama(e.target.value)}
                      placeholder="Masukkan nama perusahaan..."
                      className="w-full px-3 py-2 neo-input text-xs font-bold bg-purple-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-purple-900 uppercase mb-1">
                      Nama Batch / Angkatan (Opsional)
                    </label>
                    <input 
                      type="text"
                      name="nama_batch_baru"
                      value={customBatchNama}
                      onChange={(e) => setCustomBatchNama(e.target.value)}
                      placeholder="Contoh: Batch 1 / Angkatan 2026"
                      className="w-full px-3 py-2 neo-input text-xs font-bold bg-purple-50"
                    />
                  </div>
                </div>
              )}

              {selectedPerusahaanId && selectedPerusahaanId !== 'other' && (
                <div>
                  <label className="block text-xs font-black text-black uppercase mb-1 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-black" /> Pilih Batch / Angkatan (Opsional)
                  </label>
                  <select
                    name="batch_id"
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="w-full px-3 py-2 neo-input text-xs font-bold"
                  >
                    {availableBatches.length === 0 ? (
                      <option value="">-- Belum ada batch tersedia --</option>
                    ) : (
                      <>
                        <option value="">-- Belum / Tanpa Batch (Opsional) --</option>
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

          {/* Password Input dengan Toggle Show Password */}
          <div>
            <label className="block text-xs font-black text-black uppercase mb-1">Password *</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                name="password" 
                required
                minLength={6}
                placeholder="Minimal 6 karakter"
                className="w-full px-3.5 py-2.5 pr-10 neo-input font-bold"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-black hover:text-gray-700 transition-colors"
                title={showPassword ? 'Sembunyikan Password' : 'Tampilkan Password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4 stroke-[2.5]" /> : <Eye className="w-4 h-4 stroke-[2.5]" />}
              </button>
            </div>
          </div>

          {/* Confirm Password Input dengan Toggle Show Password */}
          <div>
            <label className="block text-xs font-black text-black uppercase mb-1">Konfirmasi Password *</label>
            <div className="relative">
              <input 
                type={showConfirmPassword ? 'text' : 'password'} 
                name="confirm_password" 
                required
                minLength={6}
                placeholder="Ulangi password"
                className="w-full px-3.5 py-2.5 pr-10 neo-input font-bold"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-black hover:text-gray-700 transition-colors"
                title={showConfirmPassword ? 'Sembunyikan Password' : 'Tampilkan Password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4 stroke-[2.5]" /> : <Eye className="w-4 h-4 stroke-[2.5]" />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#ffe600] hover:bg-[#ebd300] text-black font-black uppercase neo-btn py-3 mt-2 text-sm shadow-md"
          >
            {loading ? 'Memproses Registrasi...' : 'Daftar Sekarang'}
          </button>
        </form>

        <p className="text-center text-xs font-bold text-black uppercase mt-6">
          Sudah punya akun? <Link href="/login" className="underline font-black hover:text-blue-700">Masuk di sini</Link>
        </p>
      </div>
    </div>
  );
}
