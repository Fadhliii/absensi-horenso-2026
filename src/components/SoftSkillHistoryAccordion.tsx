'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, BookOpen, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface SoftSkillHistoryItem {
  id: string;
  status: 'hadir' | 'tidak_hadir' | 'izin' | 'sakit';
  waktu_absen: string;
  kelas: {
    id: string;
    judul_materi: string;
    pengisi_acara: string;
    tanggal: string;
    waktu_mulai: string;
    waktu_selesai?: string;
  };
}

export default function SoftSkillHistoryAccordion({ studentId }: { studentId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<SoftSkillHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const url = studentId ? `/api/soft-skill/history?siswa_id=${studentId}` : `/api/soft-skill/history`;
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok) {
        setHistory(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setHasFetched(true);
    }
  };

  const toggleAccordion = () => {
    if (!isOpen && !hasFetched) {
      fetchHistory();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6">
      {/* Header Button */}
      <button
        onClick={toggleAccordion}
        className="w-full p-4 flex items-center justify-between font-black uppercase text-black bg-[#ffe700] hover:bg-[#ebd500] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-5 h-5 stroke-[2.5]" />
          <span>Riwayat Kelas Soft Skill ({history.length > 0 ? history.length : 'Lihat'})</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-6 h-6 stroke-[3]" />
        ) : (
          <ChevronDown className="w-6 h-6 stroke-[3]" />
        )}
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="p-4 border-t-4 border-black divide-y-2 divide-dashed divide-gray-300">
          {loading ? (
            <p className="text-center py-4 font-bold text-gray-500 animate-pulse text-sm">
              Memuat riwayat soft skill...
            </p>
          ) : history.length === 0 ? (
            <p className="text-center py-4 font-bold text-gray-500 text-sm">
              Belum ada kelas soft skill yang diikuti.
            </p>
          ) : (
            history.map((item) => (
              <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex justify-between items-start mb-1 gap-2">
                  <h4 className="font-black text-sm text-black uppercase">
                    {item.kelas?.judul_materi || 'Materi Soft Skill'}
                  </h4>
                  {item.status === 'hadir' && (
                    <span className="bg-[#74ee15] text-black px-2 py-0.5 border border-black font-black text-[10px] uppercase">
                      Hadir
                    </span>
                  )}
                  {item.status === 'tidak_hadir' && (
                    <span className="bg-[#ff003c] text-white px-2 py-0.5 border border-black font-black text-[10px] uppercase">
                      Tidak Hadir
                    </span>
                  )}
                  {item.status === 'izin' && (
                    <span className="bg-[#ffe700] text-black px-2 py-0.5 border border-black font-black text-[10px] uppercase">
                      Izin
                    </span>
                  )}
                  {item.status === 'sakit' && (
                    <span className="bg-[#4deeea] text-black px-2 py-0.5 border border-black font-black text-[10px] uppercase">
                      Sakit
                    </span>
                  )}
                </div>

                <p className="text-xs font-bold text-gray-700 mb-2">
                  Pemateri: <span className="text-black">{item.kelas?.pengisi_acara}</span>
                </p>

                <div className="flex items-center gap-4 text-[11px] font-bold text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-black" />
                    <span>
                      {item.kelas?.tanggal
                        ? new Date(item.kelas.tanggal).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '-'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-black" />
                    <span>
                      {item.kelas?.waktu_mulai ? item.kelas.waktu_mulai.slice(0, 5) : ''} WIB
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
