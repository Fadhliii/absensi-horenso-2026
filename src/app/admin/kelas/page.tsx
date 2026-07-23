'use client';

import { useState, useEffect } from 'react';
import { 
  getAllKelasAction, 
  createKelasAction, 
  updateKelasAction, 
  deleteKelasAction,
  getSiswaInKelasAction,
  getAllApprovedSiswaForKelasAction,
  addSiswaToKelasAction,
  removeSiswaFromKelasAction
} from '@/app/actions/kelas';
import IndonesianClock from '@/components/IndonesianClock';
import { ArrowLeft, Plus, Edit2, Trash2, Users, UserPlus, UserMinus, X } from 'lucide-react';
import Link from 'next/link';

type KelasItem = {
  id: string;
  nama_kelas: string;
  deskripsi: string | null;
  jumlah_siswa: number;
  created_at?: string;
  updated_at?: string;
};

type SiswaInKelas = {
  id: string; // siswa_id
  user_id: string;
  status_pendidikan?: string | null;
  users: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  } | null;
};

type AllSiswaOption = {
  id: string; // user_id
  name: string;
  email: string;
  siswa: {
    id: string; // siswa_id
    kelas_id: string | null;
    status_pendidikan?: string | null;
    master_kelas?: {
      nama_kelas: string;
    } | null;
  } | null;
};

export default function MasterKelasPage() {
  const [data, setData] = useState<KelasItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal Edit / Create Kelas
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentId, setCurrentId] = useState('');
  const [formData, setFormData] = useState({ nama_kelas: '', deskripsi: '' });

  // Modal Kelola Siswa di Kelas
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedKelas, setSelectedKelas] = useState<KelasItem | null>(null);
  const [siswaInKelas, setSiswaInKelas] = useState<SiswaInKelas[]>([]);
  const [availableSiswa, setAvailableSiswa] = useState<AllSiswaOption[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedAddSiswaId, setSelectedAddSiswaId] = useState('');

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

  function openEditModal(kelas: KelasItem, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
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

  async function handleDelete(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (confirm('Yakin ingin menghapus kelas ini? Siswa yang berada di kelas ini akan menjadi tanpa kelas.')) {
      const fd = new FormData();
      fd.append('id', id);
      await deleteKelasAction(fd);
      fetchData();
    }
  }

  // Open Detail / Student Management Modal
  async function openDetailModal(kelas: KelasItem) {
    setSelectedKelas(kelas);
    setIsDetailModalOpen(true);
    await refreshDetailSiswa(kelas.id);
  }

  async function refreshDetailSiswa(kelasId: string) {
    setLoadingDetail(true);
    const [resInKelas, resAll] = await Promise.all([
      getSiswaInKelasAction(kelasId),
      getAllApprovedSiswaForKelasAction()
    ]);

    if (resInKelas.success && resInKelas.data) {
      setSiswaInKelas(resInKelas.data as any);
    }
    if (resAll.success && resAll.data) {
      setAvailableSiswa(resAll.data as any);
    }
    setLoadingDetail(false);
  }

  async function handleAddSiswa() {
    if (!selectedAddSiswaId || !selectedKelas) return;
    const res = await addSiswaToKelasAction(selectedAddSiswaId, selectedKelas.id);
    if (res.success) {
      setSelectedAddSiswaId('');
      await refreshDetailSiswa(selectedKelas.id);
      fetchData(); // refresh count
    } else {
      alert('Gagal menambahkan siswa: ' + res.error);
    }
  }

  async function handleRemoveSiswa(siswaId: string) {
    if (!selectedKelas) return;
    if (confirm('Keluarkan siswa ini dari kelas?')) {
      const res = await removeSiswaFromKelasAction(siswaId);
      if (res.success) {
        await refreshDetailSiswa(selectedKelas.id);
        fetchData(); // refresh count
      } else {
        alert('Gagal mengeluarkan siswa: ' + res.error);
      }
    }
  }

  function formatDateStr(dateStr?: string | null) {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(d);
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f4f0] font-sans">
      <header className="bg-white border-b-4 border-black sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="p-2 text-black hover:bg-black hover:text-white neo-border transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg sm:text-xl font-black text-black uppercase tracking-tight">Master Kelas</h1>
          </div>
          <div className="flex items-center gap-4">
            <IndonesianClock className="w-full sm:w-auto" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {error && (
          <div className="bg-[#ff1744] text-white neo-border p-4 mb-6 text-xs font-black uppercase">
            ⚠️ {error}
          </div>
        )}

        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-base font-black text-black uppercase tracking-tight">Daftar Kelas Pembelajaran</h2>
            <p className="text-xs font-bold text-gray-600">Klik baris kelas untuk melihat & mengedit anggota murid.</p>
          </div>
          <button onClick={openCreateModal} className="flex items-center bg-[#00f0ff] hover:bg-[#00d8e6] text-black px-4 py-2 neo-btn text-xs font-black uppercase">
            <Plus className="w-4 h-4 mr-2" /> Tambah Kelas
          </button>
        </div>

        <div className="bg-white neo-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y-3 divide-black">
              <thead className="bg-[#ffe600] border-b-3 border-black">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-black uppercase tracking-wider">Nama Kelas</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-black uppercase tracking-wider">Deskripsi</th>
                  <th className="px-6 py-4 text-center text-xs font-black text-black uppercase tracking-wider">Jumlah Siswa</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-black uppercase tracking-wider">Tanggal Dibuat</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-black uppercase tracking-wider">Terakhir Diedit</th>
                  <th className="px-6 py-4 text-right text-xs font-black text-black uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y-2 divide-gray-200">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-10 text-center font-bold">Memuat data kelas...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-10 text-center font-bold">Belum ada data kelas.</td></tr>
                ) : (
                  data.map(item => (
                    <tr 
                      key={item.id} 
                      onClick={() => openDetailModal(item)}
                      className="hover:bg-[#ffe600] hover:text-black font-bold cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-black text-sm uppercase">{item.nama_kelas}</span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-700 max-w-xs truncate">{item.deskripsi || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="bg-[#00f0ff] text-black px-2.5 py-1 neo-border text-xs font-black">
                          👥 {item.jumlah_siswa} Siswa
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 font-bold">
                        {formatDateStr(item.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 font-bold">
                        {formatDateStr(item.updated_at || item.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); openDetailModal(item); }} 
                          className="inline-flex items-center bg-[#74ee15] hover:bg-[#60d60e] text-black px-2.5 py-1 neo-border text-xs font-black uppercase"
                        >
                          <Users className="w-3.5 h-3.5 mr-1" /> Kelola Siswa
                        </button>
                        <button 
                          onClick={(e) => openEditModal(item, e)} 
                          className="inline-flex items-center bg-white hover:bg-black hover:text-white px-2 py-1 neo-border text-xs font-black uppercase"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                        </button>
                        <button 
                          onClick={(e) => handleDelete(item.id, e)} 
                          className="inline-flex items-center bg-[#ff003c] text-white px-2 py-1 neo-border text-xs font-black uppercase"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus
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

      {/* Modal CRUD Kelas */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative z-50 w-full max-w-md bg-white neo-card shadow-none">
            <div className="bg-[#00f0ff] p-4 border-b-3 border-black flex justify-between items-center">
              <h3 className="text-lg font-black uppercase text-black">
                {modalMode === 'create' ? 'Tambah Kelas Baru' : 'Edit Kelas'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-black hover:text-white neo-border">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-black uppercase text-black mb-1">Nama Kelas *</label>
                <input
                  type="text"
                  required
                  value={formData.nama_kelas}
                  onChange={(e) => setFormData({...formData, nama_kelas: e.target.value})}
                  className="w-full neo-input p-2 font-bold text-sm"
                  placeholder="Contoh: Kelas N4-A"
                />
              </div>
              <div>
                <label className="block text-sm font-black uppercase text-black mb-1">Deskripsi</label>
                <textarea
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
                  className="w-full neo-input p-2 font-bold text-sm"
                  rows={3}
                  placeholder="Contoh: Angkatan Musim Gugur 2026"
                ></textarea>
              </div>
              <div className="mt-6 flex gap-3">
                <button type="submit" className="flex-1 bg-[#ffe600] text-black neo-btn py-2 text-xs font-black uppercase">
                  Simpan Kelas
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white text-black neo-btn py-2 text-xs font-black uppercase">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kelola Siswa di Kelas */}
      {isDetailModalOpen && selectedKelas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setIsDetailModalOpen(false)}></div>
          <div className="relative z-50 w-full max-w-2xl bg-white neo-card shadow-none overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header Modal Detail */}
            <div className="bg-[#ffe600] p-4 border-b-3 border-black flex justify-between items-center shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-black uppercase">🎓 {selectedKelas.nama_kelas}</span>
                  <span className="bg-black text-white px-2 py-0.5 text-xs font-bold uppercase">
                    {siswaInKelas.length} Siswa
                  </span>
                </div>
                {selectedKelas.deskripsi && (
                  <p className="text-xs font-bold text-black mt-0.5">{selectedKelas.deskripsi}</p>
                )}
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-1 hover:bg-black hover:text-white neo-border">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Form Tambah Siswa Ke Kelas */}
              <div className="bg-[#f4f4f0] neo-card p-4 space-y-3">
                <h4 className="text-xs font-black text-black uppercase tracking-tight flex items-center">
                  <UserPlus className="w-4 h-4 mr-1 text-black" /> Tambahkan Siswa Ke Kelas Ini
                </h4>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedAddSiswaId}
                    onChange={(e) => setSelectedAddSiswaId(e.target.value)}
                    className="flex-1 neo-input p-2 text-xs font-bold bg-white"
                  >
                    <option value="">-- Pilih Siswa Untuk Ditambahkan --</option>
                    {availableSiswa.map(s => {
                      const inCurrentClass = s.siswa?.kelas_id === selectedKelas.id;
                      if (inCurrentClass) return null; // jangan tampilkan jika sudah di kelas ini

                      const currentClassLabel = s.siswa?.master_kelas?.nama_kelas 
                        ? `(Kelas Saat Ini: ${s.siswa.master_kelas.nama_kelas})` 
                        : '(Tanpa Kelas)';

                      return (
                        <option key={s.siswa?.id || s.id} value={s.siswa?.id}>
                          {s.name} - {s.email} {currentClassLabel}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    onClick={handleAddSiswa}
                    disabled={!selectedAddSiswaId}
                    className="bg-[#00f0ff] hover:bg-[#00d8e6] text-black font-black px-4 py-2 neo-btn text-xs uppercase disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    + Tambahkan
                  </button>
                </div>
              </div>

              {/* Daftar Siswa di Kelas Ini */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-black uppercase tracking-tight flex items-center justify-between">
                  <span>Daftar Anggota Kelas ({siswaInKelas.length} Siswa)</span>
                </h4>

                {loadingDetail ? (
                  <div className="text-center py-6 font-bold text-gray-500 animate-pulse text-xs">
                    Memuat daftar siswa...
                  </div>
                ) : siswaInKelas.length === 0 ? (
                  <div className="bg-white neo-card p-6 text-center text-xs font-bold text-gray-500">
                    Belum ada siswa yang dimasukkan ke dalam kelas ini.
                  </div>
                ) : (
                  <div className="bg-white neo-card divide-y-2 divide-gray-200 overflow-hidden">
                    {siswaInKelas.map((item) => (
                      <div key={item.id} className="p-3 flex items-center justify-between hover:bg-[#fffde7] transition-colors">
                        <div>
                          <p className="text-xs font-black text-black uppercase">{item.users?.name || 'Tanpa Nama'}</p>
                          <p className="text-[11px] font-bold text-gray-500">{item.users?.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.status_pendidikan === 'tunggu_terbang' ? (
                            <span className="text-[9px] font-black text-black bg-[#ffe600] px-2 py-0.5 border border-black uppercase">
                              🟡 Tunggu Terbang
                            </span>
                          ) : item.status_pendidikan === 'alumni' ? (
                            <span className="text-[9px] font-black text-white bg-[#00f0ff] px-2 py-0.5 border border-black uppercase">
                              🔵 Alumni
                            </span>
                          ) : item.status_pendidikan === 'belum_mulai' ? (
                            <span className="text-[9px] font-black text-black bg-gray-200 px-2 py-0.5 border border-black uppercase">
                              ⚪ Belum Mulai
                            </span>
                          ) : (
                            <span className="text-[9px] font-black text-black bg-[#74ee15] px-2 py-0.5 border border-black uppercase">
                              🟢 Aktif
                            </span>
                          )}

                          <button
                            onClick={() => handleRemoveSiswa(item.id)}
                            className="bg-[#ff003c] text-white hover:bg-black p-1.5 neo-border text-[10px] font-black uppercase flex items-center"
                            title="Keluarkan dari Kelas"
                          >
                            <UserMinus className="w-3.5 h-3.5 mr-1" /> Keluarkan
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-100 p-4 border-t-3 border-black text-right shrink-0">
              <button 
                onClick={() => setIsDetailModalOpen(false)} 
                className="bg-black text-white px-5 py-2 neo-btn text-xs font-black uppercase"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
