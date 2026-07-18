'use server';

import { supabase } from '@/lib/supabase';

export async function getDashboardStatsAction() {
  try {
    // 1. Total Siswa Aktif
    const { count: totalSiswa } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'siswa')
      .eq('status_registrasi', 'approved');

    // 2. Pending Approval
    const { count: pendingApproval } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'siswa')
      .eq('status_registrasi', 'pending');

    // 3. Hadir Hari Ini
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const { count: hadirHariIni } = await supabase
      .from('absensi')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'hadir')
      .gte('waktu_scan', todayISO);

    // 4. Riwayat Terakhir (10 Baris)
    const { data: logAbsensi } = await supabase
      .from('absensi')
      .select(`
        id,
        waktu_scan,
        status,
        jarak_meter,
        users (name)
      `)
      .order('waktu_scan', { ascending: false })
      .limit(10);

    // 5. Data Grafik (7 Hari Terakhir)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const { data: rawChartData } = await supabase
      .from('absensi')
      .select('waktu_scan, status')
      .eq('status', 'hadir')
      .gte('waktu_scan', sevenDaysAgo.toISOString());

    // Agregasi manual di Node.js (cepat & ringan untuk skala kecil-menengah)
    const chartMap: Record<string, number> = {};
    
    // Inisialisasi 7 hari dengan nilai 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dateString = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      chartMap[dateString] = 0;
    }

    // Isi dengan data aktual
    rawChartData?.forEach((row) => {
      const rowDate = new Date(row.waktu_scan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      if (chartMap[rowDate] !== undefined) {
        chartMap[rowDate] += 1;
      }
    });

    const chartData = Object.keys(chartMap).map(key => ({
      name: key,
      Hadir: chartMap[key]
    }));

    return {
      success: true,
      stats: {
        totalSiswa: totalSiswa || 0,
        pendingApproval: pendingApproval || 0,
        hadirHariIni: hadirHariIni || 0,
      },
      logAbsensi: logAbsensi || [],
      chartData
    };

  } catch (error: any) {
    return { error: error.message || 'Gagal mengambil data statistik' };
  }
}
