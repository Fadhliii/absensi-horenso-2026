'use client';

import { useState, useEffect } from 'react';
import { 
  mulaiSesiAction, 
  getLokasiPresetsAction, 
  createLokasiPresetAction, 
  deleteLokasiPresetAction,
  getAutoJadwalListAction,
  saveAutoJadwalAction,
  toggleAutoJadwalAction,
  deleteAutoJadwalAction
} from '@/app/actions/sesi';
import { getAllKelasAction } from '@/app/actions/kelas';
import { logoutAction } from '@/app/actions/auth';
import { getAccurateLocation } from '@/lib/geo';
import { MapPin, LogOut, ArrowLeft, Loader2, CheckCircle2, Bookmark, Save, Trash2, Settings, Plus, X, Clock, Calendar, Zap, Check, Sparkles } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { 
  ssr: false, 
  loading: () => (
    <div className="h-[400px] w-full bg-slate-100 animate-pulse rounded-xl flex flex-col items-center justify-center text-slate-500 border-2 border-slate-200 border-dashed">
      <Loader2 className="w-8 h-8 animate-spin mb-2" />
      <p className="font-medium">Memuat Peta (OpenStreetMap)...</p>
    </div>
  ) 
});

type PresetItem = {
  id: string;
  nama_lokasi: string;
  latitude: number;
  longitude: number;
  radius_meter: number;
};

export default function BukaSesiPage() {
  const router = useRouter();
  const [lat, setLat] = useState<number | ''>('');
  const [lng, setLng] = useState<number | ''>('');
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState('');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [radius, setRadius] = useState(50);
  
  const [intervalType, setIntervalType] = useState('10'); // default 10 detik
  const [customInterval, setCustomInterval] = useState('');

  // Preset Location State
  const [presets, setPresets] = useState<PresetItem[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Auto Schedule State
  const [autoSchedules, setAutoSchedules] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<{ id: string; nama_kelas: string }[]>([]);
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false);
  const [autoFormData, setAutoFormData] = useState({
    id: '',
    kelas_id: '',
    jam_mulai: '07:00',
    durasi_menit: '120',
    hari_aktif: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
    is_active: true
  });
  const [autoSaveLoading, setAutoSaveLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [resPresets, resAuto, resKelas] = await Promise.all([
        getLokasiPresetsAction(),
        getAutoJadwalListAction(),
        getAllKelasAction()
      ]);
      if (resPresets.data) setPresets(resPresets.data);
      if (resAuto.data) setAutoSchedules(resAuto.data);
      if (resKelas.data) setKelasList(resKelas.data.map(k => ({ id: k.id, nama_kelas: k.nama_kelas })));
    }
    loadData();
  }, []);

  async function reloadAutoSchedules() {
    const res = await getAutoJadwalListAction();
    if (res.data) setAutoSchedules(res.data);
  }

  function handleSelectPreset(id: string) {
    setSelectedPresetId(id);
    if (!id) return;
    const p = presets.find(item => item.id === id);
    if (p) {
      setLat(p.latitude);
      setLng(p.longitude);
      setRadius(p.radius_meter);
      setAccuracy(null);
    }
  }

  async function handleSavePresetSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newPresetName || lat === '' || lng === '') return;

    setSaveLoading(true);
    const formData = new FormData();
    formData.append('nama_lokasi', newPresetName);
    formData.append('latitude', lat.toString());
    formData.append('longitude', lng.toString());
    formData.append('radius', radius.toString());

    const result = await createLokasiPresetAction(formData);
    if (result.success) {
      const updated = await getLokasiPresetsAction();
      if (updated.data) setPresets(updated.data);
      setIsSaveModalOpen(false);
      setNewPresetName('');
    } else if (result.error) {
      alert(result.error);
    }
    setSaveLoading(false);
  }

  async function handleDeletePreset(id: string) {
    if (!confirm('Hapus lokasi tersimpan ini?')) return;
    const result = await deleteLokasiPresetAction(id);
    if (result.success) {
      if (selectedPresetId === id) setSelectedPresetId('');
      const updated = await getLokasiPresetsAction();
      if (updated.data) setPresets(updated.data);
    }
  }

  async function handleSaveAutoSchedule(e: React.FormEvent) {
    e.preventDefault();
    setAutoSaveLoading(true);

    const fd = new FormData();
    if (autoFormData.id) fd.append('id', autoFormData.id);
    fd.append('kelas_id', autoFormData.kelas_id);
    fd.append('jam_mulai', autoFormData.jam_mulai);
    fd.append('durasi_menit', autoFormData.durasi_menit);
    fd.append('is_active', String(autoFormData.is_active));
    autoFormData.hari_aktif.forEach(h => fd.append('hari_aktif', h));

    const res = await saveAutoJadwalAction(fd);
    if (res.success) {
      await reloadAutoSchedules();
      setIsAutoModalOpen(false);
      setAutoFormData({
        id: '',
        kelas_id: '',
        jam_mulai: '07:00',
        durasi_menit: '120',
        hari_aktif: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
        is_active: true
      });
    } else {
      alert('Gagal menyimpan jadwal otomatis: ' + res.error);
    }
    setAutoSaveLoading(false);
  }

  async function handleToggleAutoSchedule(id: string, currentStatus: boolean) {
    const res = await toggleAutoJadwalAction(id, !currentStatus);
    if (res.success) {
      reloadAutoSchedules();
    }
  }

  async function handleDeleteAutoSchedule(id: string) {
    if (!confirm('Hapus pengaturan jadwal otomatis ini?')) return;
    const res = await deleteAutoJadwalAction(id);
    if (res.success) {
      reloadAutoSchedules();
    }
  }

  function handleGetLocation() {
    setLocLoading(true);
    setLocError('');
    setAccuracy(null);
    setSelectedPresetId(''); // reset preset dropdown jika ambil GPS hp baru

    getAccurateLocation(
      (res) => {
        setLat(res.latitude);
        setLng(res.longitude);
        setAccuracy(res.accuracy);
        setLocLoading(false);
      },
      (err) => {
        setLocError(`Gagal mengambil lokasi presisi: ${err.message}`);
        setLocLoading(false);
      },
      (currentAcc) => {
        setAccuracy(currentAcc);
      }
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lat === '' || lng === '') {
      setSubmitError('Silakan pilih lokasi tersimpan atau ambil lokasi GPS terlebih dahulu!');
      return;
    }
    
    setSubmitLoading(true);
    setSubmitError('');
    
    const formData = new FormData(e.currentTarget);
    formData.set('latitude', lat.toString());
    formData.set('longitude', lng.toString());
    
    const finalInterval = intervalType === 'custom' ? customInterval : intervalType;
    formData.set('interval', finalInterval);

    const result = await mulaiSesiAction(formData);
    
    if (result?.error) {
      setSubmitError(result.error);
      setSubmitLoading(false);
    } else if (result?.success && result.sessionId) {
      router.push(`/admin/sesi/${result.sessionId}`);
    }
  }

  const selectedPreset = presets.find(p => p.id === selectedPresetId);

  return (
    <div className="min-h-screen bg-[#f4f4f0] font-sans">
      <header className="bg-white border-b-4 border-black sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="p-2 text-black hover:bg-black hover:text-white neo-border transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-black tracking-tight uppercase">Buka Sesi Absensi QR</h1>
              <p className="text-xs text-black font-bold uppercase">Pilih Lokasi Tersimpan & Aktifkan Sesi</p>
            </div>
          </div>
          <form action={logoutAction}>
            <button className="flex items-center text-black bg-white hover:bg-black hover:text-white px-3 py-1.5 neo-btn text-xs">
              <LogOut className="w-4 h-4 mr-1.5" /> Logout
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white neo-card neo-shadow-lg p-6 sm:p-8">
          <div className="mb-6 border-b-3 border-black pb-4">
            <h2 className="text-2xl font-black text-black uppercase">Pengaturan Sesi Absensi</h2>
            <p className="text-xs font-bold text-black uppercase mt-1">Gunakan lokasi tersimpan atau jadwalkan sesi otomatis harian.</p>
          </div>

          {submitError && (
            <div className="bg-[#ff1744] text-white neo-border p-4 mb-6 text-xs font-black uppercase">
              ⚠️ {submitError}
            </div>
          )}

          {/* SECTION: JADWAL ABSENSI OTOMATIS HARIAN */}
          <div className="bg-[#ffe600] p-5 neo-card neo-shadow-sm mb-6 border-3 border-black">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <div>
                <h3 className="text-sm font-black text-black uppercase flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-black" /> ⏰ Auto Daily Session (Jadwal Otomatis Harian)
                </h3>
                <p className="text-[11px] font-bold text-black uppercase mt-0.5">
                  Sistem otomatis membuka & menutup QR Code di jam & durasi yang ditentukan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAutoFormData({
                    id: '',
                    kelas_id: '',
                    jam_mulai: '07:00',
                    durasi_menit: '120',
                    hari_aktif: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
                    is_active: true
                  });
                  setIsAutoModalOpen(true);
                }}
                className="bg-black text-white hover:bg-gray-800 px-3 py-1.5 neo-btn text-xs font-black uppercase flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Atur Jadwal Otomatis
              </button>
            </div>

            {/* List Active Auto Schedules */}
            {autoSchedules.length === 0 ? (
              <div className="bg-white p-3 neo-border text-center text-xs font-bold text-gray-600">
                Belum ada jadwal otomatis harian diset. Klik <strong>+ Atur Jadwal Otomatis</strong> untuk mengaktifkan sesi otomatis jam 07:00 pagi setiap hari.
              </div>
            ) : (
              <div className="space-y-2">
                {autoSchedules.map((sch) => {
                  const namaKelas = sch.master_kelas?.nama_kelas || 'Semua Kelas (General)';
                  const durasiJam = sch.durasi_menit ? (sch.durasi_menit / 60).toFixed(1).replace('.0', '') + ' Jam' : '2 Jam';
                  const hariStr = sch.hari_aktif ? sch.hari_aktif.join(', ') : 'Senin-Jumat';

                  return (
                    <div key={sch.id} className="bg-white p-3 neo-border flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[10px] font-black uppercase border border-black ${sch.is_active ? 'bg-[#74ee15] text-black' : 'bg-gray-200 text-gray-600'}`}>
                            {sch.is_active ? '🟢 AKTIF' : '⚪ NONAKTIF'}
                          </span>
                          <span className="text-xs font-black text-black uppercase">🎓 {namaKelas}</span>
                        </div>
                        <p className="text-[11px] font-bold text-gray-700 mt-1 flex items-center gap-2">
                          <span>⏰ Jam Mulai: <strong>{sch.jam_mulai} WIB</strong></span>
                          <span>⏳ Durasi: <strong>{durasiJam}</strong> ({sch.durasi_menit}m)</span>
                        </p>
                        <p className="text-[10px] font-bold text-gray-500 mt-0.5">
                          📅 Hari: {hariStr}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleAutoSchedule(sch.id, sch.is_active)}
                          className={`px-2.5 py-1 neo-border text-[10px] font-black uppercase ${
                            sch.is_active ? 'bg-amber-200 hover:bg-amber-300 text-black' : 'bg-[#74ee15] hover:bg-[#60d60e] text-black'
                          }`}
                        >
                          {sch.is_active ? 'Matikan' : 'Aktifkan'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAutoSchedule(sch.id)}
                          className="p-1.5 bg-[#ff1744] hover:bg-red-700 text-white neo-border"
                          title="Hapus Jadwal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Preset Selector Card */}
          <div className="bg-[#00f0ff] p-5 neo-card neo-shadow-sm mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-black text-black uppercase flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-black fill-black" /> Pilih Lokasi Tersimpan (Preset)
              </label>
              {presets.length > 0 && (
                <button 
                  type="button" 
                  onClick={() => setIsManageModalOpen(true)}
                  className="text-[11px] font-black text-black underline uppercase hover:text-blue-800 flex items-center gap-1"
                >
                  <Settings className="w-3.5 h-3.5" /> Kelola Preset
                </button>
              )}
            </div>

            <select
              value={selectedPresetId}
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="w-full px-3.5 py-2.5 neo-input text-xs font-black bg-white cursor-pointer"
            >
              <option value="">-- Ambil GPS Otomatis / Pilih dari Peta --</option>
              {presets.map(p => (
                <option key={p.id} value={p.id}>
                  📍 {p.nama_lokasi} (Radius: {p.radius_meter}m)
                </option>
              ))}
            </select>

            {selectedPreset && (
              <div className="mt-3 p-3 bg-[#00e676] neo-border flex items-center justify-between text-xs font-black text-black">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 fill-black text-white" />
                  <span>Lokasi &quot;{selectedPreset.nama_lokasi}&quot; Terpilih! Radius: {selectedPreset.radius_meter}m</span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Radius */}
            <div>
              <label className="block text-xs font-black text-black uppercase mb-1">Radius Toleransi (Meter)</label>
              <input 
                type="number" 
                name="radius" 
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value) || 10)}
                min="10" 
                required
                className="w-full px-4 py-3 neo-input font-black text-lg text-black bg-[#fffde7]"
              />
              <p className="text-[11px] font-bold text-black uppercase mt-1">Lingkaran pada peta akan membesar/mengecil sesuai radius ini.</p>
            </div>

            {/* Lokasi GPS + Map */}
            <div className="neo-card bg-white overflow-hidden">
              <div className="p-4 bg-[#ffe600] border-b-3 border-black flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <label className="block text-xs font-black text-black uppercase">Titik Pusat Absensi</label>
                  <p className="text-[11px] font-bold text-black uppercase mt-0.5">Geser pin di peta untuk menyesuaikan lokasi presisi.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button 
                    type="button" 
                    onClick={handleGetLocation} 
                    disabled={locLoading}
                    className="inline-flex justify-center items-center px-3 py-2 neo-btn text-xs bg-[#00e676] hover:bg-[#00c853] text-black font-black"
                  >
                    {locLoading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <MapPin className="w-4 h-4 mr-1.5" />}
                    Ambil GPS HP
                  </button>

                  {lat !== '' && lng !== '' && (
                    <button 
                      type="button" 
                      onClick={() => setIsSaveModalOpen(true)}
                      className="inline-flex justify-center items-center px-3 py-2 neo-btn text-xs bg-white text-black font-black"
                      title="Simpan koordinat saat ini sebagai preset lokasi tersimpan"
                    >
                      <Save className="w-4 h-4 mr-1.5" /> Simpan Preset
                    </button>
                  )}
                </div>
              </div>

              {locError && <p className="text-xs font-black text-[#ff1744] p-4 pb-0">⚠️ {locError}</p>}

              <div className="p-4">
                <MapPicker 
                  lat={lat} 
                  lng={lng} 
                  radius={radius} 
                  onLocationChange={(newLat, newLng) => {
                    setLat(newLat);
                    setLng(newLng);
                    setSelectedPresetId(''); // Reset preset jika pin digeser manual
                  }} 
                />
              </div>

              {/* Info Lat/Lng & Akurasi */}
              <div className="px-4 py-3 bg-[#f4f4f0] border-t-3 border-black flex flex-wrap justify-between items-center text-xs font-black text-black gap-2">
                <span>Lat: {lat === '' ? '-' : (lat as number).toFixed(6)}</span>
                <span>Lng: {lng === '' ? '-' : (lng as number).toFixed(6)}</span>
                {accuracy !== null && (
                  <span className={`px-2 py-0.5 neo-badge text-black flex items-center gap-1 ${accuracy > 50 ? 'bg-[#ffe600]' : 'bg-[#00e676]'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Akurasi: ±{accuracy}m
                  </span>
                )}
              </div>
            </div>

            {/* Interval Refresh QR */}
            <div>
              <label className="block text-xs font-black text-black uppercase mb-1">Interval Refresh QR Code</label>
              <select 
                value={intervalType}
                onChange={(e) => setIntervalType(e.target.value)}
                className="w-full px-3.5 py-2.5 neo-input text-xs font-black mb-2"
              >
                <option value="3">3 Detik (Paling Aman, Realtime)</option>
                <option value="5">5 Detik (Disarankan)</option>
                <option value="10">10 Detik (Lebih Longgar - Default)</option>
                <option value="custom">Custom / Input Manual</option>
              </select>

              {intervalType === 'custom' && (
                <input 
                  type="number" 
                  value={customInterval}
                  onChange={(e) => setCustomInterval(e.target.value)}
                  placeholder="Masukkan angka dalam detik (misal: 15)"
                  min="2"
                  required
                  className="w-full px-3.5 py-2.5 neo-input text-xs font-black"
                />
              )}
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={submitLoading || lat === ''}
                className="w-full bg-[#00f0ff] hover:bg-[#00d8e6] text-black font-black py-4 text-base neo-btn disabled:opacity-50 uppercase tracking-wide"
              >
                {submitLoading ? 'Menyiapkan Sesi...' : '🚀 Langsung Aktifkan Sesi QR'}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Modal Simpan Preset Baru */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsSaveModalOpen(false)}></div>
          <div className="relative z-50 w-full max-w-md bg-white neo-card neo-shadow-lg p-6">
            <h3 className="text-xl font-black text-black uppercase mb-2 border-b-3 border-black pb-2">
              💾 Simpan Lokasi Tersimpan
            </h3>
            <p className="text-xs text-black font-bold mb-4">
              Beri nama lokasi ini (misal: Gedung LPK, Workshop, Lapangan) agar bisa langsung dipilih di kemudian hari tanpa setting ulang.
            </p>
            <form onSubmit={handleSavePresetSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-black uppercase mb-1">Nama Lokasi / Ruangan *</label>
                <input 
                  type="text" 
                  required 
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="Contoh: Gedung Utama LPK / Kelas A"
                  className="w-full px-3.5 py-2.5 neo-input text-xs font-black"
                />
              </div>
              <div className="p-3 bg-[#fffde7] neo-border text-xs font-bold text-black space-y-1">
                <p>Lat: {lat.toString()}</p>
                <p>Lng: {lng.toString()}</p>
                <p>Radius: {radius} Meter</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-4 py-2 text-xs font-black text-black bg-white neo-btn"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={saveLoading}
                  className="px-5 py-2 text-xs font-black text-black bg-[#00e676] hover:bg-[#00c853] neo-btn"
                >
                  {saveLoading ? 'Menyimpan...' : 'Simpan Preset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kelola Presets */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsManageModalOpen(false)}></div>
          <div className="relative z-50 w-full max-w-lg bg-white neo-card neo-shadow-lg p-6 flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center border-b-3 border-black pb-2 mb-4">
              <h3 className="text-xl font-black text-black uppercase">
                ⚙️ Kelola Lokasi Tersimpan
              </h3>
              <button onClick={() => setIsManageModalOpen(false)} className="p-1 neo-border bg-white text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {presets.length === 0 ? (
                <p className="text-xs font-black text-black text-center py-8">Belum ada lokasi tersimpan.</p>
              ) : (
                presets.map(p => (
                  <div key={p.id} className="p-3 bg-[#f4f4f0] neo-border flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-black text-black uppercase">{p.nama_lokasi}</h4>
                      <p className="text-[11px] font-bold text-gray-700">Radius: {p.radius_meter}m • Lat: {p.latitude.toFixed(5)}, Lng: {p.longitude.toFixed(5)}</p>
                    </div>
                    <button 
                      onClick={() => handleDeletePreset(p.id)}
                      className="p-2 neo-border bg-[#ff1744] text-white hover:bg-red-800 shrink-0"
                      title="Hapus Preset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t-3 border-black flex justify-end mt-4">
              <button 
                onClick={() => setIsManageModalOpen(false)}
                className="px-5 py-2 text-xs font-black text-black bg-white neo-btn"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pengaturan Jadwal Otomatis Harian */}
      {isAutoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsAutoModalOpen(false)}></div>
          <div className="relative z-50 w-full max-w-lg bg-white neo-card neo-shadow-lg overflow-hidden border-4 border-black">
            <div className="flex justify-between items-center border-b-4 border-black p-4 bg-[#ffe600]">
              <h3 className="text-lg font-black text-black uppercase flex items-center gap-2">
                ⏰ Set Jadwal Absen Otomatis Harian
              </h3>
              <button onClick={() => setIsAutoModalOpen(false)} className="p-1 neo-border bg-white text-black hover:bg-black hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAutoSchedule} className="p-6 space-y-4">
              {/* Status Switch */}
              <div className="flex items-center justify-between p-3 bg-[#fffde7] neo-border">
                <span className="text-xs font-black uppercase text-black">Status Otomatisasi</span>
                <label className="flex items-center cursor-pointer gap-2">
                  <input
                    type="checkbox"
                    checked={autoFormData.is_active}
                    onChange={(e) => setAutoFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="w-5 h-5 accent-purple-800 cursor-pointer"
                  />
                  <span className="text-xs font-black uppercase text-black">
                    {autoFormData.is_active ? '🟢 AKTIF' : '⚪ NONAKTIF'}
                  </span>
                </label>
              </div>

              {/* Kelas Target */}
              <div>
                <label className="block text-xs font-black text-black uppercase mb-1">Target Kelas</label>
                <select
                  value={autoFormData.kelas_id}
                  onChange={(e) => setAutoFormData(prev => ({ ...prev, kelas_id: e.target.value }))}
                  className="w-full px-3 py-2 neo-input text-xs font-black bg-white cursor-pointer"
                >
                  <option value="">-- Semua Kelas (General / Seluruh Siswa) --</option>
                  {kelasList.map(k => (
                    <option key={k.id} value={k.id}>🎓 {k.nama_kelas}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Jam Mulai */}
                <div>
                  <label className="block text-xs font-black text-black uppercase mb-1">Jam Mulai Sesi (WIB)</label>
                  <input
                    type="time"
                    required
                    value={autoFormData.jam_mulai}
                    onChange={(e) => setAutoFormData(prev => ({ ...prev, jam_mulai: e.target.value }))}
                    className="w-full px-3 py-2 neo-input text-sm font-black bg-white"
                  />
                  <p className="text-[10px] font-bold text-gray-500 mt-1">Sesi QR dibuka otomatis pada jam ini.</p>
                </div>

                {/* Durasi Sesi */}
                <div>
                  <label className="block text-xs font-black text-black uppercase mb-1">Durasi Aktif Sesi</label>
                  <select
                    value={autoFormData.durasi_menit}
                    onChange={(e) => setAutoFormData(prev => ({ ...prev, durasi_menit: e.target.value }))}
                    className="w-full px-3 py-2 neo-input text-xs font-black bg-white cursor-pointer"
                  >
                    <option value="30">30 Menit</option>
                    <option value="60">60 Menit (1 Jam)</option>
                    <option value="90">90 Menit (1.5 Jam)</option>
                    <option value="120">120 Menit (2 Jam - Default)</option>
                    <option value="180">180 Menit (3 Jam)</option>
                    <option value="240">240 Menit (4 Jam)</option>
                  </select>
                  <p className="text-[10px] font-bold text-gray-500 mt-1">Sesi ditutup otomatis setelah durasi habis.</p>
                </div>
              </div>

              {/* Hari Operasional */}
              <div>
                <label className="block text-xs font-black text-black uppercase mb-1">Hari Operasional Sesi Otomatis</label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(hari => {
                    const isChecked = autoFormData.hari_aktif.includes(hari);
                    return (
                      <label
                        key={hari}
                        className={`p-2 text-center neo-border text-[11px] font-black uppercase cursor-pointer transition-colors ${
                          isChecked ? 'bg-[#74ee15] text-black border-2 border-black' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAutoFormData(prev => ({ ...prev, hari_aktif: [...prev.hari_aktif, hari] }));
                            } else {
                              setAutoFormData(prev => ({ ...prev, hari_aktif: prev.hari_aktif.filter(h => h !== hari) }));
                            }
                          }}
                          className="sr-only"
                        />
                        <span>{hari.slice(0, 3)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t-3 border-black">
                <button
                  type="button"
                  onClick={() => setIsAutoModalOpen(false)}
                  className="px-4 py-2 text-xs font-black text-black bg-white neo-btn"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={autoSaveLoading}
                  className="px-6 py-2 text-xs font-black text-black bg-[#74ee15] hover:bg-[#60d60e] neo-btn flex items-center gap-1.5"
                >
                  {autoSaveLoading ? 'Menyimpan...' : '💾 Simpan Jadwal Otomatis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
