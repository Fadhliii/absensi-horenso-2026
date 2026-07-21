'use server';

import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';

export async function getDashboardStatsAction() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    let role = 'admin';
    
    if (token) {
      const session = await verifySessionToken(token);
      if (session) role = session.role;
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
      { data: sesiAktif }
    ] = await Promise.all([
      // 1. Total Siswa Aktif
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'siswa').eq('status_registrasi', 'approved'),
      
      // 2. Pending Approval
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'siswa').eq('status_registrasi', 'pending'),
      
      // 3. Hadir Hari Ini
      supabase.from('absensi').select('*', { count: 'exact', head: true }).eq('status', 'hadir').gte('waktu_scan', todayISO),
      
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
      supabase.from('sesi_absensi').select('id').eq('status', 'aktif').limit(1)
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

    return {
      success: true,
      stats: {
        totalSiswa: totalSiswa || 0,
        pendingApproval: pendingApproval || 0,
        hadirHariIni: hadirHariIni || 0,
      },
      logAbsensi: logAbsensi || [],
      chartData,
      isSesiAktif,
      role
    };

  } catch (error: any) {
    return { error: error.message || 'Gagal mengambil data statistik' };
  }
}
