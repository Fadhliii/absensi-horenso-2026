'use server';

import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';

// Mengambil ID Siswa yang sedang login
async function getStudentId() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) throw new Error('Unauthorized');
  const session = await verifySessionToken(token);
  if (!session || session.role !== 'siswa') throw new Error('Unauthorized');
  return session.userId;
}

export async function getStudentDashboardDataAction(monthFilter?: string) {
  try {
    const userId = await getStudentId();

    // 1. Ambil Profil & Status Penempatan Siswa
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select(`
        name,
        siswa (
          status_penempatan,
          perusahaan (nama)
        )
      `)
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    // 2. Ambil Riwayat Absensi
    let absensiQuery = supabase
      .from('absensi')
      .select(`
        id, 
        waktu_scan, 
        status, 
        sesi_id,
        sesi_absensi (
          dibuat_pada
        )
      `)
      .eq('siswa_id', userId)
      .order('waktu_scan', { ascending: false });

    // Filter berdasar bulan (format: YYYY-MM)
    if (monthFilter) {
      const startDate = new Date(`${monthFilter}-01T00:00:00Z`);
      // Hitung tanggal akhir bulan
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59);
      
      absensiQuery = absensiQuery
        .gte('waktu_scan', startDate.toISOString())
        .lte('waktu_scan', endDate.toISOString());
    }

    const { data: riwayat, error: riwayatError } = await absensiQuery;

    if (riwayatError) throw riwayatError;

    // 3. Cek Sesi Aktif
    const { data: activeSession } = await supabase
      .from('sesi_absensi')
      .select('id')
      .eq('status', 'aktif')
      .limit(1)
      .single();
    
    const isSesiAktif = !!activeSession;

    if (riwayatError) throw riwayatError;

    const siswaObj = Array.isArray(profile.siswa) ? profile.siswa[0] : (profile.siswa as any);
    const perusahaanObj = siswaObj?.perusahaan;
    const namaPerusahaan = Array.isArray(perusahaanObj) ? perusahaanObj[0]?.nama : (perusahaanObj as any)?.nama;

    return { 
      success: true, 
      profile: {
        name: profile.name,
        statusPenempatan: siswaObj?.status_penempatan || 'belum',
        namaPerusahaan: namaPerusahaan || null
      },
      isSesiAktif,
      riwayat 
    };

  } catch (error: any) {
    return { error: error.message || 'Terjadi kesalahan sistem' };
  }
}
