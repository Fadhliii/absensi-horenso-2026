'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getPendingAbsensiListAction, bulkApproveAbsensiAction, bulkRejectAbsensiAction } from '@/app/actions/approval';
import { getAllKelasAction } from '@/app/actions/kelas';
import IndonesianClock from '@/components/IndonesianClock';
import { CheckCircle2, XCircle, Clock, MapPin, Search, Filter, ShieldCheck, AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function AdminApprovalAbsensiPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const todayStr = new Date().toISOString().slice(0, 10);
  const [filterTanggal, setFilterTanggal] = useState(todayStr);
  const [filterKelas, setFilterKelas] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selection & Target Status
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetStatuses, setTargetStatuses] = useState<Record<string, 'hadir' | 'tidak_hadir'>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    const res = await getPendingAbsensiListAction(filterTanggal, filterKelas || undefined);
    if (res.success && res.data) {
      setData(res.data);
      const initialMap: Record<string, 'hadir' | 'tidak_hadir'> = {};
      const allIds: string[] = [];
      res.data.forEach((item: any) => {
        initialMap[item.id] = 'hadir';
        allIds.push(item.id);
      });
      setTargetStatuses(initialMap);
      setSelectedIds(allIds);
    } else {
      setError(res.error || 'Gagal memuat data.');
    }

    const kRes = await getAllKelasAction();
    if (kRes.success && kRes.data) {
      setKelasList(kRes.data);
    }

    setLoading(false);
  }, [filterTanggal, filterKelas]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered Students
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.nama_kelas.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [data, searchQuery]);

  // Select / Deselect All
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredData.map(i => i.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleChangeTargetStatus = (id: string, status: 'hadir' | 'tidak_hadir') => {
    setTargetStatuses(prev => ({ ...prev, [id]: status }));
  };

  const handleSetAllTargetStatus = (status: 'hadir' | 'tidak_hadir') => {
    const updated: Record<string, 'hadir' | 'tidak_hadir'> = { ...targetStatuses };
    selectedIds.forEach(id => {
      updated[id] = status;
    });
    setTargetStatuses(updated);
  };

  // Process selected items based on targetStatuses
  const handleProcessSelected = async () => {
    if (selectedIds.length === 0) {
      alert('Pilih minimal 1 siswa!');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    const hadirItems = selectedIds
      .filter(id => targetStatuses[id] === 'hadir')
      .map(id => ({ id, targetStatus: 'hadir' as const }));

    const tidakHadirIds = selectedIds.filter(id => targetStatuses[id] === 'tidak_hadir');

    let approvedCount = 0;
    let rejectedCount = 0;

    if (hadirItems.length > 0) {
      const resA = await bulkApproveAbsensiAction(hadirItems);
      if (resA.success) approvedCount = resA.count || 0;
      else setError(resA.error || 'Gagal memproses persetujuan.');
    }

    if (tidakHadirIds.length > 0) {
      const resR = await bulkRejectAbsensiAction(tidakHadirIds);
      if (resR.success) rejectedCount = resR.count || 0;
      else setError(resR.error || 'Gagal memproses penolakan.');
    }

    setSuccessMsg(`Selesai diproses! ${approvedCount} Disetujui Hadir, ${rejectedCount} Ditolak / Tidak Hadir.`);
    await fetchData();
    setSubmitting(false);
  };

  // Quick 1-Click Action for individual row
  const handleSingleAction = async (id: string, status: 'hadir' | 'tidak_hadir') => {
    setSubmitting(true);
    if (status === 'hadir') {
      const res = await bulkApproveAbsensiAction([{ id, targetStatus: 'hadir' }]);
      if (res.success) setSuccessMsg('Siswa berhasil disetujui HADIR!');
      else setError(res.error || 'Gagal menyetujui.');
    } else {
      const res = await bulkRejectAbsensiAction([id]);
      if (res.success) setSuccessMsg('Siswa ditandai TIDAK HADIR.');
      else setError(res.error || 'Gagal menolak.');
    }
    await fetchData();
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f4f0] font-sans pb-28">
      {/* Header */}
      <header className="bg-white border-b-4 border-black sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="p-1.5 bg-[#ffe600] border-2 border-black rounded hover:bg-black hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-green-800 bg-green-100 px-2 py-0.5 rounded border border-green-300">
                Persetujuan Berjamaah
              </span>
              <h1 className="text-lg font-black text-black uppercase tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-600" /> Persetujuan Masuk Kelas
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <IndonesianClock />
            <button 
              onClick={fetchData} 
              disabled={loading}
              className="neo-btn px-3 py-1.5 bg-[#00f0ff] hover:bg-[#00d8e6] text-black font-black text-xs uppercase flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">

        {/* Informational Guidance Box */}
        <div className="bg-[#fffde7] neo-card p-4 border-3 border-black flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-xs font-black text-black uppercase">Petunjuk & Peraturan Persetujuan Masuk Kelas</h3>
            <p className="text-xs font-bold text-gray-700 leading-relaxed">
              Berikut adalah daftar siswa yang menekan tombol <b>"Masuk Kelas"</b> hari ini. Pilih status <b>🟢 HADIR</b> atau <b>🔴 TIDAK HADIR</b> pada setiap siswa, lalu klik tombol <b>"SIMPAN PERSETUJUAN"</b> di bawah.
            </p>
            <p className="text-[11px] font-black text-purple-900 bg-purple-100 p-2 rounded border border-purple-300 mt-1">
              ⏰ <b>Peraturan Otomatis (Auto-Approve 3 Jam)</b>: Jika antrian persetujuan belum di-ACC oleh Admin/Guru selama <b>3 jam</b> (dihitung sejak siswa pertama menekan Masuk Kelas), maka seluruh antrian siswa pada hari tersebut akan <b>otomatis disetujui sebagai HADIR</b> oleh sistem.
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-white neo-card p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input 
                type="text"
                placeholder="Cari nama siswa atau kelas..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full neo-input pl-9 pr-3 py-2 text-xs font-bold bg-white text-black"
              />
            </div>

            {/* Date & Class Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <input 
                type="date"
                value={filterTanggal}
                onChange={e => setFilterTanggal(e.target.value)}
                className="neo-input px-3 py-2 text-xs font-bold bg-white text-black"
              />

              <div className="relative">
                <select
                  value={filterKelas}
                  onChange={e => setFilterKelas(e.target.value)}
                  className="neo-input pl-8 pr-4 py-2 text-xs font-bold bg-white text-black"
                >
                  <option value="">Semua Kelas</option>
                  {kelasList.map(k => (
                    <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                  ))}
                </select>
                <Filter className="w-3.5 h-3.5 absolute left-2.5 top-3 text-black pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Success / Error Banners */}
        {successMsg && (
          <div className="bg-green-100 border-2 border-green-800 text-green-900 font-bold text-xs p-3 neo-border flex items-center justify-between">
            <span>✅ {successMsg}</span>
            <button onClick={() => setSuccessMsg('')} className="font-black">✕</button>
          </div>
        )}
        {error && (
          <div className="bg-red-100 border-2 border-red-800 text-red-900 font-bold text-xs p-3 neo-border flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} className="font-black">✕</button>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white neo-card overflow-hidden">
          
          {/* Top Selection & Quick Bulk Action Bar */}
          <div className="p-3.5 bg-[#e0f2fe] border-b-2 border-black flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-black text-black cursor-pointer uppercase">
                <input 
                  type="checkbox"
                  checked={filteredData.length > 0 && selectedIds.length === filteredData.length}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 accent-black rounded border-2 border-black"
                />
                Pilih Semua ({selectedIds.length}/{filteredData.length} Siswa)
              </label>
            </div>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-black uppercase">Ubah Pilihan Ke:</span>
                <button 
                  type="button"
                  onClick={() => handleSetAllTargetStatus('hadir')}
                  className="px-3 py-1 bg-[#74ee15] hover:bg-green-500 text-black font-black text-xs uppercase rounded border-2 border-black shadow-sm"
                >
                  🟢 Semua HADIR
                </button>
                <button 
                  type="button"
                  onClick={() => handleSetAllTargetStatus('tidak_hadir')}
                  className="px-3 py-1 bg-[#ff003c] hover:bg-red-700 text-white font-black text-xs uppercase rounded border-2 border-black shadow-sm"
                >
                  🔴 Semua TIDAK HADIR
                </button>
              </div>
            )}
          </div>

          {/* List Content */}
          {loading ? (
            <div className="p-12 text-center text-gray-700 font-bold text-xs">Memuat data permintaan Masuk Kelas...</div>
          ) : filteredData.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mb-2" />
              <p className="text-sm font-black text-black uppercase">Tidak Ada Antrian Absensi Pending</p>
              <p className="text-xs text-gray-600 font-medium">Semua siswa yang menekan Masuk Kelas sudah disetujui atau belum ada yang presensi.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-black text-white font-black uppercase text-[11px] tracking-wider">
                    <th className="p-3.5 text-center w-10 border-r border-gray-800">#</th>
                    <th className="p-3.5 border-r border-gray-800">Nama Siswa</th>
                    <th className="p-3.5 border-r border-gray-800">Kelas</th>
                    <th className="p-3.5 border-r border-gray-800">Waktu Masuk</th>
                    <th className="p-3.5 border-r border-gray-800">Jarak GPS</th>
                    <th className="p-3.5 text-center">Pilihan Presensi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black font-medium">
                  {filteredData.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    const isOutside = item.status === 'pending_luar_radius' || item.jarak_meter > 80;

                    return (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-[#ffe600]/20 transition-colors ${isSelected ? 'bg-amber-50/80' : ''}`}
                      >
                        <td className="p-3.5 text-center border-r border-gray-300">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(item.id)}
                            className="w-4 h-4 accent-black rounded border-2 border-black"
                          />
                        </td>
                        <td className="p-3.5 border-r border-gray-300">
                          <span className="font-black text-black text-sm block">{item.name}</span>
                          <span className="text-[10px] text-gray-500 font-mono">ID: {item.siswa_id.slice(0, 8)}...</span>
                        </td>
                        <td className="p-3.5 border-r border-gray-300">
                          <span className="font-black text-black block">{item.nama_kelas}</span>
                          <span className="text-[11px] text-gray-600 font-bold">{item.nama_perusahaan}</span>
                        </td>
                        <td className="p-3.5 border-r border-gray-300">
                          <div className="flex items-center gap-1 font-black text-gray-900">
                            <Clock className="w-3.5 h-3.5 text-gray-600" />
                            {new Date(item.waktu_scan).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                          </div>
                        </td>
                        <td className="p-3.5 border-r border-gray-300">
                          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-black border-2 ${
                            isOutside 
                              ? 'bg-red-100 text-red-900 border-red-500' 
                              : 'bg-green-100 text-green-900 border-green-500'
                          }`}>
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span>{item.jarak_meter} m</span>
                            {isOutside && <AlertTriangle className="w-3.5 h-3.5 ml-1 text-red-600 shrink-0" />}
                          </div>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* TOGGLE HADIR */}
                            <button
                              type="button"
                              onClick={() => handleChangeTargetStatus(item.id, 'hadir')}
                              className={`px-3 py-1.5 rounded text-xs font-black uppercase neo-btn transition-all flex items-center gap-1 ${
                                targetStatuses[item.id] === 'hadir' 
                                  ? 'bg-[#74ee15] text-black border-2 border-black ring-2 ring-black' 
                                  : 'bg-gray-100 text-gray-500 border border-gray-300 hover:bg-gray-200'
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4" /> HADIR
                            </button>

                            {/* TOGGLE TIDAK HADIR */}
                            <button
                              type="button"
                              onClick={() => handleChangeTargetStatus(item.id, 'tidak_hadir')}
                              className={`px-3 py-1.5 rounded text-xs font-black uppercase neo-btn transition-all flex items-center gap-1 ${
                                targetStatuses[item.id] === 'tidak_hadir' 
                                  ? 'bg-[#ff003c] text-white border-2 border-black ring-2 ring-black' 
                                  : 'bg-gray-100 text-gray-500 border border-gray-300 hover:bg-gray-200'
                              }`}
                            >
                              <XCircle className="w-4 h-4" /> TIDAK HADIR
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Sticky Bottom Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-black p-4 shadow-2xl z-40">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs font-black text-black uppercase">
              Terpilih: <span className="text-base text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded border-2 border-black ml-1">{selectedIds.length} Siswa</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleProcessSelected}
                disabled={submitting}
                className="w-full sm:w-auto neo-btn px-8 py-3 bg-[#00e676] hover:bg-green-600 text-black font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>SIMPAN PERSETUJUAN ({selectedIds.length} SISWA)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
