'use server';

import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import { closeExpiredSessions } from '@/app/actions/sesi';

export async function getDashboardStatsAction() {
  try {
    closeExpiredSessions().catch(console.error);

    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    let role = 'admin';
    let userId: string | null = null;
    
    if (token) {
      const session = await verifySessionToken(token);
      if (session) {
        role = session.role;
        userId = session.userId;
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Jalankan 6 query secara paralel
    const [
      { count: totalSiswa },
      { count: pendingApproval },
      { count: hadirHariIni },
      { data: logAbsensi },
      { data: rawAbsensiData },
      { data: rawIzinData },
      { data: sesiAktif },
      { count: pendingIzin }
    ] = await Promise.all([
      // 1. Total Siswa Aktif
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'siswa').eq('status_registrasi', 'approved'),
      
      // 2. Pending Approval
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'siswa').eq('status_registrasi', 'pending'),
      
      // 3. Hadir Hari Ini
      supabase.from('absensi').select('id', { count: 'exact', head: true }).eq('status', 'hadir').gte('waktu_scan', todayISO),
      
      // 4. Riwayat Terakhir (10 Baris)
      supabase.from('absensi').select(`
        id,
        waktu_scan,
        status,
        jarak_meter,
        users (name)
      `).order('waktu_scan', { ascending: false }).limit(10),
      
      // 5. Data Absensi Grafik (7 Hari Terakhir)
      supabase.from('absensi')
        .select('waktu_scan, status')
        .in('status', ['hadir', 'telat'])
        .gte('waktu_scan', sevenDaysAgo.toISOString()),

      // 6. Data Izin Grafik (7 Hari Terakhir)
      supabase.from('izin_absen')
        .select('tanggal, tipe')
        .eq('status', 'approved')
        .gte('tanggal', sevenDaysAgo.toISOString().split('T')[0]),
      
      // 7. Cek Sesi Aktif
      supabase.from('sesi_absensi').select('id').eq('status', 'aktif').limit(1),

      // 8. Pending Izin
      supabase.from('izin_absen').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    ]);

    // Agregasi manual di Node.js (cepat & ringan untuk skala kecil-menengah)
    const chartMap: Record<string, { hadir: number, izin: number, sakit: number }> = {};
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dateString = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      chartMap[dateString] = { hadir: 0, izin: 0, sakit: 0 };
    }

    // Isi dengan data aktual absensi
    rawAbsensiData?.forEach((row) => {
      const rowDate = new Date(row.waktu_scan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      if (chartMap[rowDate] !== undefined) {
        chartMap[rowDate].hadir += 1;
      }
    });

    // Isi dengan data aktual izin/sakit
    rawIzinData?.forEach((row) => {
      const rowDate = new Date(row.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      if (chartMap[rowDate] !== undefined) {
        if (row.tipe === 'izin') chartMap[rowDate].izin += 1;
        if (row.tipe === 'sakit') chartMap[rowDate].sakit += 1;
      }
    });

    const activeTotalSiswa = totalSiswa || 0;

    const chartData = Object.keys(chartMap).map(key => {
      const { hadir: hadirCount, izin: izinCount, sakit: sakitCount } = chartMap[key];
      let bolosCount = activeTotalSiswa - (hadirCount + izinCount + sakitCount);
      if (bolosCount < 0) bolosCount = 0; // fallback if somehow negative
      
      const rawPercent = activeTotalSiswa > 0 ? Math.round((hadirCount / activeTotalSiswa) * 100) : 0;
      const persentase = rawPercent > 100 ? 100 : rawPercent;
      
      return {
        name: key,
        Hadir: hadirCount,
        Izin: izinCount,
        Sakit: sakitCount,
        Bolos: bolosCount,
        Persentase: persentase
      };
    });

    const isSesiAktif = sesiAktif && sesiAktif.length > 0;

    let assignedKelas: { id: string; nama_kelas: string; total_siswa: number; lokasi_lat?: number | null; lokasi_lng?: number | null; radius_meter?: number | null } | null = null;
    let allKelasList: { id: string; nama_kelas: string; total_siswa: number; lokasi_lat?: number | null; lokasi_lng?: number | null; radius_meter?: number | null; instruktur_id?: string | null; instruktur_ids?: string[]; instruktur_list?: { id: string; name: string; email: string }[] }[] = [];

    // Fetch all classes for quick selection
    const { data: kAll } = await supabase
      .from('master_kelas')
      .select('id, nama_kelas, lokasi_lat, lokasi_lng, radius_meter, instruktur_id, siswa:siswa(count)')
      .order('nama_kelas', { ascending: true });

    // Fetch all instructor mappings & auto schedule settings
    const [
      { data: mappingData },
      { data: autoJadwalData }
    ] = await Promise.all([
      supabase.from('kelas_instruktur').select('kelas_id, instruktur_id, users:instruktur_id(id, name, email)'),
      supabase.from('pengaturan_jadwal_absen').select('kelas_id, jam_mulai, durasi_menit, is_active')
    ]);

    const instructorMap: Record<string, { id: string; name: string; email: string }[]> = {};
    mappingData?.forEach((m: any) => {
      if (!instructorMap[m.kelas_id]) {
        instructorMap[m.kelas_id] = [];
      }
      if (m.users) {
        instructorMap[m.kelas_id].push({
          id: m.users.id,
          name: m.users.name,
          email: m.users.email
        });
      }
    });

    const autoJadwalMap: Record<string, { jam_mulai: string; durasi_menit: number; is_active: boolean }> = {};
    autoJadwalData?.forEach((aj: any) => {
      if (aj.kelas_id) {
        autoJadwalMap[aj.kelas_id] = {
          jam_mulai: aj.jam_mulai || '07:00',
          durasi_menit: aj.durasi_menit || 120,
          is_active: aj.is_active ?? true
        };
      }
    });

    if (kAll) {
      allKelasList = kAll.map((k: any) => {
        const list = instructorMap[k.id] || [];
        const ids = list.map(i => i.id);
        if (k.instruktur_id && !ids.includes(k.instruktur_id)) {
          ids.push(k.instruktur_id);
        }
        return {
          id: k.id,
          nama_kelas: k.nama_kelas,
          lokasi_lat: k.lokasi_lat,
          lokasi_lng: k.lokasi_lng,
          radius_meter: k.radius_meter,
          instruktur_id: k.instruktur_id,
          instruktur_ids: ids,
          instruktur_list: list,
          total_siswa: k.siswa?.[0]?.count || 0,
          auto_schedule: autoJadwalMap[k.id] || null
        };
      });
    }

    if (role === 'instruktur' && userId) {
      // Guru HANYA melihat dan mengelola kelas di mana dia menjadi salah satu instruktur pengajarnya
      allKelasList = allKelasList.filter(k => k.instruktur_ids?.includes(userId) || k.instruktur_id === userId);

      const myPrimary = allKelasList[0];
      if (myPrimary) {
        assignedKelas = {
          id: myPrimary.id,
          nama_kelas: myPrimary.nama_kelas,
          lokasi_lat: myPrimary.lokasi_lat,
          lokasi_lng: myPrimary.lokasi_lng,
          radius_meter: myPrimary.radius_meter,
          total_siswa: myPrimary.total_siswa
        };
      }
    }

    const { data: presetList } = await supabase
      .from('lokasi_preset')
      .select('id, nama_lokasi, latitude, longitude, radius_meter')
      .order('nama_lokasi', { ascending: true });

    return {
      success: true,
      stats: {
        totalSiswa: totalSiswa || 0,
        pendingApproval: pendingApproval || 0,
        hadirHariIni: hadirHariIni || 0,
        pendingIzin: pendingIzin || 0,
      },
      assignedKelas,
      allKelasList,
      lokasiPresets: presetList || [],
      logAbsensi: logAbsensi || [],
      chartData,
      isSesiAktif,
      role
    };

  } catch (error: any) {
    return { error: error.message || 'Gagal mengambil data statistik' };
  }
}
