'use client';

import { useState, useEffect } from 'react';
import { getAllUsersAction, updateUserRoleAction, updateUserStatusAction, createUserByAdminAction } from '@/app/actions/users';
import { getAllKelasAction } from '@/app/actions/kelas';
import { getAllPerusahaanAction } from '@/app/actions/master';
import Link from 'next/link';
import { ArrowLeft, Search, CheckCircle, XCircle, Clock, UserPlus, X } from 'lucide-react';

export default function UsersManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // all, siswa, instruktur, admin
  const [statusFilter, setStatusFilter] = useState('all'); // all, approved, pending, rejected

  // Modal State Tambah Akun Baru
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formRole, setFormRole] = useState<'siswa' | 'instruktur' | 'admin'>('siswa');
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [perusahaanList, setPerusahaanList] = useState<any[]>([]);

  useEffect(() => {
    fetchUsers();
    fetchDropdowns();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const result = await getAllUsersAction();
    if (result.error) {
      setError(result.error);
    } else {
      setUsers(result.data || []);
    }
    setLoading(false);
  };

  const fetchDropdowns = async () => {
    const [resKelas, resPerusahaan] = await Promise.all([
      getAllKelasAction(),
      getAllPerusahaanAction()
    ]);
    if (resKelas.success && resKelas.data) setKelasList(resKelas.data);
    if (resPerusahaan.data) setPerusahaanList(resPerusahaan.data);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!confirm(`Apakah Anda yakin mengubah role user ini menjadi ${newRole}?`)) return;
    const res = await updateUserRoleAction(userId, newRole);
    if (res.error) alert(res.error);
    else fetchUsers();
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    if (!confirm(`Apakah Anda yakin mengubah status user ini menjadi ${newStatus}?`)) return;
    const res = await updateUserStatusAction(userId, newStatus);
    if (res.error) alert(res.error);
    else fetchUsers();
  };

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const res = await createUserByAdminAction(formData);

    setSubmitting(false);
    if (res.error) {
      alert('Gagal membuat akun: ' + res.error);
    } else {
      alert(res.message || 'Akun berhasil dibuat!');
      setIsAddModalOpen(false);
      fetchUsers();
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.status_registrasi === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#f4f4f0] p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="bg-white p-2 neo-border hover:bg-[#ffe600] transition-colors">
              <ArrowLeft className="w-6 h-6 text-black" />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-black uppercase tracking-tight">Manajemen Akun</h1>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-[#00f0ff] hover:bg-[#00d8e6] text-black font-black px-4 py-2 neo-btn text-xs uppercase"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Tambah Akun Baru</span>
          </button>
        </div>

        {error && (
          <div className="bg-[#ff003c] text-white p-4 mb-6 neo-border font-bold">
            {error}
          </div>
        )}

        <div className="bg-white neo-card p-6 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Search className="text-gray-500 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Cari nama atau email..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-2 border-black p-2 outline-none focus:bg-[#ffe600] transition-colors w-full md:w-64 font-bold"
            />
          </div>
          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <select 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value)}
              className="border-2 border-black p-2 font-bold focus:bg-[#ffe600] outline-none cursor-pointer text-xs"
            >
              <option value="all">Semua Role</option>
              <option value="siswa">Siswa</option>
              <option value="instruktur">Instruktur</option>
              <option value="admin">Admin</option>
            </select>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-2 border-black p-2 font-bold focus:bg-[#ffe600] outline-none cursor-pointer text-xs"
            >
              <option value="all">Semua Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 font-black text-xl animate-pulse">Memuat Data...</div>
        ) : (
          <div className="bg-white neo-border overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black text-white text-xs uppercase tracking-wider">
                  <th className="p-4 border-r-2 border-gray-700">Nama</th>
                  <th className="p-4 border-r-2 border-gray-700">Email / Telp</th>
                  <th className="p-4 border-r-2 border-gray-700 text-center">Role</th>
                  <th className="p-4 border-r-2 border-gray-700 text-center">Status</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-black font-medium">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center font-bold text-gray-500">Tidak ada pengguna ditemukan.</td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b-2 border-black hover:bg-[#ffe600] hover:text-black font-black transition-colors">
                      <td className="p-4 border-r-2 border-black">
                        <div className="font-black text-base">{u.name}</div>
                        {u.siswa?.[0]?.batch && (
                          <div className="text-xs bg-gray-200 inline-block px-1 mt-1 neo-border">
                            {u.siswa[0].batch}
                          </div>
                        )}
                      </td>
                      <td className="p-4 border-r-2 border-black">
                        <div className="text-sm font-bold">{u.email}</div>
                        <div className="text-xs text-gray-700">{u.phone || '-'}</div>
                      </td>
                      <td className="p-4 border-r-2 border-black text-center">
                        <select 
                          value={u.role} 
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="border-2 border-black p-1 text-xs font-bold cursor-pointer hover:bg-gray-200 outline-none"
                        >
                          <option value="siswa">Siswa</option>
                          <option value="instruktur">Instruktur</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="p-4 border-r-2 border-black text-center">
                        <div className="flex flex-col items-center gap-2">
                          {u.status_registrasi === 'approved' && <span className="bg-[#74ee15] text-black px-2 py-1 text-xs font-black uppercase neo-border flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Approved</span>}
                          {u.status_registrasi === 'pending' && <span className="bg-[#ffe700] text-black px-2 py-1 text-xs font-black uppercase neo-border flex items-center"><Clock className="w-3 h-3 mr-1"/> Pending</span>}
                          {u.status_registrasi === 'rejected' && <span className="bg-[#ff003c] text-white px-2 py-1 text-xs font-black uppercase neo-border flex items-center"><XCircle className="w-3 h-3 mr-1"/> Rejected</span>}
                          
                          <select 
                            value={u.status_registrasi} 
                            onChange={(e) => handleStatusChange(u.id, e.target.value)}
                            className="border-2 border-black p-1 text-xs font-bold cursor-pointer hover:bg-gray-200 outline-none"
                          >
                            <option value="approved">Set Approved</option>
                            <option value="pending">Set Pending</option>
                            <option value="rejected">Set Rejected</option>
                          </select>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-xs text-gray-500 italic font-medium">Auto-saved</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah Akun Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="relative z-50 w-full max-w-lg bg-white neo-card shadow-none overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-[#00f0ff] p-4 border-b-3 border-black flex justify-between items-center shrink-0">
              <h3 className="text-lg font-black uppercase text-black">➕ Tambah Akun Pengguna Baru</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 hover:bg-black hover:text-white neo-border">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-black uppercase text-black mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Contoh: Budi Santoso"
                  className="w-full neo-input p-2 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-black mb-1">Email *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="budi@gmail.com"
                    className="w-full neo-input p-2 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-black mb-1">Password *</label>
                  <input
                    type="password"
                    name="password"
                    required
                    placeholder="Minimal 6 karakter"
                    className="w-full neo-input p-2 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-black mb-1">Pilih Role *</label>
                  <select
                    name="role"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as any)}
                    className="w-full neo-input p-2 text-xs font-black bg-[#ffe600]"
                  >
                    <option value="siswa">🎓 Siswa LPK</option>
                    <option value="instruktur">👨‍🏫 Instruktur / Guru</option>
                    <option value="admin">👑 Admin Sistem</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-black mb-1">No. WhatsApp / HP</label>
                  <input
                    type="text"
                    name="phone"
                    placeholder="081234567890"
                    className="w-full neo-input p-2 text-xs font-bold"
                  />
                </div>
              </div>

              {/* DYNAMIC FIELD SISWA: HANYA TAMPIL JIKA ROLE ADALAH SISWA */}
              {formRole === 'siswa' && (
                <div className="bg-[#fffde7] neo-card p-4 border-2 border-black space-y-3 mt-4">
                  <h4 className="text-xs font-black text-black uppercase tracking-tight border-b-2 border-black pb-1">
                    📋 Informasi Khusus Siswa
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black uppercase text-black mb-1">Pilih Kelas</label>
                      <select name="kelas_id" className="w-full neo-input p-1.5 text-xs font-bold bg-white">
                        <option value="">-- Tanpa Kelas --</option>
                        {kelasList.map(k => (
                          <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-black mb-1">Perusahaan Mitra</label>
                      <select name="perusahaan_id" className="w-full neo-input p-1.5 text-xs font-bold bg-white">
                        <option value="">-- Belum Ditempatkan --</option>
                        {perusahaanList.map(p => (
                          <option key={p.id} value={p.id}>{p.nama}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black uppercase text-black mb-1">Batch / Angkatan</label>
                      <input
                        type="text"
                        name="batch"
                        placeholder="Contoh: Batch 1"
                        className="w-full neo-input p-1.5 text-xs font-bold bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-black mb-1">Status Pendidikan</label>
                      <select name="status_pendidikan" defaultValue="belum_mulai" className="w-full neo-input p-1.5 text-xs font-bold bg-white">
                        <option value="belum_mulai">⚪ Belum Mulai Kelas (Auto-aktif)</option>
                        <option value="aktif">🟢 Aktif Belajar</option>
                        <option value="tunggu_terbang">🟡 Menunggu Terbang</option>
                        <option value="alumni">🔵 Alumni</option>
                        <option value="dropout">🔴 Drop Out</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase text-black mb-1">Tanggal Keberangkatan (Opsional)</label>
                    <input
                      type="date"
                      name="tanggal_berangkat"
                      className="w-full neo-input p-1.5 text-xs font-bold bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="mt-6 flex gap-3 shrink-0">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#ffe600] text-black neo-btn py-2 text-xs font-black uppercase disabled:opacity-50"
                >
                  {submitting ? 'Membuat Akun...' : 'Simpan Akun Baru'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 bg-white text-black neo-btn py-2 text-xs font-black uppercase"
                >
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

