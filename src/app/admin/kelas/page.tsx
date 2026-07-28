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
  removeSiswaFromKelasAction,
  getInstrukturListForAssignmentAction
} from '@/app/actions/kelas';
import { getLokasiPresetsAction } from '@/app/actions/sesi';
import IndonesianClock from '@/components/IndonesianClock';
import { ArrowLeft, Plus, Edit2, Trash2, Users, UserPlus, UserMinus, X, UserCheck, MapPin, Search } from 'lucide-react';
import Link from 'next/link';

type KelasItem = {
  id: string;
  nama_kelas: string;
  deskripsi: string | null;
  instruktur_id?: string | null;
  instruktur_ids?: string[];
  instruktur_list?: { id: string; name: string; email: string }[];
  nama_instruktur?: string | null;
  jumlah_siswa: number;
  lokasi_lat?: number | null;
  lokasi_lng?: number | null;
  radius_meter?: number | null;
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

type InstrukturOption = {
  id: string;
  name: string;
  email: string;
};

type LokasiPresetItem = {
  id: string;
  nama_lokasi: string;
  latitude: number;
  longitude: number;
  radius_meter: number;
};

export default function MasterKelasPage() {
  const [data, setData] = useState<KelasItem[]>([]);
  const [instrukturOptions, setInstrukturOptions] = useState<InstrukturOption[]>([]);
  const [lokasiPresets, setLokasiPresets] = useState<LokasiPresetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal Edit / Create Kelas
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentId, setCurrentId] = useState('');
  const [formData, setFormData] = useState({ 
    nama_kelas: '', 
    deskripsi: '', 
    instruktur_ids: [] as string[],
    lokasi_lat: '',
    lokasi_lng: '',
    radius_meter: '100'
  });
  const [gpsDetecting, setGpsDetecting] = useState(false);

  // Modal Kelola Siswa di Kelas
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedKelas, setSelectedKelas] = useState<KelasItem | null>(null);
  const [siswaInKelas, setSiswaInKelas] = useState<SiswaInKelas[]>([]);
  const [availableSiswa, setAvailableSiswa] = useState<AllSiswaOption[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // Interactive Add Siswa Modal State
  const [detailActiveTab, setDetailActiveTab] = useState<'tambah' | 'anggota'>('tambah');
  const [addSiswaSearch, setAddSiswaSearch] = useState('');
  const [addSiswaFilter, setAddSiswaFilter] = useState<'tanpa_kelas' | 'semua'>('tanpa_kelas');
  const [selectedBulkSiswaIds, setSelectedBulkSiswaIds] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [resKelas, resInstruktur, resPresets] = await Promise.all([
      getAllKelasAction(),
      getInstrukturListForAssignmentAction(),
      getLokasiPresetsAction()
    ]);

    if (resKelas.success && resKelas.data) {
      setData(resKelas.data);
    } else {
      setError(resKelas.error || 'Gagal memuat data kelas');
    }

    if (resInstruktur.success && resInstruktur.data) {
      setInstrukturOptions(resInstruktur.data);
    }

    if (resPresets && resPresets.data) {
      setLokasiPresets(resPresets.data);
    }

    setLoading(false);
  }

  function openCreateModal() {
    setModalMode('create');
    setFormData({ nama_kelas: '', deskripsi: '', instruktur_ids: [], lokasi_lat: '', lokasi_lng: '', radius_meter: '100' });
    setIsModalOpen(true);
  }

  function openEditModal(kelas: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setModalMode('edit');
    setCurrentId(kelas.id);
    const ids = kelas.instruktur_ids && kelas.instruktur_ids.length > 0
      ? kelas.instruktur_ids
      : (kelas.instruktur_id ? [kelas.instruktur_id] : []);

    setFormData({ 
      nama_kelas: kelas.nama_kelas, 
      deskripsi: kelas.deskripsi || '',
      instruktur_ids: ids,
      lokasi_lat: kelas.lokasi_lat !== null && kelas.lokasi_lat !== undefined ? String(kelas.lokasi_lat) : '',
      lokasi_lng: kelas.lokasi_lng !== null && kelas.lokasi_lng !== undefined ? String(kelas.lokasi_lng) : '',
      radius_meter: kelas.radius_meter ? String(kelas.radius_meter) : '100'
    });
    setIsModalOpen(true);
  }

  function handleAutoDetectGps() {
    if (!navigator.geolocation) {
      alert('Browser Anda tidak mendukung Geolocation GPS.');
      return;
    }
    setGpsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({
          ...prev,
          lokasi_lat: pos.coords.latitude.toFixed(6),
          lokasi_lng: pos.coords.longitude.toFixed(6)
        }));
        setGpsDetecting(false);
      },
      (err) => {
        alert('Gagal mendeteksi lokasi GPS: ' + err.message);
        setGpsDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.append('nama_kelas', formData.nama_kelas);
    fd.append('deskripsi', formData.deskripsi);
    formData.instruktur_ids.forEach(id => fd.append('instruktur_ids', id));
    fd.append('lokasi_lat', formData.lokasi_lat);
    fd.append('lokasi_lng', formData.lokasi_lng);
    fd.append('radius_meter', formData.radius_meter);
    
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
    setSelectedBulkSiswaIds([]);
    setAddSiswaSearch('');
    setAddSiswaFilter('tanpa_kelas');
    setDetailActiveTab('tambah'); // Direct to interactive add table!
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

  async function handleAddSingleSiswa(siswaId: string) {
    if (!siswaId || !selectedKelas) return;
    const res = await addSiswaToKelasAction(siswaId, selectedKelas.id);
    if (res.success) {
      await refreshDetailSiswa(selectedKelas.id);
      fetchData(); // refresh count
    } else {
      alert('Gagal menambahkan siswa: ' + res.error);
    }
  }

  async function handleAddBulkSiswa() {
    if (!selectedKelas || selectedBulkSiswaIds.length === 0) return;
    setLoadingDetail(true);
    for (const sId of selectedBulkSiswaIds) {
      await addSiswaToKelasAction(sId, selectedKelas.id);
    }
    const countAdded = selectedBulkSiswaIds.length;
    setSelectedBulkSiswaIds([]);
    await refreshDetailSiswa(selectedKelas.id);
    fetchData();
    alert(`🚀 BERHASIL! ${countAdded} Siswa telah ditambahkan ke kelas ${selectedKelas.nama_kelas}`);
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
                  <th className="px-6 py-4 text-left text-xs font-black text-black uppercase tracking-wider">Instruktur Pengajar</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-black uppercase tracking-wider">Titik Koordinat Lokasi & Radius</th>
                  <th className="px-6 py-4 text-center text-xs font-black text-black uppercase tracking-wider">Jumlah Siswa</th>
                  <th className="px-6 py-4 text-right text-xs font-black text-black uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y-2 divide-gray-200">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-10 text-center font-bold">Memuat data kelas...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-10 text-center font-bold">Belum ada data kelas.</td></tr>
                ) : (
                  data.map(item => (
                    <tr 
                      key={item.id} 
                      onClick={() => openDetailModal(item)}
                      className="hover:bg-[#ffe600] hover:text-black font-bold cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-black text-sm uppercase">{item.nama_kelas}</span>
                          {item.deskripsi && <span className="text-[11px] text-gray-600 font-normal">{item.deskripsi}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.instruktur_list && item.instruktur_list.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {item.instruktur_list.map((ins: any) => (
                              <span key={ins.id} className="bg-[#00f0ff] text-black px-2 py-0.5 neo-border text-[11px] font-black flex items-center gap-1">
                                👨‍🏫 {ins.name}
                              </span>
                            ))}
                          </div>
                        ) : item.nama_instruktur ? (
                          <span className="bg-[#00f0ff] text-black px-2.5 py-1 neo-border text-xs font-black flex items-center w-fit">
                            👨‍🏫 {item.nama_instruktur}
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-500 px-2 py-0.5 border border-gray-300 text-xs font-medium rounded">
                            Belum Ditugaskan
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.lokasi_lat !== null && item.lokasi_lng !== null && item.lokasi_lat !== undefined ? (
                          <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-950 px-2.5 py-1 neo-border border-emerald-400 text-xs font-black w-fit">
                            <span>📍 {item.lokasi_lat}, {item.lokasi_lng}</span>
                            <span className="bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[10px]">
                              {item.radius_meter || 100}m
                            </span>
                          </div>
                        ) : (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded text-[11px] font-bold">
                            ⚠️ Belum Ditinggalkan Koordinat
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="bg-[#74ee15] text-black px-2.5 py-1 neo-border text-xs font-black">
                          👥 {item.jumlah_siswa} Siswa
                        </span>
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
          <div className="relative z-50 w-full max-w-lg bg-white neo-card shadow-none max-h-[90vh] overflow-y-auto">
            <div className="bg-[#00f0ff] p-4 border-b-3 border-black flex justify-between items-center sticky top-0 z-10">
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
                <label className="block text-xs font-black uppercase text-black mb-1">
                  👨‍🏫 Instruktur Pengajar (Dapat Pilih Lebih Dari 1 Guru)
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto border-2 border-black p-2 bg.gray-50 rounded">
                  {instrukturOptions.length === 0 ? (
                    <p className="text-xs text-gray-500 italic p-1">Belum ada akun guru / instruktur.</p>
                  ) : (
                    instrukturOptions.map(ins => {
                      const isChecked = formData.instruktur_ids.includes(ins.id);
                      return (
                        <label key={ins.id} className={`flex items-center gap-2 cursor-pointer p-1.5 rounded text-xs font-bold transition-colors ${isChecked ? 'bg-[#ffe600] border border-black' : 'hover:bg-gray-200'}`}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({ ...prev, instruktur_ids: [...prev.instruktur_ids, ins.id] }));
                              } else {
                                setFormData(prev => ({ ...prev, instruktur_ids: prev.instruktur_ids.filter(id => id !== ins.id) }));
                              }
                            }}
                            className="w-4 h-4 accent-purple-800"
                          />
                          <span>👨‍🏫 {ins.name} ({ins.email})</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Titik Koordinat GPS & Radius Per Kelas */}
              <div className="p-4 bg-[#fffde7] neo-border space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-black text-black uppercase">
                    📍 Koordinat GPS Lokasi Kelas Ini
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoDetectGps}
                    disabled={gpsDetecting}
                    className="bg-[#74ee15] hover:bg-[#60d60e] text-black px-2.5 py-1 neo-border text-[11px] font-black uppercase flex items-center gap-1"
                  >
                    {gpsDetecting ? 'Mendeteksi...' : '🎯 Deteksi GPS Saya'}
                  </button>
                </div>

                {/* Dropdown Preset Lokasi */}
                <div>
                  <label className="block text-[10px] font-black text-black uppercase mb-1 flex items-center gap-1">
                    <span>⭐ Pilih dari Preset Lokasi yang Sudah Ditentukan:</span>
                  </label>
                  <select
                    onChange={(e) => {
                      const pId = e.target.value;
                      const preset = lokasiPresets.find(p => p.id === pId);
                      if (preset) {
                        setFormData(prev => ({
                          ...prev,
                          lokasi_lat: String(preset.latitude),
                          lokasi_lng: String(preset.longitude),
                          radius_meter: String(preset.radius_meter || 100)
                        }));
                      }
                    }}
                    className="w-full neo-input p-2 text-xs font-black bg-white border-2 border-black"
                  >
                    <option value="">-- Click/Pilih Lokasi Preset (Contoh: PT PAKO, VASANTA, dll) --</option>
                    {lokasiPresets.map(p => (
                      <option key={p.id} value={p.id}>
                        🏢 {p.nama_lokasi} (Lat: {p.latitude}, Lng: {p.longitude}, {p.radius_meter || 100}m)
                      </option>
                    ))}
                  </select>
                  {lokasiPresets.length === 0 && (
                    <p className="text-[10px] text-gray-500 italic mt-1">
                      Belum ada preset lokasi diset. Anda bisa tambah preset di menu Pengaturan Sesi & Lokasi.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-black text-gray-700 uppercase mb-0.5">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Contoh: -6.200000"
                      value={formData.lokasi_lat}
                      onChange={(e) => setFormData({...formData, lokasi_lat: e.target.value})}
                      className="w-full neo-input p-2 text-xs font-bold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-700 uppercase mb-0.5">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Contoh: 106.800000"
                      value={formData.lokasi_lng}
                      onChange={(e) => setFormData({...formData, lokasi_lng: e.target.value})}
                      className="w-full neo-input p-2 text-xs font-bold bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-700 uppercase mb-0.5">Radius Presensi (Meter)</label>
                  <input
                    type="number"
                    min="10"
                    max="5000"
                    value={formData.radius_meter}
                    onChange={(e) => setFormData({...formData, radius_meter: e.target.value})}
                    className="w-full neo-input p-2 text-xs font-bold bg-white"
                  />
                  <p className="text-[10px] text-gray-500 font-bold mt-1">
                    Batas jarak maksimal siswa dari lokasi kelas saat menekan Masuk Kelas.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-black uppercase text-black mb-1">Deskripsi / Catatan</label>
                <textarea
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
                  className="w-full neo-input p-2 font-bold text-sm"
                  rows={2}
                  placeholder="Contoh: Gedung LPK Lantai 2"
                ></textarea>
              </div>

              <div className="mt-6 flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-[#ffe600] text-black neo-btn py-2.5 text-xs font-black uppercase">
                  Simpan Kelas
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-[#f4f4f0] text-black neo-btn py-2.5 text-xs font-black uppercase">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kelola Siswa di Kelas (Interactive Table View) */}
      {isDetailModalOpen && selectedKelas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setIsDetailModalOpen(false)}></div>
          <div className="relative z-50 w-full max-w-4xl bg-white neo-card shadow-none overflow-hidden max-h-[90vh] flex flex-col border-4 border-black">
            {/* Header Modal Detail */}
            <div className="bg-[#ffe600] p-4 border-b-4 border-black flex justify-between items-center shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-black uppercase">🎓 {selectedKelas.nama_kelas}</span>
                  <span className="bg-black text-white px-2.5 py-1 text-xs font-black uppercase rounded">
                    {siswaInKelas.length} Siswa Terdaftar
                  </span>
                </div>
                {selectedKelas.deskripsi && (
                  <p className="text-xs font-bold text-black mt-0.5">{selectedKelas.deskripsi}</p>
                )}
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-1.5 hover:bg-black hover:text-white neo-border">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub Nav Tabs inside Modal */}
            <div className="flex border-b-4 border-black bg-gray-100 shrink-0">
              <button
                onClick={() => setDetailActiveTab('tambah')}
                className={`flex-1 py-3 px-4 font-black text-xs uppercase flex items-center justify-center gap-2 border-r-2 border-black transition-colors ${
                  detailActiveTab === 'tambah'
                    ? 'bg-[#00f0ff] text-black border-b-4 border-b-black font-black'
                    : 'bg-white text-gray-700 hover:bg-gray-200'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>➕ Tambah Siswa Ke Kelas</span>
                <span className="bg-black text-white text-[10px] px-1.5 py-0.5 rounded font-black">
                  {availableSiswa.filter(s => !s.siswa?.kelas_id).length} Tanpa Kelas
                </span>
              </button>
              <button
                onClick={() => setDetailActiveTab('anggota')}
                className={`flex-1 py-3 px-4 font-black text-xs uppercase flex items-center justify-center gap-2 transition-colors ${
                  detailActiveTab === 'anggota'
                    ? 'bg-[#74ee15] text-black border-b-4 border-b-black font-black'
                    : 'bg-white text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>👥 Anggota Kelas Saat Ini ({siswaInKelas.length})</span>
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-gray-50">
              
              {/* TAB TAMBAH SISWA (INTERACTIVE TABLE FOR UNASSIGNED STUDENTS) */}
              {detailActiveTab === 'tambah' && (
                <div className="space-y-4">
                  {/* Filter & Search Bar */}
                  <div className="bg-white p-3 neo-border space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-3">
                    <div className="flex-1 relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="🔍 Cari nama atau email siswa..."
                        value={addSiswaSearch}
                        onChange={(e) => setAddSiswaSearch(e.target.value)}
                        className="w-full neo-input pl-9 pr-3 py-1.5 text-xs font-bold bg-white"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={addSiswaFilter}
                        onChange={(e: any) => setAddSiswaFilter(e.target.value)}
                        className="neo-input p-1.5 text-xs font-bold bg-white shrink-0"
                      >
                        <option value="tanpa_kelas">⚪ Khusus Siswa Tanpa Kelas (Default)</option>
                        <option value="semua">Semua Siswa Approved</option>
                      </select>

                      {selectedBulkSiswaIds.length > 0 && (
                        <button
                          onClick={handleAddBulkSiswa}
                          className="bg-[#00f0ff] hover:bg-[#00d8e6] text-black font-black px-3 py-1.5 neo-btn text-xs uppercase shrink-0 flex items-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          <span>+ Tambahkan ({selectedBulkSiswaIds.length}) Siswa</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Table View Tambah Siswa */}
                  <div className="bg-white neo-border overflow-hidden">
                    <div className="overflow-x-auto max-h-[50vh]">
                      <table className="w-full text-xs text-left whitespace-nowrap border-collapse">
                        <thead className="text-[11px] uppercase bg-gray-100 sticky top-0 z-10 border-b-2 border-black font-black text-black">
                          <tr>
                            <th scope="col" className="px-3 py-2.5 text-center w-10 border-r border-black">
                              <input
                                type="checkbox"
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const filtered = availableSiswa.filter(s => {
                                      if (s.siswa?.kelas_id === selectedKelas.id) return false;
                                      if (addSiswaFilter === 'tanpa_kelas' && s.siswa?.kelas_id) return false;
                                      if (addSiswaSearch.trim()) {
                                        const query = addSiswaSearch.toLowerCase();
                                        return s.name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query);
                                      }
                                      return true;
                                    });
                                    setSelectedBulkSiswaIds(filtered.map(f => f.siswa?.id || '').filter(Boolean));
                                  } else {
                                    setSelectedBulkSiswaIds([]);
                                  }
                                }}
                                checked={
                                  availableSiswa.filter(s => s.siswa?.kelas_id !== selectedKelas.id && (addSiswaFilter === 'semua' || !s.siswa?.kelas_id)).length > 0 &&
                                  selectedBulkSiswaIds.length === availableSiswa.filter(s => s.siswa?.kelas_id !== selectedKelas.id && (addSiswaFilter === 'semua' || !s.siswa?.kelas_id)).length
                                }
                                className="w-4 h-4 accent-purple-800"
                              />
                            </th>
                            <th scope="col" className="px-3 py-2.5 text-center w-10 border-r border-black">No</th>
                            <th scope="col" className="px-4 py-2.5 border-r border-black">Nama Siswa & Email</th>
                            <th scope="col" className="px-4 py-2.5 border-r border-black">Status Kelas Saat Ini</th>
                            <th scope="col" className="px-4 py-2.5 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y border-black font-bold">
                          {loadingDetail ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-gray-500 animate-pulse font-bold">
                                Memuat data siswa...
                              </td>
                            </tr>
                          ) : (() => {
                            const list = availableSiswa.filter(s => {
                              if (s.siswa?.kelas_id === selectedKelas.id) return false; // skip siswa yang sudah di kelas ini
                              if (addSiswaFilter === 'tanpa_kelas' && s.siswa?.kelas_id) return false;
                              if (addSiswaSearch.trim()) {
                                const q = addSiswaSearch.toLowerCase();
                                return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
                              }
                              return true;
                            });

                            if (list.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500 font-bold">
                                    {addSiswaFilter === 'tanpa_kelas' 
                                      ? '🎉 Tidak ada siswa yang belum punya kelas. Semua siswa sudah terdistribusi!'
                                      : 'Tidak ditemukan siswa sesuai pencarian.'}
                                  </td>
                                </tr>
                              );
                            }

                            return list.map((s, idx) => {
                              const sId = s.siswa?.id;
                              const isChecked = sId ? selectedBulkSiswaIds.includes(sId) : false;
                              const currentKelasNama = s.siswa?.master_kelas?.nama_kelas;

                              return (
                                <tr key={s.id} className="hover:bg-[#fffde7] transition-colors">
                                  <td className="px-3 py-2 text-center border-r border-gray-200">
                                    {sId && (
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedBulkSiswaIds(prev => [...prev, sId]);
                                          } else {
                                            setSelectedBulkSiswaIds(prev => prev.filter(id => id !== sId));
                                          }
                                        }}
                                        className="w-4 h-4 accent-purple-800"
                                      />
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-center border-r border-gray-200 text-gray-600">{idx + 1}</td>
                                  <td className="px-4 py-2 border-r border-gray-200">
                                    <p className="font-black text-black uppercase">{s.name}</p>
                                    <p className="text-[11px] text-gray-500 font-medium">{s.email}</p>
                                  </td>
                                  <td className="px-4 py-2 border-r border-gray-200">
                                    {currentKelasNama ? (
                                      <span className="bg-amber-100 text-amber-900 border border-amber-400 px-2 py-0.5 text-[10px] font-black rounded uppercase">
                                        🏫 {currentKelasNama}
                                      </span>
                                    ) : (
                                      <span className="bg-gray-200 text-gray-700 border border-gray-400 px-2 py-0.5 text-[10px] font-black rounded uppercase">
                                        ⚪ Tanpa Kelas
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                    {sId && (
                                      <button
                                        onClick={() => handleAddSingleSiswa(sId)}
                                        className="bg-[#74ee15] hover:bg-[#60d60e] text-black font-black px-3 py-1 neo-btn text-[11px] uppercase flex items-center justify-center gap-1 mx-auto"
                                      >
                                        <Plus className="w-3.5 h-3.5" /> Tambahkan
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB ANGGOTA KELAS SAAT INI */}
              {detailActiveTab === 'anggota' && (
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
                      {siswaInKelas.map((item, idx) => (
                        <div key={item.id} className="p-3 flex items-center justify-between hover:bg-[#fffde7] transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-gray-500 w-5">{idx + 1}.</span>
                            <div>
                              <p className="text-xs font-black text-black uppercase">{item.users?.name || 'Tanpa Nama'}</p>
                              <p className="text-[11px] font-bold text-gray-500">{item.users?.email}</p>
                            </div>
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
              )}
            </div>

            <div className="bg-gray-100 p-4 border-t-4 border-black text-right shrink-0">
              <button 
                onClick={() => setIsDetailModalOpen(false)} 
                className="bg-black text-white px-6 py-2 neo-btn text-xs font-black uppercase"
              >
                Selesai / Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
