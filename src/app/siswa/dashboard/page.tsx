'use client';

import { useState, useEffect, useCallback } from 'react';
import { getStudentDashboardDataAction } from '@/app/actions/siswa';
import { ajukanIzinAction, getInstrukturAction } from '@/app/actions/izin';
import { logoutAction } from '@/app/actions/auth';
import IndonesianClock from '@/components/IndonesianClock';
import { formatIndonesianDate, formatIndonesianTime } from '@/lib/date';
import { QrCode, LogOut, Calendar, Clock, MapPin, CheckCircle, XCircle, AlertCircle, Building2 } from 'lucide-react';
import Link from 'next/link';
import SoftSkillHistoryAccordion from '@/components/SoftSkillHistoryAccordion';

export default function SiswaDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Ambil bulan saat ini (YYYY-MM)
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [monthFilter, setMonthFilter] = useState(currentMonth);
  const [historyFilter, setHistoryFilter] = useState<'semua' | 'hadir' | 'gagal' | 'tidak_masuk'>('semua');
  
  // State untuk modal izin
  const [isIzinModalOpen, setIsIzinModalOpen] = useState(false);
  const [izinTanggal, setIzinTanggal] = useState('');
  const [izinTipe, setIzinTipe] = useState<'izin' | 'sakit'>('izin');
  const [izinAlasan, setIzinAlasan] = useState('');
  const [izinDilaporkanKe, setIzinDilaporkanKe] = useState('');
  const [izinLoading, setIzinLoading] = useState(false);
  const [izinError, setIzinError] = useState('');
  const [instrukturList, setInstrukturList] = useState<{id: string, name: string}[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getStudentDashboardDataAction(monthFilter);
    if (result.error) {
      setError(result.error);
    } else {
      setData(result);
    }
    
    // Fetch Instrukturs
    const insRes = await getInstrukturAction();
    if (insRes.data) {
      setInstrukturList(insRes.data);
    }
    
    setLoading(false);
  }, [monthFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper untuk format tanggal & jam
  const formatDate = (isoString: string) => formatIndonesianDate(isoString);
  const formatTime = (isoString: string) => formatIndonesianTime(isoString);

  const handleAjukanIzin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIzinError('');
    setIzinLoading(true);

    const formData = new FormData();
    formData.append('tanggal', izinTanggal);
    formData.append('tipe', izinTipe);
    formData.append('alasan', izinAlasan);
    if (izinDilaporkanKe) formData.append('dilaporkan_ke', izinDilaporkanKe);

    const result = await ajukanIzinAction(formData);
    if (result.error) {
      setIzinError(result.error);
    } else {
      setIsIzinModalOpen(false);
      setIzinTanggal('');
      setIzinAlasan('');
      alert('Permohonan izin/sakit berhasil diajukan.');
      fetchData(); // Refresh data
    }
    setIzinLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f4f0] font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b-4 border-black shadow-none sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-black text-black uppercase tracking-tight">Portal Siswa</h1>
          <div className="flex items-center gap-3">
            <IndonesianClock />
            <form action={logoutAction}>
              <button className="flex items-center text-black bg-white hover:bg-black hover:text-white px-2.5 py-1.5 neo-btn text-xs">
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
        
        {/* Profile & Placement Badge */}
        {data && (
          <div className="bg-[#ffe600] neo-card p-5 mb-6">
            <h2 className="text-black text-xs font-black uppercase">Selamat datang,</h2>
            <p className="text-2xl font-black text-black uppercase tracking-tight mb-4">{data.profile.name}</p>
            
            {data.profile.statusPenempatan === 'sudah' ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-start bg-[#00e676] neo-border p-3">
                  <Building2 className="w-5 h-5 text-black mr-3 mt-0.5" />
                  <div>
                    <p className="text-xs text-black font-black uppercase tracking-wider">Status Penempatan</p>
                    <p className="text-xs font-black text-black mt-0.5">Sudah ditempatkan di <span className="underline">{data.profile.namaPerusahaan}</span></p>
                  </div>
                </div>
                {data.profile.namaKelas && (
                  <div className="flex items-start bg-[#ff00c8] text-white neo-border p-3">
                    <div className="flex items-center">
                      <p className="text-xs font-black uppercase tracking-wider mr-2">Kelas:</p>
                      <span className="text-xs font-black bg-white text-black px-2 py-0.5">{data.profile.namaKelas}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-start bg-[#ffe600] neo-border p-3">
                <AlertCircle className="w-5 h-5 text-black mr-3 mt-0.5" />
                <div>
                  <p className="text-xs text-black font-black uppercase tracking-wider">Status Penempatan</p>
                  <p className="text-xs font-black text-black mt-0.5">Belum ditempatkan di Perusahaan Mitra.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Soft Skill History Accordion */}
        <SoftSkillHistoryAccordion />

        {/* Scan Action Button */}
        <div className="mb-8 grid grid-cols-2 gap-4">
          <Link 
            href="/siswa/scan"
            className="flex flex-col items-center justify-center w-full bg-[#00f0ff] hover:bg-[#00d8e6] text-black font-black py-4 px-4 neo-btn"
          >
            <QrCode className="w-8 h-8 mb-2 text-black" />
            <span className="text-xs uppercase">Scan QR Absensi</span>
          </Link>

          <button 
            onClick={() => setIsIzinModalOpen(true)}
            className="flex flex-col items-center justify-center w-full bg-[#ff007f] hover:bg-[#d8006b] text-white font-black py-4 px-4 neo-btn"
          >
            <Calendar className="w-8 h-8 mb-2 text-white" />
            <span className="text-xs uppercase">Ajukan Izin/Sakit</span>
          </button>
        </div>

        {/* Attendance History Section */}
        <div className="bg-[#00f0ff] neo-card overflow-hidden">
          <div className="p-4 border-b-3 border-black flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#fffde7]">
            <h3 className="font-black text-black uppercase flex items-center text-sm">
              <Calendar className="w-4 h-4 mr-2 text-black" />
              Riwayat Absensi
            </h3>
            
            <input 
              type="month" 
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="text-xs neo-input py-1 px-3"
            />
          </div>

          {/* Filter Tabs / Buttons */}
          <div className="bg-white px-4 py-2.5 border-b-2 border-black flex flex-wrap gap-2 text-xs font-bold">
            <button
              onClick={() => setHistoryFilter('semua')}
              className={`px-3 py-1 neo-btn text-xs ${historyFilter === 'semua' ? 'bg-[#ffe600] text-black' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Semua
            </button>
            <button
              onClick={() => setHistoryFilter('hadir')}
              className={`px-3 py-1 neo-btn text-xs ${historyFilter === 'hadir' ? 'bg-[#00e676] text-black' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Hadir
            </button>
            <button
              onClick={() => setHistoryFilter('gagal')}
              className={`px-3 py-1 neo-btn text-xs ${historyFilter === 'gagal' ? 'bg-[#ff1744] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Gagal Scan
            </button>
            <button
              onClick={() => setHistoryFilter('tidak_masuk')}
              className={`px-3 py-1 neo-btn text-xs ${historyFilter === 'tidak_masuk' ? 'bg-[#ff00c8] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Tidak Masuk / Alpha / Izin
            </button>
          </div>

          <div className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-800 font-medium">Memuat riwayat...</div>
            ) : error ? (
              <div className="p-8 text-center text-red-600 font-semibold">{error}</div>
            ) : (() => {
              const filteredRiwayat = (data?.riwayat || []).filter((absen: any) => {
                if (historyFilter === 'hadir') {
                  return absen.status === 'hadir' || absen.status === 'telat';
                }
                if (historyFilter === 'gagal') {
                  return absen.status === 'ditolak_lokasi' || absen.status === 'ditolak_expired';
                }
                if (historyFilter === 'tidak_masuk') {
                  return ['alpha', 'izin_pending', 'izin', 'sakit', 'belum_absen'].includes(absen.status);
                }
                return true;
              });

              if (filteredRiwayat.length === 0) {
                return (
                  <div className="p-10 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <Calendar className="w-8 h-8 text-gray-500" />
                    </div>
                    <p className="text-gray-800 font-medium">Tidak ada riwayat absensi untuk kategori ini.</p>
                  </div>
                );
              }

              return (
                <ul className="divide-y divide-gray-100 bg-white">
                  {filteredRiwayat.map((absen: any) => (
                    <li key={absen.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="text-sm font-bold text-gray-900 mb-1">{formatDate(absen.waktu_scan)}</p>
                          <div className="flex items-center text-xs text-gray-800 font-medium space-x-3">
                            <span className="flex items-center">
                              <Clock className="w-3.5 h-3.5 mr-1 text-gray-700" /> {formatTime(absen.waktu_scan)}
                            </span>
                          </div>
                          {absen.alasan_izin && (
                            <p className="text-xs text-gray-600 italic mt-1 bg-gray-50 p-1.5 rounded border border-gray-200">
                              &quot;{absen.alasan_izin}&quot;
                            </p>
                          )}
                        </div>
                        
                        {/* Status Badge */}
                        <div className="flex flex-col items-end shrink-0">
                          {absen.status === 'hadir' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-900 border border-green-300">
                              <CheckCircle className="w-3 h-3 mr-1 text-green-600" /> Hadir
                            </span>
                          )}
                          {absen.status === 'telat' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-900 border border-yellow-300">
                              <Clock className="w-3 h-3 mr-1 text-yellow-600" /> Terlambat
                            </span>
                          )}
                          {absen.status === 'ditolak_lokasi' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-900 border border-red-300">
                              <MapPin className="w-3 h-3 mr-1 text-red-600" /> Luar Radius
                            </span>
                          )}
                          {absen.status === 'ditolak_expired' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-900 border border-red-300">
                              <XCircle className="w-3 h-3 mr-1 text-red-600" /> Sesi Expired
                            </span>
                          )}
                          {absen.status === 'izin_pending' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-400">
                              <AlertCircle className="w-3 h-3 mr-1 text-amber-600" /> Izin (Menunggu Approval)
                            </span>
                          )}
                          {absen.status === 'izin' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">
                              <Calendar className="w-3 h-3 mr-1 text-blue-600" /> Izin (Disetujui)
                            </span>
                          )}
                          {absen.status === 'sakit' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300">
                              <AlertCircle className="w-3 h-3 mr-1 text-purple-600" /> Sakit (Disetujui)
                            </span>
                          )}
                          {absen.status === 'alpha' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-600 text-white border border-red-800">
                              <XCircle className="w-3 h-3 mr-1" /> Tidak Masuk (Alpha)
                            </span>
                          )}
                          {absen.status === 'belum_absen' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800 border border-gray-300">
                              <Clock className="w-3 h-3 mr-1 text-gray-500" /> Belum Absen (Hari Ini)
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </div>
        </div>

      </main>

      {/* Modal Izin/Sakit */}
      {isIzinModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Pengajuan Izin/Sakit</h3>
            
            {izinError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">
                {izinError}
              </div>
            )}
            
            <form onSubmit={handleAjukanIzin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tanggal</label>
                <input 
                  type="date" 
                  required
                  value={izinTanggal}
                  onChange={(e) => setIzinTanggal(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Jenis</label>
                <select 
                  value={izinTipe}
                  onChange={(e) => setIzinTipe(e.target.value as 'izin' | 'sakit')}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="izin">Izin</option>
                  <option value="sakit">Sakit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Laporan Ke (Instruktur)</label>
                <select 
                  value={izinDilaporkanKe}
                  onChange={(e) => setIzinDilaporkanKe(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="">-- Pilih Instruktur / Admin --</option>
                  {instrukturList.map(ins => (
                    <option key={ins.id} value={ins.id}>{ins.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Alasan</label>
                <textarea 
                  required
                  value={izinAlasan}
                  onChange={(e) => setIzinAlasan(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  rows={3}
                  placeholder="Jelaskan alasan izin/sakit..."
                ></textarea>
              </div>
              
              <div className="pt-2 text-xs text-gray-500 italic">
                * Bukti foto/surat dokter silakan dikirimkan langsung melalui WhatsApp Instruktur atau Admin LPK.
              </div>

              <div className="flex space-x-3 pt-4 border-t mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsIzinModalOpen(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50"
                  disabled={izinLoading}
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 px-4 bg-blue-600 rounded-xl text-white font-bold hover:bg-blue-700"
                  disabled={izinLoading}
                >
                  {izinLoading ? 'Mengirim...' : 'Kirim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
