'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSiswaApprovedAction, assignSiswaPerusahaanAction, getAllPerusahaanAction, getBatchesByPerusahaanAction } from '@/app/actions/master';
import { getAllKelasAction } from '@/app/actions/kelas';
import { logoutAction } from '@/app/actions/auth';
import IndonesianClock from '@/components/IndonesianClock';
import { Search, ChevronLeft, ChevronRight, Briefcase, LogOut, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type SiswaData = {
  id: string;
  name: string;
  email: string;
  phone: string;
  siswa: {
    id: string;
    status_penempatan: 'belum' | 'sudah';
    status_pendidikan?: string | null;
    perusahaan_id: string | null;
    batch_id?: string | null;
    kelas_id?: string | null;
    batch: string | null;
    tanggal_berangkat: string | null;
    perusahaan: { nama: string } | null;
    master_kelas?: { nama_kelas: string } | null;
  };
  created_at?: string;
};

export default function SiswaPage() {
  const [data, setData] = useState<SiswaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('semua');
  const [perusahaanFilter, setPerusahaanFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [kelasFilter, setKelasFilter] = useState('');
  const [statusPendidikanFilter, setStatusPendidikanFilter] = useState('semua');
  const [keberangkatanFilter, setKeberangkatanFilter] = useState('semua');
  const [tabGroup, setTabGroup] = useState<'aktif' | 'nonaktif' | 'semua'>('aktif');
  const [sortOrder, setSortOrder] = useState('desc');
  const [total, setTotal] = useState(0);

  const [perusahaanList, setPerusahaanList] = useState<{id: string, nama: string}[]>([]);
  const [modalBatchList, setModalBatchList] = useState<{id: string, nama_batch: string, tanggal_berangkat?: string | null}[]>([]);
  const [filterBatchList, setFilterBatchList] = useState<{id: string, nama_batch: string}[]>([]);
  const [kelasList, setKelasList] = useState<{id: string, nama_kelas: string}[]>([]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isBulkKelasModalOpen, setIsBulkKelasModalOpen] = useState(false);
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);

  const [assignModal, setAssignModal] = useState<{ isOpen: boolean; userId: string; name: string; currentStatus: string; currentCompanyId?: string; currentBatch?: string; currentTanggalBerangkat?: string; currentKelasId?: string }>({ isOpen: false, userId: '', name: '', currentStatus: 'belum' });

  // Load batches when company selected in modal
  useEffect(() => {
    if (assignModal.isOpen && assignModal.currentCompanyId) {
      getBatchesByPerusahaanAction(assignModal.currentCompanyId).then(res => {
        if (res.data) setModalBatchList(res.data);
        else setModalBatchList([]);
      });
    } else {
      setModalBatchList([]);
    }
  }, [assignModal.isOpen, assignModal.currentCompanyId]);

  const fetchPerusahaan = useCallback(async () => {
    try {
      const res = await getAllPerusahaanAction();
      if (res?.data) setPerusahaanList(res.data);
    } catch (err: any) {
      console.error('Gagal mengambil data perusahaan:', err);
    }
  }, []);

  const fetchKelas = useCallback(async () => {
    const res = await getAllKelasAction();
    if (res.success && res.data) setKelasList(res.data);
  }, []);

  useEffect(() => {
    if (perusahaanFilter) {
      getBatchesByPerusahaanAction(perusahaanFilter).then(res => {
        if (res.data) setFilterBatchList(res.data);
      });
    } else {
      setFilterBatchList([]);
      setBatchFilter('');
    }
  }, [perusahaanFilter]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setPageError('');
    try {
      const result = await getSiswaApprovedAction(page, search, statusFilter, perusahaanFilter, keberangkatanFilter, sortOrder, batchFilter, kelasFilter, statusPendidikanFilter, tabGroup);
      if (result?.data) {
        setData(result.data as any);
        setTotal(result.total || 0);
      } else if (result?.error) {
        setPageError(result.error);
      }
    } catch (err: any) {
      setPageError(err.message || 'Terjadi kesalahan saat memuat data siswa.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, perusahaanFilter, keberangkatanFilter, sortOrder, batchFilter, kelasFilter, statusPendidikanFilter, tabGroup]);

  useEffect(() => {
    fetchPerusahaan();
    fetchKelas();
  }, [fetchPerusahaan, fetchKelas]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const totalPages = Math.ceil(total / 10);

  async function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
  }

  async function handleFilter(e: React.ChangeEvent<HTMLSelectElement>) {
    setStatusFilter(e.target.value);
    setPage(1);
  }

  async function handleAssignSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const status = formData.get('status_penempatan') as 'belum' | 'sudah';
    const perusahaanId = formData.get('perusahaan_id') as string;
    const batch = formData.get('batch') as string;
    const tanggal_berangkat = formData.get('tanggal_berangkat') as string;
    const kelas_id = formData.get('kelas_id') as string;

    await assignSiswaPerusahaanAction(assignModal.userId, status, status === 'sudah' ? perusahaanId : undefined, status === 'sudah' ? batch : undefined, status === 'sudah' ? tanggal_berangkat : undefined, kelas_id || undefined);
    setAssignModal({ isOpen: false, userId: '', name: '', currentStatus: 'belum' });
    fetchData();
  }

  async function handleBulkSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const tanggal_berangkat = formData.get('tanggal_berangkat') as string;
    
    // Kita panggil bulkSetKeberangkatanAction (perlu diimport)
    const { bulkSetKeberangkatanAction } = await import('@/app/actions/master');
    await bulkSetKeberangkatanAction(selectedIds, tanggal_berangkat || null);
    
    setIsBulkModalOpen(false);
    setSelectedIds([]);
    fetchData();
  }

  async function handleBulkKelasSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const kelas_id = formData.get('kelas_id') as string;
    
    const { bulkSetKelasAction } = await import('@/app/actions/master');
    await bulkSetKelasAction(selectedIds, kelas_id || null);
    
    setIsBulkKelasModalOpen(false);
    setSelectedIds([]);
    fetchData();
  }

  async function handleBulkStatusSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const status_pendidikan = formData.get('status_pendidikan') as string;
    
    const { updateBulkStatusPendidikanAction } = await import('@/app/actions/siswa');
    await updateBulkStatusPendidikanAction(selectedIds, status_pendidikan);
    
    setIsBulkStatusModalOpen(false);
    setSelectedIds([]);
    fetchData();
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(data.map(s => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };


  return (
    <div className="min-h-screen bg-[#f4f4f0] font-sans">
      <header className="bg-white border-b-4 border-black sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="p-2 text-black hover:bg-black hover:text-white neo-border transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-black text-black uppercase tracking-tight">Data Siswa Aktif</h1>
          </div>
          <div className="flex items-center gap-4">
            <IndonesianClock className="hidden sm:inline-flex" />
            <form action={logoutAction}>
              <button className="flex items-center text-black bg-white hover:bg-black hover:text-white px-3 py-1.5 neo-btn text-xs">
                <LogOut className="w-4 h-4 mr-1" /> Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {pageError && (
          <div className="bg-[#ff1744] text-white neo-border p-4 mb-6 text-xs font-black uppercase">
            ⚠️ {pageError}
          </div>
        )}

        {/* TAB NAVIGASI KELOMPOK SISWA */}
        <div className="flex border-b-2 border-black mb-6 bg-white neo-card p-1.5 gap-2 flex-wrap">
          <button
            onClick={() => { setTabGroup('aktif'); setPage(1); }}
            className={`px-4 py-2 text-xs font-black uppercase transition-all flex items-center gap-1.5 neo-btn ${
              tabGroup === 'aktif'
                ? 'bg-[#16a34a] text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            🟢 Siswa Aktif
          </button>
          <button
            onClick={() => { setTabGroup('nonaktif'); setPage(1); }}
            className={`px-4 py-2 text-xs font-black uppercase transition-all flex items-center gap-1.5 neo-btn ${
              tabGroup === 'nonaktif'
                ? 'bg-[#dc2626] text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            🔴 Siswa Nonaktif / Berangkat
          </button>
          <button
            onClick={() => { setTabGroup('semua'); setPage(1); }}
            className={`px-4 py-2 text-xs font-black uppercase transition-all flex items-center gap-1.5 neo-btn ${
              tabGroup === 'semua'
                ? 'bg-[#0f172a] text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            📋 Semua Siswa
          </button>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-black" />
            </div>
            <input
              type="text"
              placeholder="Cari nama siswa..."
              value={search}
              onChange={handleSearch}
              className="block w-full pl-10 pr-3 py-2 neo-input text-xs font-bold"
            />
          </div>
          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            <select
              value={sortOrder}
              onChange={(e) => { setSortOrder(e.target.value); setPage(1); }}
              className="block w-full sm:w-32 px-3 py-2 neo-input text-xs font-bold"
            >
              <option value="desc">Terbaru</option>
              <option value="asc">Terlama</option>
            </select>
            <select
              value={statusPendidikanFilter}
              onChange={(e) => { setStatusPendidikanFilter(e.target.value); setPage(1); }}
              className="block w-full sm:w-44 px-3 py-2 neo-input text-xs font-bold"
            >
              <option value="semua">Semua Status Pendidik</option>
              <option value="aktif">🟢 Aktif Belajar</option>
              <option value="belum_mulai">⚪ Belum Mulai Kelas</option>
              <option value="nonaktif">🔴 Nonaktif (7+ Hari)</option>
              <option value="tunggu_terbang">🟡 Tunggu Terbang</option>
              <option value="alumni">🔵 Alumni</option>
              <option value="dropout">🔴 Drop Out</option>
            </select>
            <select
              value={kelasFilter}
              onChange={(e) => { setKelasFilter(e.target.value); setPage(1); }}
              className="block w-full sm:w-44 px-3 py-2 neo-input text-xs font-bold"
            >
              <option value="">Semua Kelas</option>
              <option value="unassigned">⚪ Belum Ada Kelas (Tanpa Kelas)</option>
              {kelasList.map(k => (
                <option key={k.id} value={k.id}>🎓 {k.nama_kelas}</option>
              ))}
            </select>
            <select
              value={keberangkatanFilter}
              onChange={(e) => { setKeberangkatanFilter(e.target.value); setPage(1); }}
              className="block w-full sm:w-40 px-3 py-2 neo-input text-xs font-bold"
            >
              <option value="semua">Semua Keberangkatan</option>
              <option value="sudah">Sudah Berangkat</option>
              <option value="belum">Belum Berangkat</option>
            </select>
            <select
              value={perusahaanFilter}
              onChange={(e) => { setPerusahaanFilter(e.target.value); setPage(1); }}
              className="block w-full sm:w-40 px-3 py-2 neo-input text-xs font-bold"
            >
              <option value="">Semua Perusahaan</option>
              {perusahaanList.map(p => (
                <option key={p.id} value={p.id}>{p.nama}</option>
              ))}
            </select>
            {perusahaanFilter && (
              <select
                value={batchFilter}
                onChange={(e) => { setBatchFilter(e.target.value); setPage(1); }}
                className="block w-full sm:w-36 px-3 py-2 neo-input text-xs font-bold"
              >
                <option value="">Semua Batch</option>
                {filterBatchList.map(b => (
                  <option key={b.id} value={b.id}>{b.nama_batch}</option>
                ))}
              </select>
            )}
            <select
              value={statusFilter}
              onChange={handleFilter}
              className="block w-full sm:w-40 px-3 py-2 neo-input text-xs font-bold"
            >
              <option value="semua">Semua Penempatan</option>
              <option value="belum">Belum Ditempatkan</option>
              <option value="sudah">Sudah Ditempatkan</option>
            </select>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="bg-[#ffe600] neo-card p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs font-black text-black uppercase">
              {selectedIds.length} siswa dipilih
            </span>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setIsBulkStatusModalOpen(true)}
                className="px-4 py-2 text-xs text-black bg-[#74ee15] hover:bg-[#5cc010] neo-btn font-black uppercase"
              >
                Set Status Pendidikan
              </button>
              <button 
                onClick={() => setIsBulkKelasModalOpen(true)}
                className="px-4 py-2 text-xs text-white bg-[#ff00c8] hover:bg-[#d000a3] neo-btn font-black uppercase"
              >
                Set Kelas Massal
              </button>
              <button 
                onClick={() => setIsBulkModalOpen(true)}
                className="px-4 py-2 text-xs text-black bg-[#00f0ff] hover:bg-[#00d8e6] neo-btn font-black uppercase"
              >
                Set Keberangkatan Massal
              </button>
            </div>
          </div>
        )}

        <div className="bg-white neo-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full divide-y-2 divide-black text-left border-collapse">
              <thead className="bg-[#dc2626] text-white border-b-2 border-black">
                <tr>
                  <th scope="col" className="px-3 py-3 text-center w-10">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll}
                      checked={data.length > 0 && data.every(s => selectedIds.includes(s.id))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </th>
                  <th scope="col" className="px-3 py-3 text-center text-xs font-black text-white uppercase tracking-wider w-12">No.</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-black text-white uppercase tracking-wider">Nama Siswa</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-black text-white uppercase tracking-wider hidden lg:table-cell">Kontak</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-black text-white uppercase tracking-wider hidden sm:table-cell">Tgl Daftar</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-black text-white uppercase tracking-wider">Status & Kelas</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-black text-white uppercase tracking-wider">Penempatan & Batch</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-black text-white uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse border-b border-gray-200">
                      <td className="p-3 text-center"><div className="h-4 bg-slate-200 rounded w-4 mx-auto"></div></td>
                      <td className="p-3 text-center"><div className="h-4 bg-slate-200 rounded w-6 mx-auto"></div></td>
                      <td className="p-3"><div className="h-4 bg-slate-200 rounded w-36 mb-1"></div><div className="h-3 bg-slate-200 rounded w-24"></div></td>
                      <td className="p-3 hidden lg:table-cell"><div className="h-4 bg-slate-200 rounded w-32"></div></td>
                      <td className="p-3 hidden sm:table-cell"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                      <td className="p-3"><div className="h-5 bg-slate-200 rounded w-24 mb-1"></div><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                      <td className="p-3"><div className="h-5 bg-slate-200 rounded w-28"></div></td>
                      <td className="p-3 text-right"><div className="h-8 bg-slate-200 rounded w-20 ml-auto"></div></td>
                    </tr>
                  ))
                ) : data.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-800 font-medium">Tidak ada data siswa ditemukan.</td></tr>
                ) : (
                  data.map((s, index) => (
                    <tr key={s.id} className="hover:bg-slate-50 font-bold transition-colors">
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <input 
                          type="checkbox"
                          checked={selectedIds.includes(s.id)}
                          onChange={() => handleSelectOne(s.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-3 text-center text-xs font-black text-slate-700 whitespace-nowrap">
                        {(page - 1) * 10 + index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-black text-gray-900 break-words">{s.name}</div>
                        <div className="text-xs text-gray-600 font-medium lg:hidden break-all">{s.phone || s.email}</div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="text-xs font-bold text-gray-900 break-all">{s.email}</div>
                        <div className="text-xs text-gray-600 font-medium">{s.phone || '-'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                        <div className="text-xs text-gray-700 font-medium">
                          {s.created_at ? new Date(s.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          {s.siswa?.status_pendidikan === 'nonaktif' ? (
                            <span className="text-[10px] font-black text-white bg-[#dc2626] px-2 py-0.5 border border-black uppercase">
                              🔴 Nonaktif (7+ Hari)
                            </span>
                          ) : s.siswa?.status_pendidikan === 'belum_mulai' ? (
                            <span className="text-[10px] font-black text-black bg-gray-200 px-2 py-0.5 border border-black uppercase">
                              ⚪ Belum Mulai
                            </span>
                          ) : s.siswa?.status_pendidikan === 'tunggu_terbang' ? (
                            <span className="text-[10px] font-black text-black bg-[#ffe600] px-2 py-0.5 border border-black uppercase">
                              🟡 Tunggu Terbang
                            </span>
                          ) : s.siswa?.status_pendidikan === 'alumni' ? (
                            <span className="text-[10px] font-black text-white bg-[#00f0ff] px-2 py-0.5 border border-black uppercase">
                              🔵 Alumni
                            </span>
                          ) : s.siswa?.status_pendidikan === 'dropout' ? (
                            <span className="text-[10px] font-black text-white bg-[#ff003c] px-2 py-0.5 border border-black uppercase">
                              🔴 Drop Out
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-black bg-[#74ee15] px-2 py-0.5 border border-black uppercase">
                              🟢 Aktif Belajar
                            </span>
                          )}

                          {s.siswa?.master_kelas?.nama_kelas ? (
                            <span className="text-xs font-black uppercase text-black bg-yellow-200 px-1.5 py-0.5 neo-border">
                              🎓 {s.siswa.master_kelas.nama_kelas}
                            </span>
                          ) : (
                            <span className="text-[10px] font-black uppercase text-gray-700 bg-gray-200 px-1.5 py-0.5 border border-gray-400">
                              ⚪ Belum Ada Kelas
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {s.siswa?.perusahaan_id ? (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-black bg-[#74ee15] text-black border border-black uppercase">
                              🏢 {s.siswa?.perusahaan?.nama || 'Ada Kaisha'}
                            </span>
                            {s.siswa?.batch ? (
                              <span className="text-xs text-black font-black bg-purple-200 px-2 py-0.5 neo-border uppercase">
                                📦 Batch {s.siswa.batch}
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-900 font-bold bg-amber-100 px-1.5 py-0.5 border border-amber-400 uppercase">
                                ⚠️ Belum Di-assign Batch
                              </span>
                            )}
                            {s.siswa?.tanggal_berangkat && (
                              <span className="text-xs text-white font-black bg-[#1e40af] px-2 py-0.5 neo-border flex items-center">
                                ✈️ {new Date(s.siswa.tanggal_berangkat).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-black bg-gray-200 text-gray-800 border border-black uppercase">
                            ⚪ Belum Dapat Kaisha
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-medium">
                        <Link 
                          href={`/admin/siswa/${s.id}/edit`}
                          className="inline-flex items-center text-green-700 hover:text-green-900 mr-2 font-bold"
                          title="Edit Profil"
                        >
                          Edit
                        </Link>
                        <button 
                          onClick={() => setAssignModal({ isOpen: true, userId: s.id, name: s.name, currentStatus: s.siswa?.status_penempatan || 'belum', currentCompanyId: s.siswa?.perusahaan_id || undefined, currentBatch: s.siswa?.batch_id || s.siswa?.batch || undefined, currentTanggalBerangkat: s.siswa?.tanggal_berangkat || undefined, currentKelasId: s.siswa?.kelas_id || undefined })} 
                          className="inline-flex items-center text-blue-700 hover:text-blue-900 font-bold"
                          title="Ubah Penempatan"
                        >
                          <Briefcase className="w-3.5 h-3.5 mr-1" /> Assign
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Component */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Menampilkan <span className="font-medium">{total === 0 ? 0 : (page - 1) * 10 + 1}</span> hingga <span className="font-medium">{Math.min(page * 10, total)}</span> dari <span className="font-medium">{total}</span> data
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-[#ffe600] hover:text-black font-black disabled:opacity-50"><ChevronLeft className="h-5 w-5" /></button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">Hal {page} / {totalPages || 1}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-[#ffe600] hover:text-black font-black disabled:opacity-50"><ChevronRight className="h-5 w-5" /></button>
                </nav>
              </div>
            </div>
            
            <div className="flex items-center justify-between w-full sm:hidden">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-[#ffe600] hover:text-black font-black disabled:opacity-50">Seb</button>
              <span className="text-sm text-gray-700">{page} / {totalPages || 1}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-[#ffe600] hover:text-black font-black disabled:opacity-50">Beri</button>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Assign Penempatan */}
      {assignModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 z-40 bg-gray-900/60" 
            onClick={() => setAssignModal({ ...assignModal, isOpen: false })}
          ></div>
          <div className="relative z-50 w-full max-w-lg bg-white rounded-lg text-left shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleAssignSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Penempatan {assignModal.name}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status Penempatan</label>
                      <select 
                        name="status_penempatan" 
                        defaultValue={assignModal.currentStatus}
                        onChange={(e) => setAssignModal({...assignModal, currentStatus: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="belum">Belum Ditempatkan</option>
                        <option value="sudah">Sudah Ditempatkan</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kelas (Opsional)</label>
                      <select 
                        name="kelas_id" 
                        defaultValue={assignModal.currentKelasId || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">-- Tanpa Kelas --</option>
                        {kelasList.map(k => (
                          <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                        ))}
                      </select>
                    </div>

                    {assignModal.currentStatus === 'sudah' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Perusahaan Mitra *</label>
                          <select 
                            name="perusahaan_id" 
                            required 
                            value={assignModal.currentCompanyId || ''}
                            onChange={(e) => setAssignModal({...assignModal, currentCompanyId: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="" disabled>-- Pilih Perusahaan --</option>
                            {perusahaanList.map(p => (
                              <option key={p.id} value={p.id}>{p.nama}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Batch / Angkatan (Opsional)</label>
                          {modalBatchList.length > 0 ? (
                            <select
                              name="batch"
                              defaultValue={assignModal.currentBatch || ''}
                              onChange={(e) => {
                                const selectedBatchObj = modalBatchList.find(b => b.id === e.target.value || b.nama_batch === e.target.value);
                                if (selectedBatchObj?.tanggal_berangkat && !assignModal.currentTanggalBerangkat) {
                                  setAssignModal(prev => ({ ...prev, currentTanggalBerangkat: selectedBatchObj.tanggal_berangkat || '' }));
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">-- Tanpa Batch --</option>
                              {modalBatchList.map(b => (
                                <option key={b.id} value={b.id}>{b.nama_batch} {b.tanggal_berangkat ? `(Berangkat: ${b.tanggal_berangkat})` : ''}</option>
                              ))}
                            </select>
                          ) : (
                            <input 
                              type="text"
                              name="batch"
                              defaultValue={assignModal.currentBatch || ''}
                              placeholder="Contoh: Batch 1"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Keberangkatan ✈️ (Opsional)</label>
                          <input 
                            type="date"
                            name="tanggal_berangkat"
                            value={assignModal.currentTanggalBerangkat || ''}
                            onChange={(e) => setAssignModal({ ...assignModal, currentTanggalBerangkat: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto sm:text-sm">
                    Simpan Perubahan
                  </button>
                  <button type="button" onClick={() => setAssignModal({ ...assignModal, isOpen: false })} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-[#ffe600] hover:text-black font-black sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                    Batal
                  </button>
                </div>
              </form>
            </div>
        </div>
      )}

      {/* Modal Bulk Set Keberangkatan */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 z-40 bg-gray-900/60" 
            onClick={() => setIsBulkModalOpen(false)}
          ></div>
          <div className="relative z-50 w-full max-w-md bg-white rounded-lg text-left shadow-xl overflow-hidden">
            <form onSubmit={handleBulkSubmit}>
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Set Tanggal Keberangkatan ({selectedIds.length} Siswa)</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Keberangkatan ✈️</label>
                    <input 
                      type="date"
                      name="tanggal_berangkat"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-2 text-xs text-gray-500">Kosongkan jika ingin menghapus tanggal keberangkatan dari siswa-siswa ini.</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto sm:text-sm">
                  Simpan Perubahan
                </button>
                <button type="button" onClick={() => setIsBulkModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-[#ffe600] hover:text-black font-black sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Bulk Set Kelas */}
      {isBulkKelasModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 z-40 bg-gray-900/60" 
            onClick={() => setIsBulkKelasModalOpen(false)}
          ></div>
          <div className="relative z-50 w-full max-w-md bg-white rounded-lg text-left shadow-xl overflow-hidden">
            <form onSubmit={handleBulkKelasSubmit}>
              <div className="bg-[#ff00c8] px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-black text-white uppercase mb-4">Set Kelas ({selectedIds.length} Siswa)</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-black text-white mb-1 uppercase">Pilih Kelas</label>
                    <select 
                      name="kelas_id"
                      className="w-full px-3 py-2 border-2 border-black font-bold focus:ring-0 focus:outline-none"
                    >
                      <option value="">-- Tanpa Kelas --</option>
                      {kelasList.map(k => (
                        <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs font-bold text-white">Kosongkan jika ingin menghapus kelas dari siswa-siswa ini.</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 flex gap-4">
                <button type="submit" className="flex-1 bg-[#ffe600] text-black neo-btn py-2">
                  Simpan Perubahan
                </button>
                <button type="button" onClick={() => setIsBulkKelasModalOpen(false)} className="flex-1 bg-white text-black neo-btn py-2">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Bulk Set Status Pendidikan */}
      {isBulkStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 z-40 bg-gray-900/60" 
            onClick={() => setIsBulkStatusModalOpen(false)}
          ></div>
          <div className="relative z-50 w-full max-w-md bg-white rounded-lg text-left shadow-xl overflow-hidden">
            <form onSubmit={handleBulkStatusSubmit}>
              <div className="bg-[#74ee15] px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-black text-black uppercase mb-4">Set Status Pendidikan ({selectedIds.length} Siswa)</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-black text-black mb-1 uppercase">Pilih Status Pendidikan</label>
                    <select 
                      name="status_pendidikan"
                      className="w-full px-3 py-2 border-2 border-black font-bold focus:ring-0 focus:outline-none bg-white"
                    >
                      <option value="aktif">🟢 Aktif Belajar (Presensi Harian)</option>
                      <option value="belum_mulai">⚪ Belum Mulai Kelas (Otomatis Aktif saat Scan pertama)</option>
                      <option value="tunggu_terbang">🟡 Menunggu Terbang (Bebas Absen)</option>
                      <option value="alumni">🔵 Alumni (Sudah di Jepang)</option>
                      <option value="dropout">🔴 Drop Out (Keluar)</option>
                    </select>
                    <p className="mt-2 text-xs font-bold text-black">
                      Siswa yang berstatus "Menunggu Terbang", "Alumni", atau "Drop Out" tidak akan dihitung Alpha pada rekap harian.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 flex gap-4">
                <button type="submit" className="flex-1 bg-black text-white neo-btn py-2 font-bold uppercase">
                  Simpan Perubahan
                </button>
                <button type="button" onClick={() => setIsBulkStatusModalOpen(false)} className="flex-1 bg-white text-black neo-btn py-2 font-bold uppercase">
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
