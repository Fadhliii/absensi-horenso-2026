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
        created_at,
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
      .select('siswa_id, tanggal, tipe, alasan')
      .gte('tanggal', startDate.substring(0, 10))
      .lt('tanggal', endDate.substring(0, 10))
      .eq('status', 'approved');

    if (izinError) throw izinError;

    // Fetch Soft Skill attendance for the month
    const { data: softSkillList, error: softSkillError } = await supabase
      .from('absensi_soft_skill')
      .select(`
        siswa_id,
        status,
        kelas_soft_skill!inner (
          judul_materi,
          pengisi_acara,
          tanggal,
          waktu_mulai,
          waktu_selesai
        )
      `)
      .gte('kelas_soft_skill.tanggal', startDate.substring(0, 10))
      .lt('kelas_soft_skill.tanggal', endDate.substring(0, 10))
      .eq('status', 'hadir');

    if (softSkillError) {
      console.warn('Soft skill error in rekap (fallback empty):', softSkillError);
    }

    // Process data to a map: student_id -> { date (1-31): { status, alasan?, softSkill? } }
    const attendanceMap: Record<string, Record<number, { 
      status: string; 
      alasan?: string; 
      softSkill?: { judul: string; pemateri: string; waktu: string };
    }>> = {};
    
    students.forEach(s => {
      attendanceMap[s.id] = {};
    });

    // 1. Absen Pagi (H)
    absensi.forEach(a => {
      if (attendanceMap[a.siswa_id]) {
        const dateObj = new Date(a.waktu_scan);
        const day = dateObj.getDate();
        attendanceMap[a.siswa_id][day] = { status: 'H' };
      }
    });

    // 2. Izin / Sakit (I / S)
    izin?.forEach(i => {
      if (attendanceMap[i.siswa_id]) {
        const dateObj = new Date(i.tanggal);
        const day = dateObj.getDate();
        attendanceMap[i.siswa_id][day] = { 
          status: i.tipe === 'izin' ? 'I' : 'S',
          alasan: i.alasan
        };
      }
    });

    // 3. Soft Skill (SS) - Jika hadir di Soft Skill, sertakan objek softSkill & timpa status ke SS jika tidak ada Izin/Sakit
    softSkillList?.forEach((ss: any) => {
      if (attendanceMap[ss.siswa_id]) {
        const dateStr = ss.kelas_soft_skill?.tanggal;
        if (dateStr) {
          const dateObj = new Date(dateStr);
          const day = dateObj.getDate();
          
          const currentEntry = attendanceMap[ss.siswa_id][day] || { status: 'H' };
          const waktuStr = `${ss.kelas_soft_skill.waktu_mulai?.slice(0, 5)} ${ss.kelas_soft_skill.waktu_selesai ? `- ${ss.kelas_soft_skill.waktu_selesai.slice(0, 5)}` : ''} WIB`;

          attendanceMap[ss.siswa_id][day] = {
            ...currentEntry,
            status: (currentEntry.status === 'I' || currentEntry.status === 'S') ? currentEntry.status : 'SS',
            softSkill: {
              judul: ss.kelas_soft_skill.judul_materi,
              pemateri: ss.kelas_soft_skill.pengisi_acara,
              waktu: waktuStr
            }
          };
        }
      }
    });

    // Convert to JSON serialization
    const result = students.map(s => {
      const siswaData = Array.isArray(s.siswa) ? s.siswa[0] : (s.siswa as any);
      return {
        id: s.id,
        name: s.name,
        created_at: s.created_at,
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
