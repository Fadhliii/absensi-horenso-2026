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
  const [targetStatuses, setTargetStatuses] = useState<Record<string, 'hadir' | 'telat'>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    const res = await getPendingAbsensiListAction(filterTanggal, filterKelas || undefined);
    if (res.success && res.data) {
      setData(res.data);
      // Default set targetStatus for each student based on initial status
      const initialMap: Record<string, 'hadir' | 'telat'> = {};
      const allIds: string[] = [];
      res.data.forEach((item: any) => {
        initialMap[item.id] = item.status === 'pending_telat' ? 'telat' : 'hadir';
        allIds.push(item.id);
      });
      setTargetStatuses(initialMap);
      setSelectedIds(allIds); // Default select all for convenience
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

  const handleChangeTargetStatus = (id: string, status: 'hadir' | 'telat') => {
    setTargetStatuses(prev => ({ ...prev, [id]: status }));
  };

  const handleSetAllTargetStatus = (status: 'hadir' | 'telat') => {
    const updated: Record<string, 'hadir' | 'telat'> = { ...targetStatuses };
    selectedIds.forEach(id => {
      updated[id] = status;
    });
    setTargetStatuses(updated);
  };

  // Bulk Approve
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) {
      alert('Pilih minimal 1 siswa!');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    const approvals = selectedIds.map(id => ({
      id,
      targetStatus: targetStatuses[id] || 'hadir'
    }));

    const res = await bulkApproveAbsensiAction(approvals);
    if (res.success) {
      setSuccessMsg(`Berhasil menyetujui ${res.count} presensi siswa!`);
      await fetchData();
    } else {
      setError(res.error || 'Gagal memproses persetujuan masal.');
    }
    setSubmitting(false);
  };

  // Bulk Reject
  const handleBulkReject = async () => {
    if (selectedIds.length === 0) {
      alert('Pilih minimal 1 siswa!');
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menolak ${selectedIds.length} presensi siswa ini?`)) {
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    const res = await bulkRejectAbsensiAction(selectedIds);
    if (res.success) {
      setSuccessMsg(`Berhasil menolak ${res.count} presensi siswa.`);
      await fetchData();
    } else {
      setError(res.error || 'Gagal menolak absensi.');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f4f0] font-sans pb-24">
      {/* Header */}
      <header className="bg-white border-b-4 border-black sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="p-1.5 bg-[#ffe600] border-2 border-black rounded hover:bg-black hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded border border-purple-300">
                Fitur Persetujuan Masal
              </span>
              <h1 className="text-lg font-black text-black uppercase tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-600" /> Approval Absensi Masuk Kelas
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

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">

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
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg('')} className="font-black">✕</button>
          </div>
        )}
        {error && (
          <div className="bg-red-100 border-2 border-red-800 text-red-900 font-bold text-xs p-3 neo-border flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="font-black">✕</button>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white neo-card overflow-hidden">
          
          {/* Top Selection Bar */}
          <div className="p-3 bg-[#fffde7] border-b-2 border-black flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-black text-black cursor-pointer uppercase">
                <input 
                  type="checkbox"
                  checked={filteredData.length > 0 && selectedIds.length === filteredData.length}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 accent-black rounded border-2 border-black"
                />
                Pilih Semua ({selectedIds.length}/{filteredData.length})
              </label>
            </div>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-gray-700">Set Massal Status:</span>
                <button 
                  onClick={() => handleSetAllTargetStatus('hadir')}
                  className="px-2.5 py-1 bg-green-500 hover:bg-green-600 text-white font-black text-[11px] rounded border border-black shadow-sm"
                >
                  Set Semua HADIR (1)
                </button>
                <button 
                  onClick={() => handleSetAllTargetStatus('telat')}
                  className="px-2.5 py-1 bg-yellow-400 hover:bg-yellow-500 text-black font-black text-[11px] rounded border border-black shadow-sm"
                >
                  Set Semua TELAT (T)
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
              <p className="text-xs text-gray-600 font-medium">Semua siswa yang Masuk Kelas sudah disetujui atau belum ada yang presensi.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-black text-black font-black uppercase text-[11px]">
                    <th className="p-3 text-center w-10">#</th>
                    <th className="p-3">Nama Siswa</th>
                    <th className="p-3">Kelas & Perusahaan</th>
                    <th className="p-3">Waktu Masuk</th>
                    <th className="p-3">Jarak GPS</th>
                    <th className="p-3 text-center">Status Awal</th>
                    <th className="p-3 text-center">Setujui Sebagai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredData.map((item, idx) => {
                    const isSelected = selectedIds.includes(item.id);
                    const isOutside = item.status === 'pending_luar_radius' || item.jarak_meter > 80;

                    return (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-[#fffde7] transition-colors ${isSelected ? 'bg-amber-50/60' : ''}`}
                      >
                        <td className="p-3 text-center">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(item.id)}
                            className="w-4 h-4 accent-black rounded border-2 border-black"
                          />
                        </td>
                        <td className="p-3">
                          <span className="font-black text-black text-sm block">{item.name}</span>
                          <span className="text-[10px] text-gray-500 font-mono">ID: {item.siswa_id.slice(0, 8)}...</span>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-black block">{item.nama_kelas}</span>
                          <span className="text-[11px] text-gray-600">{item.nama_perusahaan}</span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 font-bold text-gray-800">
                            <Clock className="w-3.5 h-3.5 text-gray-500" />
                            {new Date(item.waktu_scan).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                          </div>
                        </td>
                        <td className="p-3">
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold border ${
                            isOutside 
                              ? 'bg-red-100 text-red-800 border-red-300' 
                              : 'bg-green-100 text-green-800 border-green-300'
                          }`}>
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span>{item.jarak_meter} m</span>
                            {isOutside && <AlertTriangle className="w-3.5 h-3.5 ml-1 text-red-600 shrink-0" />}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {item.status === 'pending_hadir' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-green-100 text-green-800 border border-green-300">
                              PENDING HADIR
                            </span>
                          )}
                          {item.status === 'pending_telat' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                              PENDING TELAT
                            </span>
                          )}
                          {item.status === 'pending_luar_radius' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-800 border border-red-300">
                              LUAR RADIUS
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <label className={`cursor-pointer px-2.5 py-1 rounded font-black text-xs border transition-all ${
                              targetStatuses[item.id] === 'hadir' 
                                ? 'bg-green-500 text-white border-black shadow' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}>
                              <input 
                                type="radio" 
                                name={`target-${item.id}`}
                                value="hadir"
                                checked={targetStatuses[item.id] === 'hadir'}
                                onChange={() => handleChangeTargetStatus(item.id, 'hadir')}
                                className="sr-only"
                              />
                              Hadir (1)
                            </label>
                            <label className={`cursor-pointer px-2.5 py-1 rounded font-black text-xs border transition-all ${
                              targetStatuses[item.id] === 'telat' 
                                ? 'bg-yellow-400 text-black border-black shadow' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}>
                              <input 
                                type="radio" 
                                name={`target-${item.id}`}
                                value="telat"
                                checked={targetStatuses[item.id] === 'telat'}
                                onChange={() => handleChangeTargetStatus(item.id, 'telat')}
                                className="sr-only"
                              />
                              Telat (T)
                            </label>
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
              Terpilih: <span className="text-base text-purple-700 bg-purple-100 px-2 py-0.5 rounded border border-purple-300 ml-1">{selectedIds.length} Siswa</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleBulkReject}
                disabled={submitting}
                className="flex-1 sm:flex-none neo-btn px-4 py-2.5 bg-[#ff003c] hover:bg-red-700 text-white font-black text-xs uppercase flex items-center justify-center gap-1.5"
              >
                <XCircle className="w-4 h-4" /> Tolak Terpilih
              </button>

              <button
                onClick={handleBulkApprove}
                disabled={submitting}
                className="flex-1 sm:flex-none neo-btn px-6 py-2.5 bg-[#00e676] hover:bg-green-600 text-black font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-lg scale-105"
              >
                <CheckCircle2 className="w-4 h-4" /> Setujui Berjamaah ({selectedIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
