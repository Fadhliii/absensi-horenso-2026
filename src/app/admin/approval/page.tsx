'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  getPendingStudentsAction, 
  approveStudentAction, 
  rejectStudentAction, 
  resetPasswordAction,
  logoutAction
} from '@/app/actions/auth';
import { Check, X, Key, LogOut } from 'lucide-react';

type PendingStudent = {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
};

export default function AdminApprovalPage() {
  const [students, setStudents] = useState<PendingStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetModal, setResetModal] = useState<{ isOpen: boolean; studentName: string; newPassword?: string; error?: string }>({ isOpen: false, studentName: '' });

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const result = await getPendingStudentsAction();
    if (result.data) {
      setStudents(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  async function handleApprove(id: string) {
    if (!confirm('Yakin ingin menerima pendaftaran siswa ini?')) return;
    await approveStudentAction(id);
    fetchStudents(); // Refresh data
  }

  async function handleReject(id: string) {
    if (!confirm('Yakin ingin menolak pendaftaran siswa ini?')) return;
    await rejectStudentAction(id);
    fetchStudents(); // Refresh data
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
          <h1 className="text-xl font-bold text-gray-900">Dashboard Admin</h1>
          <form action={logoutAction}>
            <button className="flex items-center text-gray-600 hover:text-red-600 text-sm font-medium transition-colors">
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Persetujuan Siswa Baru</h2>
          <div className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
            {students.length} Menunggu
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-800 font-medium">Memuat data...</div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-10 text-center text-gray-800 font-medium">
            Tidak ada siswa yang menunggu persetujuan saat ini.
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {students.map((student) => (
                <li key={student.id} className="p-4 sm:px-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-blue-700 truncate">{student.name}</p>
                      <p className="text-sm text-gray-800 font-medium">
                        {student.email} • {student.phone || '-'}
                      </p>
                      <p className="text-xs text-gray-700 mt-1 font-medium">
                        Terdaftar: {new Date(student.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResetPassword(student.id, student.name)}
                        className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-800 bg-white hover:bg-gray-50"
                        title="Reset Password"
                      >
                        <Key className="w-4 h-4 text-gray-800" />
                      </button>
                      <button
                        onClick={() => handleReject(student.id)}
                        className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-1" /> Tolak
                      </button>
                      <button
                        onClick={() => handleApprove(student.id)}
                        className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-1" /> Terima
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      {/* Modal Reset Password */}
      {resetModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setResetModal({ isOpen: false, studentName: '' })}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Key className="h-6 w-6 text-blue-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Password Berhasil Direset
                    </h3>
                    <div className="mt-2">
                      {resetModal.error ? (
                        <p className="text-sm text-red-600 font-semibold">{resetModal.error}</p>
                      ) : (
                        <>
                          <p className="text-sm text-gray-800">
                            Password sementara untuk <strong>{resetModal.studentName}</strong> adalah:
                          </p>
                          <div className="mt-3 p-4 bg-gray-100 rounded-md border border-gray-200 text-center">
                            <span className="text-2xl font-mono font-bold tracking-wider text-gray-900 select-all">
                              {resetModal.newPassword}
                            </span>
                          </div>
                          <p className="mt-3 text-xs text-red-500 font-medium">
                            PENTING: Salin dan berikan password ini kepada siswa SEKARANG. Password ini hanya ditampilkan satu kali!
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setResetModal({ isOpen: false, studentName: '' })}
                >
                  Tutup & Saya Sudah Salin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
