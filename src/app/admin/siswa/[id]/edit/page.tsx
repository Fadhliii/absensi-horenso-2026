'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSiswaByIdAction, updateSiswaProfileAction } from '@/app/actions/master';
import { ArrowLeft, Save, Loader2, Eye, EyeOff } from 'lucide-react';
import React from 'react';
import Link from 'next/link';

export default function EditSiswaPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params);
  
  const [data, setData] = useState({ name: '', email: '', phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const res = await getSiswaByIdAction(id);
        if (res.error) {
          setError(res.error);
        } else if (res.data) {
          setData({
            name: res.data.name || '',
            email: res.data.email || '',
            phone: res.data.phone || '',
            password: ''
          });
        }
      } catch (err: any) {
        setError(err.message || 'Gagal memuat data siswa.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const formData = new FormData(e.currentTarget);
      const res = await updateSiswaProfileAction(id, formData);
      if (res.error) {
        setError(res.error);
      } else {
        router.push('/admin/siswa');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <Link href="/admin/siswa" className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Edit Profil Siswa</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 mt-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 border-b pb-4">Informasi Profil</h2>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm font-medium rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="name"
                  required
                  value={data.name}
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="Masukkan nama lengkap"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Aktif <span className="text-red-500">*</span>
                </label>
                <input 
                  type="email" 
                  name="email"
                  required
                  value={data.email}
                  onChange={(e) => setData({ ...data, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="email@contoh.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nomor Telepon/WA
                </label>
                <input 
                  type="text" 
                  name="phone"
                  value={data.phone}
                  onChange={(e) => setData({ ...data, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="08123456789"
                />
              </div>

              <div className="pt-2 border-t mt-6">
                <h3 className="text-md font-semibold text-gray-900 mb-4 mt-4">Keamanan</h3>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password Baru (Opsional)
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={data.password}
                    onChange={(e) => setData({ ...data, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 pr-10 font-mono"
                    placeholder="Kosongkan jika tidak ingin diubah"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-700 hover:text-black"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-800 font-medium">
                  Jika diisi, siswa akan dipaksa mengganti password tersebut saat login berikutnya.
                </p>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t mt-6">
                <Link 
                  href="/admin/siswa" 
                  className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Batal
                </Link>
                <button 
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" /> Simpan Perubahan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
