'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSiswaApprovedAction, assignSiswaPerusahaanAction, getAllPerusahaanAction } from '@/app/actions/master';
import { resetPasswordAction, logoutAction } from '@/app/actions/auth';
import { Search, ChevronLeft, ChevronRight, Key, Briefcase, LogOut, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type SiswaData = {
  id: string;
  name: string;
  email: string;
  phone: string;
  siswa: {
    id: string;
    status_penempatan: 'belum' | 'sudah';
    perusahaan_id: string | null;
    perusahaan: { nama: string } | null;
  };
};

export default function SiswaPage() {
  const [data, setData] = useState<SiswaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('semua');
  const [total, setTotal] = useState(0);
  
  const [perusahaanList, setPerusahaanList] = useState<{id: string, nama: string}[]>([]);

  const [assignModal, setAssignModal] = useState<{ isOpen: boolean; userId: string; name: string; currentStatus: string; currentCompanyId?: string }>({ isOpen: false, userId: '', name: '', currentStatus: 'belum' });
  const [resetModal, setResetModal] = useState<{ isOpen: boolean; studentName: string; newPassword?: string; error?: string }>({ isOpen: false, studentName: '' });

  const fetchPerusahaan = useCallback(async () => {
    try {
      const res = await getAllPerusahaanAction();
      if (res?.data) setPerusahaanList(res.data);
    } catch (err: any) {
      console.error('Gagal mengambil data perusahaan:', err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setPageError('');
    try {
      const result = await getSiswaApprovedAction(page, search, statusFilter);
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
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchPerusahaan();
  }, [fetchPerusahaan]);

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

    await assignSiswaPerusahaanAction(assignModal.userId, status, status === 'sudah' ? perusahaanId : undefined);
    setAssignModal({ isOpen: false, userId: '', name: '', currentStatus: 'belum' });
    fetchData();
  }

  async function handleResetPassword(id: string, name: string) {
    if (!confirm(`Yakin ingin mereset password untuk ${name}?`)) return;
    const result = await resetPasswordAction(id);
    if (result.success && result.newPassword) {
      setResetModal({ isOpen: true, studentName: name, newPassword: result.newPassword });
    } else {
      setResetModal({ isOpen: true, studentName: name, error: result.error || 'Gagal reset password' });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Data Siswa Aktif</h1>
          </div>
          <form action={logoutAction}>
            <button className="flex items-center text-gray-600 hover:text-red-600 text-sm font-medium transition-colors">
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {pageError && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm font-medium border border-red-200">
            {pageError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Cari nama siswa..."
              value={search}
              onChange={handleSearch}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div className="w-full sm:w-48">
            <select
              value={statusFilter}
              onChange={handleFilter}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg"
            >
              <option value="semua">Semua Status</option>
              <option value="belum">Belum Ditempatkan</option>
              <option value="sudah">Sudah Ditempatkan</option>
            </select>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Siswa</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Kontak</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Penempatan</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Aksi</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">Memuat data...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">Tidak ada data siswa ditemukan.</td></tr>
                ) : (
                  data.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{s.name}</div>
                        <div className="text-sm text-gray-500 sm:hidden">{s.phone || s.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                        <div className="text-sm text-gray-900">{s.email}</div>
                        <div className="text-sm text-gray-500">{s.phone || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {s.siswa?.status_penempatan === 'sudah' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {s.siswa?.perusahaan?.nama || 'Ada Perusahaan'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Belum Ditempatkan
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => setAssignModal({ isOpen: true, userId: s.id, name: s.name, currentStatus: s.siswa?.status_penempatan || 'belum', currentCompanyId: s.siswa?.perusahaan_id || undefined })} 
                          className="inline-flex items-center text-blue-600 hover:text-blue-900 mr-3"
                          title="Ubah Penempatan"
                        >
                          <Briefcase className="w-4 h-4 mr-1 hidden sm:inline" /> Assign
                        </button>
                        <button 
                          onClick={() => handleResetPassword(s.id, s.name)} 
                          className="inline-flex items-center text-orange-600 hover:text-orange-900"
                          title="Reset Password"
                        >
                          <Key className="w-4 h-4 mr-1 hidden sm:inline" /> Reset
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
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"><ChevronLeft className="h-5 w-5" /></button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">Hal {page} / {totalPages || 1}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"><ChevronRight className="h-5 w-5" /></button>
                </nav>
              </div>
            </div>
            
            <div className="flex items-center justify-between w-full sm:hidden">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Seb</button>
              <span className="text-sm text-gray-700">{page} / {totalPages || 1}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Beri</button>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Assign Penempatan */}
      {assignModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setAssignModal({ ...assignModal, isOpen: false })}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
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
                    {assignModal.currentStatus === 'sudah' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Perusahaan Mitra *</label>
                        <select 
                          name="perusahaan_id" 
                          required 
                          defaultValue={assignModal.currentCompanyId || ''}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="" disabled>-- Pilih Perusahaan --</option>
                          {perusahaanList.map(p => (
                            <option key={p.id} value={p.id}>{p.nama}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto sm:text-sm">
                    Simpan Perubahan
                  </button>
                  <button type="button" onClick={() => setAssignModal({ ...assignModal, isOpen: false })} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reset Password (Copas dari Approval) */}
      {resetModal.isOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setResetModal({ isOpen: false, studentName: '' })}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">Password Direset</h3>
              {resetModal.error ? (
                <p className="text-red-500">{resetModal.error}</p>
              ) : (
                <>
                  <p className="text-sm text-gray-500">Password sementara untuk <strong>{resetModal.studentName}</strong>:</p>
                  <div className="mt-3 p-4 bg-gray-100 rounded-md text-center">
                    <span className="text-2xl font-mono font-bold tracking-wider text-gray-900 select-all">{resetModal.newPassword}</span>
                  </div>
                </>
              )}
              <button onClick={() => setResetModal({ isOpen: false, studentName: '' })} className="mt-6 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:text-sm">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
