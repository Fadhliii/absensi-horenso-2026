'use server';

import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';

async function verifyAdminOrInstruktur() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) throw new Error('Unauthorized');
  const session = await verifySessionToken(token);
  if (!session || (session.role !== 'admin' && session.role !== 'instruktur')) throw new Error('Unauthorized');
}

export async function getRekapAbsensiAction(year: number, month: number, perusahaanId?: string) {
  try {
    await verifyAdminOrInstruktur();
    
    // Fetch students
    let query = supabase
      .from('users')
      .select(`
        id,
        name,
        siswa!inner (
          perusahaan_id,
          tanggal_berangkat
        )
      `)
      .eq('role', 'siswa')
      .eq('status_registrasi', 'approved')
      .order('name');

    if (perusahaanId) {
      query = query.eq('siswa.perusahaan_id', perusahaanId);
    }

    const { data: students, error: studentsError } = await query;

    if (studentsError) throw studentsError;

    // Fetch attendance for the month
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 1).toISOString();

    const { data: absensi, error: absensiError } = await supabase
      .from('absensi')
      .select('siswa_id, waktu_scan, status')
      .gte('waktu_scan', startDate)
      .lt('waktu_scan', endDate)
      .eq('status', 'hadir');

    if (absensiError) throw absensiError;

    // Fetch approved leaves
    const { data: izin, error: izinError } = await supabase
      .from('izin_absen')
      .select('siswa_id, tanggal, tipe')
      .gte('tanggal', startDate.substring(0, 10))
      .lt('tanggal', endDate.substring(0, 10))
      .eq('status', 'approved');

    if (izinError) throw izinError;

    // Process data to a map: student_id -> { date (1-31): status (H, I, S) }
    const attendanceMap: Record<string, Record<number, string>> = {};
    
    students.forEach(s => {
      attendanceMap[s.id] = {};
    });

    absensi.forEach(a => {
      if (attendanceMap[a.siswa_id]) {
        // Parse date
        const dateObj = new Date(a.waktu_scan);
        const day = dateObj.getDate();
        attendanceMap[a.siswa_id][day] = 'H';
      }
    });

    izin?.forEach(i => {
      if (attendanceMap[i.siswa_id]) {
        const dateObj = new Date(i.tanggal);
        const day = dateObj.getDate();
        attendanceMap[i.siswa_id][day] = i.tipe === 'izin' ? 'I' : 'S';
      }
    });

    // Convert to JSON serialization
    const result = students.map(s => {
      const siswaData = Array.isArray(s.siswa) ? s.siswa[0] : (s.siswa as any);
      return {
        id: s.id,
        name: s.name,
        tanggal_berangkat: siswaData?.tanggal_berangkat || null,
        attendance: attendanceMap[s.id] || {}
      };
    });

    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error fetching rekap:', error);
    return { success: false, error: error.message || 'Terjadi kesalahan.' };
  }
}
