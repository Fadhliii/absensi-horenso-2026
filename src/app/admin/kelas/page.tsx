'use client';

import { useState, useEffect } from 'react';
import { getAllKelasAction, createKelasAction, updateKelasAction, deleteKelasAction } from '@/app/actions/kelas';
import IndonesianClock from '@/components/IndonesianClock';
import { LogOut, ArrowLeft, Plus, Edit2, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function MasterKelasPage() {
  const [data, setData] = useState<{id: string, nama_kelas: string, deskripsi: string | null}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentId, setCurrentId] = useState('');
  const [formData, setFormData] = useState({ nama_kelas: '', deskripsi: '' });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const res = await getAllKelasAction();
    if (res.success && res.data) {
      setData(res.data);
    } else {
      setError(res.error || 'Gagal memuat data kelas');
    }
    setLoading(false);
  }

  function openCreateModal() {
    setModalMode('create');
    setFormData({ nama_kelas: '', deskripsi: '' });
    setIsModalOpen(true);
  }

  function openEditModal(kelas: any) {
    setModalMode('edit');
    setCurrentId(kelas.id);
    setFormData({ nama_kelas: kelas.nama_kelas, deskripsi: kelas.deskripsi || '' });
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.append('nama_kelas', formData.nama_kelas);
    fd.append('deskripsi', formData.deskripsi);
    
    if (modalMode === 'edit') {
      fd.append('id', currentId);
      await updateKelasAction(fd);
    } else {
      await createKelasAction(fd);
    }
    
    setIsModalOpen(false);
    fetchData();
  }

  async function handleDelete(id: string) {
    if (confirm('Yakin ingin menghapus kelas ini? Siswa yang berada di kelas ini akan menjadi tanpa kelas.')) {
      const fd = new FormData();
      fd.append('id', id);
      await deleteKelasAction(fd);
      fetchData();
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f4f0] font-sans">
      <header className="bg-white border-b-4 border-black sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="p-2 text-black hover:bg-black hover:text-white neo-border transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-black text-black uppercase tracking-tight">Master Kelas</h1>
          </div>
          <div className="flex items-center gap-4">
            <IndonesianClock className="hidden sm:inline-flex" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-[#ff1744] text-white neo-border p-4 mb-6 text-xs font-black uppercase">
            ⚠️ {error}
          </div>
        )}

        <div className="mb-6">
          <button onClick={openCreateModal} className="flex items-center bg-[#00f0ff] hover:bg-[#00d8e6] text-black px-4 py-2 neo-btn">
            <Plus className="w-5 h-5 mr-2" /> Tambah Kelas
          </button>
        </div>

        <div className="bg-white neo-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y-3 divide-black">
              <thead className="bg-[#ffe600] border-b-3 border-black">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-black uppercase tracking-wider">Nama Kelas</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-black uppercase tracking-wider">Deskripsi</th>
                  <th className="px-6 py-4 text-right text-xs font-black text-black uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y-2 divide-gray-200">
                {loading ? (
                  <tr><td colSpan={3} className="px-6 py-10 text-center font-bold">Memuat...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-10 text-center font-bold">Belum ada data kelas.</td></tr>
                ) : (
                  data.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-bold">{item.nama_kelas}</td>
                      <td className="px-6 py-4 font-medium text-gray-700">{item.deskripsi || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button onClick={() => openEditModal(item)} className="inline-flex text-blue-600 hover:text-blue-900 mr-4 font-bold">
                          <Edit2 className="w-4 h-4 mr-1" /> Edit
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="inline-flex text-red-600 hover:text-red-900 font-bold">
                          <Trash2 className="w-4 h-4 mr-1" /> Hapus
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal CRUD */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative z-50 w-full max-w-md bg-white neo-card shadow-none">
            <div className="bg-[#00f0ff] p-4 border-b-3 border-black">
              <h3 className="text-xl font-black uppercase text-black">
                {modalMode === 'create' ? 'Tambah Kelas Baru' : 'Edit Kelas'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-black uppercase text-black mb-1">Nama Kelas *</label>
                  <input
                    type="text"
                    required
                    value={formData.nama_kelas}
                    onChange={(e) => setFormData({...formData, nama_kelas: e.target.value})}
                    className="w-full neo-input p-2 font-bold"
                    placeholder="Contoh: N4-A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black uppercase text-black mb-1">Deskripsi</label>
                  <textarea
                    value={formData.deskripsi}
                    onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
                    className="w-full neo-input p-2 font-bold"
                    rows={3}
                    placeholder="Contoh: Batch Musim Gugur"
                  ></textarea>
                </div>
              </div>
              <div className="mt-8 flex gap-4">
                <button type="submit" className="flex-1 bg-[#ffe600] text-black neo-btn py-2">
                  Simpan
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white text-black neo-btn py-2">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
