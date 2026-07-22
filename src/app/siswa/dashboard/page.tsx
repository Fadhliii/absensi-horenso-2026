'use client';

import { useState, useEffect, useCallback } from 'react';
import { getStudentDashboardDataAction } from '@/app/actions/siswa';
import { ajukanIzinAction, getInstrukturAction } from '@/app/actions/izin';
import { logoutAction } from '@/app/actions/auth';
import IndonesianClock from '@/components/IndonesianClock';
import { formatIndonesianDate, formatIndonesianTime } from '@/lib/date';
import { QrCode, LogOut, Calendar, Clock, MapPin, CheckCircle, XCircle, AlertCircle, Building2, Filter } from 'lucide-react';
import Link from 'next/link';
import SoftSkillHistoryAccordion from '@/components/SoftSkillHistoryAccordion';

export default function SiswaDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter bulan & kategori
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
    
    const insRes = await getInstrukturAction();
    if (insRes.data) {
      setInstrukturList(insRes.data);
    }
    
    setLoading(false);
  }, [monthFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      fetchData();
    }
    setIzinLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f4f0] font-sans flex flex-col">
      {/* Ringkas Header */}
      <header className="bg-white border-b-4 border-black sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-lg font-black text-black uppercase tracking-tight">Portal Siswa</h1>
          <div className="flex items-center gap-2">
            <IndonesianClock />
            <form action={logoutAction}>
              <button className="flex items-center text-black bg-white hover:bg-black hover:text-white px-2 py-1 neo-btn text-xs">
                <LogOut className="w-3.5 h-3.5 mr-1" /> Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-5 space-y-5">
        
        {/* Compact Profile Card */}
        {data && (
          <div className="bg-[#ffe600] neo-card p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-3 mb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-black">Siswa LPK</span>
                <h2 className="text-xl font-black text-black uppercase tracking-tight">{data.profile.name}</h2>
              </div>

              {data.profile.namaKelas && (
                <div className="bg-[#ff00c8] text-white px-3 py-1 neo-border text-xs font-black self-start sm:self-auto uppercase">
                  Kelas: {data.profile.namaKelas}
                </div>
              )}
            </div>
            
            {/* Status Penempatan Compact */}
            {data.profile.statusPenempatan === 'sudah' ? (
              <div className="flex items-center bg-[#00e676] neo-border p-2.5 text-xs font-black text-black">
                <Building2 className="w-4 h-4 mr-2 shrink-0" />
                <span>Penempatan: <span className="underline">{data.profile.namaPerusahaan}</span></span>
              </div>
            ) : (
              <div className="flex items-center bg-[#fffde7] neo-border p-2.5 text-xs font-black text-black">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0 text-amber-600" />
                <span>Belum Ditempatkan di Perusahaan Mitra</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Link 
            href="/siswa/scan"
            className="flex items-center justify-center gap-2 bg-[#00f0ff] hover:bg-[#00d8e6] text-black font-black py-3 px-3 neo-btn text-xs uppercase"
          >
            <QrCode className="w-5 h-5 shrink-0" />
            <span>Scan QR Absen</span>
          </Link>

          <button 
            onClick={() => setIsIzinModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-[#ff007f] hover:bg-[#d8006b] text-white font-black py-3 px-3 neo-btn text-xs uppercase"
          >
            <Calendar className="w-5 h-5 shrink-0" />
            <span>Ajukan Izin/Sakit</span>
          </button>
        </div>

        {/* Soft Skill History Accordion */}
        <SoftSkillHistoryAccordion />

        {/* Riwayat Absensi Ringkas & Integrated Filter */}
        <div className="bg-[#00f0ff] neo-card overflow-hidden">
          {/* Header Card Ringkas: Judul & Dropdown Filter Bersatu */}
          <div className="p-3 bg-[#fffde7] border-b-3 border-black flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="font-black text-black uppercase flex items-center text-xs sm:text-sm">
              <Calendar className="w-4 h-4 mr-1.5 text-black" />
              Riwayat Absensi
            </h3>

            <div className="flex items-center gap-2">
              {/* Filter Kategori Dropdown */}
              <div className="relative">
                <select
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value as any)}
                  className="text-xs font-bold neo-input py-1 pl-7 pr-2 bg-white text-black"
                >
                  <option value="semua">Semua Status</option>
                  <option value="hadir">Hadir / Telat</option>
                  <option value="gagal">Gagal Scan</option>
                  <option value="tidak_masuk">Tidak Masuk / Alpha / Izin</option>
                </select>
                <Filter className="w-3.5 h-3.5 absolute left-2 top-2 text-black pointer-events-none" />
              </div>

              {/* Month Filter */}
              <input 
                type="month" 
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="text-xs font-bold neo-input py-1 px-2 bg-white text-black"
              />
            </div>
          </div>

          {/* List Content */}
          <div className="p-0">
            {loading ? (
              <div className="p-6 text-center text-gray-800 font-medium text-xs">Memuat riwayat...</div>
            ) : error ? (
              <div className="p-6 text-center text-red-600 font-semibold text-xs">{error}</div>
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
                  <div className="p-8 text-center flex flex-col items-center bg-white">
                    <Calendar className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-gray-700 font-bold text-xs">Tidak ada data untuk kategori filter ini.</p>
                  </div>
                );
              }

              return (
                <ul className="divide-y divide-gray-200 bg-white">
                  {filteredRiwayat.map((absen: any) => (
                    <li key={absen.id} className="p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="text-xs font-black text-gray-900 mb-0.5">{formatDate(absen.waktu_scan)}</p>
                          <div className="flex items-center text-[11px] text-gray-700 font-medium">
                            <Clock className="w-3 h-3 mr-1 text-gray-500" /> {formatTime(absen.waktu_scan)}
                          </div>
                          {absen.alasan_izin && (
                            <p className="text-[11px] text-gray-600 italic mt-1 bg-gray-50 p-1.5 rounded border border-gray-200">
                              &quot;{absen.alasan_izin}&quot;
                            </p>
                          )}
                        </div>
                        
                        {/* Status Badge */}
                        <div className="flex flex-col items-end shrink-0">
                          {absen.status === 'hadir' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-green-100 text-green-900 border border-green-300">
                              <CheckCircle className="w-3 h-3 mr-1 text-green-600" /> Hadir
                            </span>
                          )}
                          {absen.status === 'telat' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-yellow-100 text-yellow-900 border border-yellow-300">
                              <Clock className="w-3 h-3 mr-1 text-yellow-600" /> Terlambat
                            </span>
                          )}
                          {absen.status === 'ditolak_lokasi' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-900 border border-red-300">
                              <MapPin className="w-3 h-3 mr-1 text-red-600" /> Luar Radius
                            </span>
                          )}
                          {absen.status === 'ditolak_expired' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-900 border border-red-300">
                              <XCircle className="w-3 h-3 mr-1 text-red-600" /> Sesi Expired
                            </span>
                          )}
                          {absen.status === 'izin_pending' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-400">
                              <AlertCircle className="w-3 h-3 mr-1 text-amber-600" /> Izin (Pending)
                            </span>
                          )}
                          {absen.status === 'izin' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                              <Calendar className="w-3 h-3 mr-1 text-blue-600" /> Izin (Disetujui)
                            </span>
                          )}
                          {absen.status === 'sakit' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                              <AlertCircle className="w-3 h-3 mr-1 text-purple-600" /> Sakit (Disetujui)
                            </span>
                          )}
                          {absen.status === 'alpha' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-600 text-white border border-red-800">
                              <XCircle className="w-3 h-3 mr-1" /> Tidak Masuk (Alpha)
                            </span>
                          )}
                          {absen.status === 'belum_absen' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-800 border border-gray-300">
                              <Clock className="w-3 h-3 mr-1 text-gray-500" /> Belum Absen
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
