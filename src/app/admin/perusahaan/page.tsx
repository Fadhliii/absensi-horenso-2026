'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  getPerusahaanHierarchyAction, 
  createPerusahaanAction, 
  updatePerusahaanAction, 
  deletePerusahaanAction,
  createPerusahaanBatchAction,
  updatePerusahaanBatchAction,
  deletePerusahaanBatchAction,
  getUnassignedSiswaAction,
  bulkAssignSiswaBatchAction
} from '@/app/actions/master';
import { logoutAction } from '@/app/actions/auth';
import IndonesianClock from '@/components/IndonesianClock';
import { 
  Plus, Edit2, Trash2, Search, LogOut, ArrowLeft, 
  Layers, User, Calendar, Building2, Eye, ChevronRight, CheckSquare, Square, Users, X
} from 'lucide-react';
import Link from 'next/link';

type SiswaItem = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  tanggal_berangkat?: string | null;
};

type BatchItem = {
  id: string;
  perusahaan_id: string;
  nama_batch: string;
  tanggal_berangkat?: string | null;
  kuota?: number;
  keterangan?: string;
  siswa: SiswaItem[];
};

type PerusahaanHierarchy = {
  id: string;
  nama: string;
  alamat?: string;
  kontak?: string;
  created_at?: string;
  batches: BatchItem[];
  unbatchedSiswa: SiswaItem[];
  totalSiswa: number;
};

export default function PerusahaanPage() {
  const [data, setData] = useState<PerusahaanHierarchy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Selected Company for Detail Drawer/Modal
  const [detailCompany, setDetailCompany] = useState<PerusahaanHierarchy | null>(null);

  // Accordion state inside detail modal
  const [openBatchIds, setOpenBatchIds] = useState<Record<string, boolean>>({});

  // Modal state
  const [modalCompany, setModalCompany] = useState<{ isOpen: boolean; mode: 'create' | 'edit'; data?: PerusahaanHierarchy }>({ isOpen: false, mode: 'create' });
  const [modalBatch, setModalBatch] = useState<{ isOpen: boolean; mode: 'create' | 'edit'; perusahaanId?: string; data?: BatchItem }>({ isOpen: false, mode: 'create' });

  // Assign Siswa State
  const [modalAssign, setModalAssign] = useState<{ isOpen: boolean; batchId?: string; perusahaanId?: string; batchName?: string }>({ isOpen: false });
  const [unassignedSiswa, setUnassignedSiswa] = useState<{user_id: string; name: string; email: string}[]>([]);
  const [selectedSiswaIds, setSelectedSiswaIds] = useState<string[]>([]);
  const [siswaSearchQuery, setSiswaSearchQuery] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getPerusahaanHierarchyAction(search);
    if (result.data) {
      setData(result.data);
      // Sync detail company if active
      if (detailCompany) {
        const updatedDetail = result.data.find(p => p.id === detailCompany.id);
        if (updatedDetail) setDetailCompany(updatedDetail);
      }
    }
    setLoading(false);
  }, [search, detailCompany]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleBatch = (id: string) => {
    setOpenBatchIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Submit Perusahaan Form
  async function handleCompanySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (modalCompany.mode === 'create') {
      await createPerusahaanAction(formData);
    } else if (modalCompany.mode === 'edit' && modalCompany.data) {
      await updatePerusahaanAction(modalCompany.data.id, formData);
    }
    
    setModalCompany({ isOpen: false, mode: 'create' });
    fetchData();
  }

  // Delete Perusahaan
  async function handleDeleteCompany(id: string, nama: string) {
    if (!confirm(`Hapus perusahaan "${nama}"? Semua batch & status penempatan siswa di perusahaan ini akan direset.`)) return;
    await deletePerusahaanAction(id);
    if (detailCompany?.id === id) setDetailCompany(null);
    fetchData();
  }

  // Submit Batch Form
  async function handleBatchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (modalBatch.mode === 'create') {
      await createPerusahaanBatchAction(formData);
    } else if (modalBatch.mode === 'edit' && modalBatch.data) {
      await updatePerusahaanBatchAction(modalBatch.data.id, formData);
    }
    
    setModalBatch({ isOpen: false, mode: 'create' });
    fetchData();
  }

  // Delete Batch
  async function handleDeleteBatch(id: string, nama: string) {
    if (!confirm(`Hapus batch "${nama}"? Siswa di batch ini tidak akan terhapus, tetapi status batch-nya akan dikosongkan.`)) return;
    await deletePerusahaanBatchAction(id);
    fetchData();
  }

  // Open Assign Modal
  async function handleOpenAssign(batchId: string, perusahaanId: string, batchName: string) {
    setModalAssign({ isOpen: true, batchId, perusahaanId, batchName });
    setSelectedSiswaIds([]);
    setSiswaSearchQuery('');
    
    const result = await getUnassignedSiswaAction();
    if (result.data) {
      setUnassignedSiswa(result.data);
    }
  }

  // Submit Assign
  async function handleAssignSubmit() {
    if (selectedSiswaIds.length === 0 || !modalAssign.batchId || !modalAssign.perusahaanId) return;
    setIsAssigning(true);
    
    await bulkAssignSiswaBatchAction(selectedSiswaIds, modalAssign.perusahaanId, modalAssign.batchId);
    
    setIsAssigning(false);
    setModalAssign({ isOpen: false });
    fetchData();
  }

  const toggleSiswaSelection = (id: string) => {
    setSelectedSiswaIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  
  const filteredUnassignedSiswa = unassignedSiswa.filter(s => 
    s.name.toLowerCase().includes(siswaSearchQuery.toLowerCase()) || 
    s.email.toLowerCase().includes(siswaSearchQuery.toLowerCase())
  );

  const selectAllFilteredSiswa = () => {
    const filteredIds = filteredUnassignedSiswa.map(s => s.user_id);
    const allSelected = filteredIds.every(id => selectedSiswaIds.includes(id));
    if (allSelected) {
      setSelectedSiswaIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedSiswaIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // Stats calculation
  const totalPerusahaan = data.length;
  const totalBatch = data.reduce((acc, p) => acc + p.batches.length, 0);
  const totalSiswaPlacements = data.reduce((acc, p) => acc + p.totalSiswa, 0);

  return (
    <div className="min-h-screen bg-[#f4f4f0] font-sans">
      <header className="bg-white border-b-4 border-black sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="p-2 text-black hover:bg-black hover:text-white neo-border transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-black tracking-tight uppercase">Master Perusahaan Mitra</h1>
              <p className="text-xs text-black font-bold uppercase">Kelola Daftar Perusahaan, Batch, & Penempatan Siswa</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <IndonesianClock className="hidden sm:inline-flex" />
            <form action={logoutAction}>
              <button className="flex items-center text-black bg-white hover:bg-black hover:text-white px-3 py-1.5 neo-btn text-xs">
                <LogOut className="w-4 h-4 mr-1.5" /> Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#00f0ff] p-5 neo-card neo-shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase text-black">Total Perusahaan Mitra</p>
              <h3 className="text-3xl font-black text-black mt-1">{totalPerusahaan}</h3>
            </div>
            <div className="w-12 h-12 bg-white neo-border flex items-center justify-center">
              <Building2 className="w-6 h-6 text-black" />
            </div>
          </div>
          <div className="bg-[#ffe600] p-5 neo-card neo-shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase text-black">Total Batch / Angkatan</p>
              <h3 className="text-3xl font-black text-black mt-1">{totalBatch}</h3>
            </div>
            <div className="w-12 h-12 bg-white neo-border flex items-center justify-center">
              <Layers className="w-6 h-6 text-black" />
            </div>
          </div>
          <div className="bg-[#00e676] p-5 neo-card neo-shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase text-black">Siswa Terpenuhi</p>
              <h3 className="text-3xl font-black text-black mt-1">{totalSiswaPlacements}</h3>
            </div>
            <div className="w-12 h-12 bg-white neo-border flex items-center justify-center">
              <Users className="w-6 h-6 text-black" />
            </div>
          </div>
        </div>

        {/* Search & Header Action */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-black" />
            </div>
            <input
              type="text"
              placeholder="Cari perusahaan mitra (nama/alamat)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 neo-input text-xs font-bold"
            />
          </div>
          
          <button
            onClick={() => setModalCompany({ isOpen: true, mode: 'create' })}
            className="inline-flex items-center justify-center px-5 py-2.5 text-xs text-black bg-[#00f0ff] hover:bg-[#00d8e6] neo-btn font-black"
          >
            <Plus className="w-4 h-4 mr-2" /> + Tambah Perusahaan Mitra
          </button>
        </div>

        {/* Dedicated Perusahaan Table */}
        <div className="bg-white neo-card neo-shadow-md overflow-hidden">
          <div className="p-4 bg-[#fff59d] border-b-3 border-black flex justify-between items-center">
            <h2 className="text-sm font-black text-black uppercase tracking-wide flex items-center gap-2">
              <Building2 className="w-4 h-4 text-black" /> Daftar Perusahaan Mitra ({data.length})
            </h2>
            <span className="text-xs font-black text-black uppercase">
              Klik &quot;Kelola Batch & Siswa&quot; untuk melihat detail angkatan
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black text-white text-xs font-black uppercase tracking-wider border-b-3 border-black">
                  <th className="p-3 text-center w-12">#</th>
                  <th className="p-3">Nama Perusahaan</th>
                  <th className="p-3">Kontak & Alamat</th>
                  <th className="p-3 text-center">Jumlah Batch</th>
                  <th className="p-3 text-center">Jumlah Siswa</th>
                  <th className="p-3 text-center">Tanggal Dibuat</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black text-xs font-bold text-black">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500 animate-pulse font-black uppercase">
                      Memuat Data Perusahaan Mitra...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-black font-black uppercase bg-[#fffde7]">
                      Belum ada data perusahaan mitra. Silakan tambahkan perusahaan baru.
                    </td>
                  </tr>
                ) : (
                  data.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-[#f0fd44]/20 transition-colors">
                      <td className="p-3 text-center font-black">{idx + 1}</td>
                      <td className="p-3">
                        <div className="font-black text-black uppercase text-sm flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-black shrink-0" />
                          <span>{p.nama}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-0.5">
                          <p className="font-bold text-black">{p.kontak || '-'}</p>
                          {p.alamat && <p className="text-[11px] text-gray-600 line-clamp-1">{p.alamat}</p>}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-1 neo-badge bg-[#a855f7] text-white text-xs font-black">
                          {p.batches.length} Batch
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-1 neo-badge bg-[#00e676] text-black text-xs font-black">
                          👥 {p.totalSiswa} Siswa
                        </span>
                      </td>
                      <td className="p-3 text-center text-[11px] font-bold">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setDetailCompany(p)}
                            className="inline-flex items-center px-3 py-1.5 text-xs text-black bg-[#00f0ff] hover:bg-[#00d8e6] neo-btn font-black"
                            title="Lihat Detail Batch & Kelola Siswa"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> Kelola Batch & Siswa
                          </button>
                          <button
                            onClick={() => setModalCompany({ isOpen: true, mode: 'edit', data: p })}
                            className="p-1.5 neo-border bg-white text-black hover:bg-black hover:text-white"
                            title="Edit Perusahaan"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCompany(p.id, p.nama)}
                            className="p-1.5 neo-border bg-[#ff1744] text-white hover:bg-red-800"
                            title="Hapus Perusahaan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Modal / Drawer Detail Perusahaan (Kelola Batch & Siswa) */}
      {detailCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setDetailCompany(null)}></div>
          <div className="relative z-50 w-full max-w-4xl bg-white neo-card neo-shadow-lg p-6 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b-3 border-black pb-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 neo-badge bg-[#ffe600] text-black text-xs font-black">Perusahaan Mitra</span>
                  <h3 className="text-xl font-black text-black uppercase">{detailCompany.nama}</h3>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold text-black mt-1">
                  <span>Kontak: {detailCompany.kontak || '-'}</span>
                  <span>•</span>
                  <span>Total: {detailCompany.totalSiswa} Siswa Terdaftar</span>
                  <span>•</span>
                  <span>{detailCompany.batches.length} Batch</span>
                </div>
                {detailCompany.alamat && <p className="text-xs text-gray-700 font-bold mt-1">Alamat: {detailCompany.alamat}</p>}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalBatch({ isOpen: true, mode: 'create', perusahaanId: detailCompany.id })}
                  className="inline-flex items-center px-3 py-1.5 text-xs text-black bg-[#ffe600] hover:bg-[#ebd300] neo-btn font-black"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> + Tambah Batch Baru
                </button>
                <button
                  onClick={() => setDetailCompany(null)}
                  className="p-1.5 neo-border bg-white text-black hover:bg-black hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content Body: List Batch & Siswa */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              {detailCompany.batches.length === 0 && detailCompany.unbatchedSiswa.length === 0 ? (
                <div className="text-center py-12 neo-border bg-[#fff9c4]">
                  <Layers className="w-10 h-10 text-black mx-auto mb-2" />
                  <p className="text-sm font-black text-black uppercase">Belum ada Batch di {detailCompany.nama}.</p>
                  <button
                    onClick={() => setModalBatch({ isOpen: true, mode: 'create', perusahaanId: detailCompany.id })}
                    className="mt-3 inline-flex items-center px-4 py-2 text-xs text-black bg-[#ffe600] neo-btn font-black"
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Buat Batch Pertama (misal: Batch 1)
                  </button>
                </div>
              ) : (
                <>
                  {/* List Batches */}
                  {detailCompany.batches.map((b) => {
                    const isBatchOpen = openBatchIds[b.id] ?? true; // Default expanded in detail modal

                    return (
                      <div key={b.id} className="bg-[#fffde7] neo-card overflow-hidden">
                        
                        {/* Batch Header Bar */}
                        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#fffde7]">
                          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => toggleBatch(b.id)}>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-black text-black uppercase">{b.nama_batch}</h4>
                                {b.kuota && b.kuota > 0 ? (
                                  <span className="text-[11px] font-black px-2 py-0.5 neo-badge bg-[#00e676] text-black">
                                    Terisi {b.siswa.length} / {b.kuota} Siswa
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-black px-2 py-0.5 neo-badge bg-white text-black">
                                    {b.siswa.length} Siswa
                                  </span>
                                )}
                              </div>
                              {b.tanggal_berangkat && (
                                <div className="flex items-center text-[11px] text-black font-bold mt-0.5">
                                  <Calendar className="w-3.5 h-3.5 mr-1 text-black" />
                                  Keberangkatan: {new Date(b.tanggal_berangkat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => handleOpenAssign(b.id, detailCompany.id, b.nama_batch)}
                              className="inline-flex items-center px-3 py-1.5 text-xs text-black bg-[#00e676] hover:bg-[#00c853] neo-btn font-black"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Siswa
                            </button>
                            <button
                              onClick={() => setModalBatch({ isOpen: true, mode: 'edit', data: b })}
                              className="p-1.5 neo-border bg-white text-black hover:bg-black hover:text-white"
                              title="Edit Batch"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteBatch(b.id, b.nama_batch)}
                              className="p-1.5 neo-border bg-[#ff1744] text-white hover:bg-red-800"
                              title="Hapus Batch"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* List Siswa di dalam Batch */}
                        {isBatchOpen && (
                          <div className="border-t-3 border-black bg-white p-4">
                            {b.siswa.length === 0 ? (
                              <div className="text-center py-4 bg-[#fff9c4] neo-border">
                                <p className="text-xs font-black text-black uppercase mb-1">Belum ada siswa di {b.nama_batch}.</p>
                                <button
                                  onClick={() => handleOpenAssign(b.id, detailCompany.id, b.nama_batch)}
                                  className="text-xs font-black text-black underline uppercase hover:text-blue-700"
                                >
                                  + Masukkan Siswa Sekarang
                                </button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {b.siswa.map((s) => (
                                  <div key={s.id} className="bg-white p-3 neo-border neo-shadow-sm flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-none neo-border bg-[#00f0ff] text-black flex items-center justify-center font-black text-xs shrink-0">
                                      <User className="w-4 h-4" />
                                    </div>
                                    <div className="overflow-hidden">
                                      <p className="text-xs font-black text-black truncate">{s.name}</p>
                                      <p className="text-[11px] text-black font-bold truncate">{s.email}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    );
                  })}

                  {/* Siswa tanpa batch */}
                  {detailCompany.unbatchedSiswa.length > 0 && (
                    <div className="bg-[#fff3e0] neo-card p-4">
                      <h4 className="text-xs font-black text-black uppercase mb-2">
                        Siswa Tanpa Batch ({detailCompany.unbatchedSiswa.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {detailCompany.unbatchedSiswa.map((s) => (
                          <div key={s.id} className="bg-white p-3 neo-border flex items-center gap-3">
                            <div className="w-8 h-8 neo-border bg-[#ffe600] text-black flex items-center justify-center font-black text-xs shrink-0">
                              <User className="w-4 h-4" />
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-xs font-black text-black truncate">{s.name}</p>
                              <p className="text-[11px] text-black font-bold truncate">{s.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="pt-4 border-t-3 border-black flex justify-end mt-4">
              <button
                onClick={() => setDetailCompany(null)}
                className="px-5 py-2 text-xs text-black bg-white neo-btn font-black"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah/Edit Perusahaan */}
      {modalCompany.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setModalCompany({ isOpen: false, mode: 'create' })}></div>
          <div className="relative z-50 w-full max-w-lg bg-white neo-card neo-shadow-lg p-6">
            <h3 className="text-xl font-black text-black uppercase mb-4 border-b-3 border-black pb-2">
              {modalCompany.mode === 'create' ? 'Tambah Perusahaan Mitra Baru' : 'Edit Perusahaan'}
            </h3>
            <form onSubmit={handleCompanySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-black uppercase mb-1">Nama Perusahaan *</label>
                <input 
                  type="text" 
                  name="nama" 
                  required 
                  defaultValue={modalCompany.data?.nama} 
                  placeholder="Contoh: PT. Ichikoh Indonesia / Toyota Japan Ltd."
                  className="w-full px-3.5 py-2.5 neo-input text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-black uppercase mb-1">Kontak / No. Telp</label>
                <input 
                  type="text" 
                  name="kontak" 
                  defaultValue={modalCompany.data?.kontak} 
                  placeholder="Contoh: 08123456789 (HRD)"
                  className="w-full px-3.5 py-2.5 neo-input text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-black uppercase mb-1">Alamat Lengkap</label>
                <textarea 
                  name="alamat" 
                  rows={3} 
                  defaultValue={modalCompany.data?.alamat} 
                  placeholder="Alamat pabrik / kantor pusat"
                  className="w-full px-3.5 py-2.5 neo-input text-xs"
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setModalCompany({ isOpen: false, mode: 'create' })} 
                  className="px-4 py-2 text-xs text-black bg-white neo-btn"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 text-xs text-black bg-[#00f0ff] hover:bg-[#00d8e6] neo-btn font-black"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah/Edit Batch */}
      {modalBatch.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setModalBatch({ isOpen: false, mode: 'create' })}></div>
          <div className="relative z-50 w-full max-w-md bg-white neo-card neo-shadow-lg p-6">
            <h3 className="text-xl font-black text-black uppercase mb-4 border-b-3 border-black pb-2">
              {modalBatch.mode === 'create' ? 'Tambah Batch / Angkatan' : 'Edit Batch'}
            </h3>
            <form onSubmit={handleBatchSubmit} className="space-y-4">
              {modalBatch.mode === 'create' && (
                <input type="hidden" name="perusahaan_id" value={modalBatch.perusahaanId} />
              )}
              <div>
                <label className="block text-xs font-black text-black uppercase mb-1">Nama Batch / Angkatan *</label>
                <input 
                  type="text" 
                  name="nama_batch" 
                  required 
                  defaultValue={modalBatch.data?.nama_batch} 
                  placeholder="Contoh: Batch 7 atau Angkatan 2026-A"
                  className="w-full px-3.5 py-2.5 neo-input text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-black uppercase mb-1">Tanggal Keberangkatan (Opsional)</label>
                <input 
                  type="date" 
                  name="tanggal_berangkat" 
                  defaultValue={modalBatch.data?.tanggal_berangkat || ''} 
                  className="w-full px-3.5 py-2.5 neo-input text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-black uppercase mb-1">Kuota Siswa (Opsional)</label>
                <input 
                  type="number" 
                  name="kuota" 
                  min="0"
                  defaultValue={modalBatch.data?.kuota || 0} 
                  placeholder="Contoh: 10"
                  className="w-full px-3.5 py-2.5 neo-input text-xs"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setModalBatch({ isOpen: false, mode: 'create' })} 
                  className="px-4 py-2 text-xs text-black bg-white neo-btn"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 text-xs text-black bg-[#ffe600] hover:bg-[#ebd300] neo-btn font-black"
                >
                  Simpan Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Assign Siswa */}
      {modalAssign.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setModalAssign({ isOpen: false })}></div>
          <div className="relative z-50 w-full max-w-lg bg-white neo-card neo-shadow-lg p-6 flex flex-col max-h-[90vh]">
            <h3 className="text-xl font-black text-black uppercase mb-1">Tambah Siswa ke Batch</h3>
            <p className="text-xs text-black font-bold mb-4">Pilih siswa untuk dimasukkan ke <span className="underline font-black">{modalAssign.batchName}</span></p>
            
            {/* Search Bar Input */}
            <div className="relative mb-3">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-black" />
              </div>
              <input
                type="text"
                placeholder="Cari nama atau email siswa..."
                value={siswaSearchQuery}
                onChange={(e) => setSiswaSearchQuery(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 neo-input text-xs font-bold"
              />
            </div>

            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-black text-black uppercase">
                {selectedSiswaIds.length} Terpilih ({filteredUnassignedSiswa.length} Tampil)
              </span>
              <button 
                onClick={selectAllFilteredSiswa}
                className="text-xs font-black text-black underline uppercase hover:text-blue-700"
              >
                {filteredUnassignedSiswa.length > 0 && filteredUnassignedSiswa.every(s => selectedSiswaIds.includes(s.user_id))
                  ? 'Batalkan Pilih'
                  : 'Pilih Semua Hasil'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[350px] neo-border bg-[#f4f4f0] p-2 space-y-1.5">
              {filteredUnassignedSiswa.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-black font-bold text-xs py-12">
                  <User className="w-8 h-8 text-black mb-2" />
                  <p>
                    {siswaSearchQuery ? 'Tidak ada siswa yang cocok.' : 'Tidak ada siswa yang belum ditempatkan.'}
                  </p>
                </div>
              ) : (
                filteredUnassignedSiswa.map(s => (
                  <div 
                    key={s.user_id} 
                    onClick={() => toggleSiswaSelection(s.user_id)}
                    className={`flex items-center gap-3 p-3 neo-border cursor-pointer transition-all ${
                      selectedSiswaIds.includes(s.user_id) 
                        ? 'bg-[#00e676] text-black shadow-xs font-black' 
                        : 'bg-white text-black hover:bg-[#fff9c4]'
                    }`}
                  >
                    <div className="text-black">
                      {selectedSiswaIds.includes(s.user_id) ? <CheckSquare className="w-5 h-5 fill-black text-white" /> : <Square className="w-5 h-5" />}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-black uppercase truncate">{s.name}</p>
                      <p className="text-[11px] font-bold truncate">{s.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 mt-2 border-t-3 border-black">
              <button 
                type="button" 
                onClick={() => setModalAssign({ isOpen: false })} 
                className="px-4 py-2 text-xs text-black bg-white neo-btn"
                disabled={isAssigning}
              >
                Batal
              </button>
              <button 
                onClick={handleAssignSubmit}
                disabled={selectedSiswaIds.length === 0 || isAssigning}
                className="inline-flex items-center px-5 py-2 text-xs text-black bg-[#00e676] hover:bg-[#00c853] disabled:opacity-50 disabled:cursor-not-allowed neo-btn font-black"
              >
                {isAssigning ? 'Menyimpan...' : `Tambahkan ${selectedSiswaIds.length} Siswa`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
