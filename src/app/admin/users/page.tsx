'use client';

import { useState, useEffect } from 'react';
import { getAllUsersAction, updateUserRoleAction, updateUserStatusAction } from '@/app/actions/users';
import Link from 'next/link';
import { ArrowLeft, Search, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function UsersManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // all, siswa, instruktur, admin
  const [statusFilter, setStatusFilter] = useState('all'); // all, approved, pending, rejected

  useEffect(() => {
    fetchUsers();
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

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.status_registrasi === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#f4f4f0] p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/dashboard" className="bg-white p-2 neo-border hover:bg-[#ffe600] transition-colors">
            <ArrowLeft className="w-6 h-6 text-black" />
          </Link>
          <h1 className="text-3xl font-black text-black uppercase tracking-tight">Manajemen Akun</h1>
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
              className="border-2 border-black p-2 font-bold focus:bg-[#ffe600] outline-none cursor-pointer"
            >
              <option value="all">Semua Role</option>
              <option value="siswa">Siswa</option>
              <option value="instruktur">Instruktur</option>
              <option value="admin">Admin</option>
            </select>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-2 border-black p-2 font-bold focus:bg-[#ffe600] outline-none cursor-pointer"
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
                <tr className="bg-black text-white text-sm uppercase tracking-wider">
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
                        <div className="font-black text-lg">{u.name}</div>
                        {u.siswa?.[0]?.batch && (
                          <div className="text-xs bg-gray-200 inline-block px-1 mt-1 neo-border">
                            {u.siswa[0].batch}
                          </div>
                        )}
                      </td>
                      <td className="p-4 border-r-2 border-black">
                        <div>{u.email}</div>
                        <div className="text-sm text-gray-700">{u.phone}</div>
                      </td>
                      <td className="p-4 border-r-2 border-black text-center">
                        <select 
                          value={u.role} 
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="border-2 border-black p-1 text-sm font-bold cursor-pointer hover:bg-gray-200 outline-none"
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
                        {/* Bisa ditambahkan reset password di sini */}
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
    </div>
  );
}
