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

// 1. Rekap Absensi Harian (Grid View)
export async function getRekapAbsensiAction(year: number, month: number, perusahaanId?: string) {
  try {
    await verifyAdminOrInstruktur();
    
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

    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 1).toISOString();

    const { data: absensi, error: absensiError } = await supabase
      .from('absensi')
      .select('siswa_id, waktu_scan, status')
      .gte('waktu_scan', startDate)
      .lt('waktu_scan', endDate)
      .eq('status', 'hadir');

    if (absensiError) throw absensiError;

    const { data: izin, error: izinError } = await supabase
      .from('izin_absen')
      .select('siswa_id, tanggal, tipe, alasan')
      .gte('tanggal', startDate.substring(0, 10))
      .lt('tanggal', endDate.substring(0, 10))
      .eq('status', 'approved');

    if (izinError) throw izinError;

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

    const attendanceMap: Record<string, Record<number, { 
      status: string; 
      alasan?: string; 
      softSkill?: { judul: string; pemateri: string; waktu: string };
    }>> = {};
    
    students.forEach(s => {
      attendanceMap[s.id] = {};
    });

    absensi.forEach(a => {
      if (attendanceMap[a.siswa_id]) {
        const dateObj = new Date(a.waktu_scan);
        const day = dateObj.getDate();
        attendanceMap[a.siswa_id][day] = { status: 'H' };
      }
    });

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

// 2. Rekapitulasi Soft Skill (Tab View)
export async function getRekapSoftSkillAction(year: number, month: number, perusahaanId?: string) {
  try {
    await verifyAdminOrInstruktur();

    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

    // 1. Ambil semua Sesi Soft Skill pada bulan yang dipilih
    const { data: softSkillClasses, error: classError } = await supabase
      .from('kelas_soft_skill')
      .select('id, judul_materi, pengisi_acara, tanggal, waktu_mulai, waktu_selesai')
      .gte('tanggal', startDateStr)
      .lte('tanggal', endDateStr)
      .order('tanggal', { ascending: true })
      .order('waktu_mulai', { ascending: true });

    if (classError) throw classError;

    // 2. Ambil daftar siswa aktif
    let query = supabase
      .from('users')
      .select(`
        id,
        name,
        created_at,
        siswa!inner (
          perusahaan_id,
          batch,
          tanggal_berangkat,
          perusahaan (nama),
          master_kelas (nama_kelas)
        )
      `)
      .eq('role', 'siswa')
      .eq('status_registrasi', 'approved')
      .order('name');

    if (perusahaanId) {
      query = query.eq('siswa.perusahaan_id', perusahaanId);
    }

    const { data: students, error: studentError } = await query;
    if (studentError) throw studentError;

    // 3. Ambil seluruh data kehadiran soft skill bulan ini
    const classIds = softSkillClasses?.map(c => c.id) || [];
    let attendanceRecords: any[] = [];

    if (classIds.length > 0) {
      const { data: records, error: attError } = await supabase
        .from('absensi_soft_skill')
        .select('kelas_id, siswa_id, status')
        .in('kelas_id', classIds);

      if (attError) throw attError;
      attendanceRecords = records || [];
    }

    // Map kehadiran: studentId -> { [classId]: status }
    const attendanceMap: Record<string, Record<string, string>> = {};
    students?.forEach(s => {
      attendanceMap[s.id] = {};
    });

    attendanceRecords.forEach(r => {
      if (attendanceMap[r.siswa_id]) {
        attendanceMap[r.siswa_id][r.kelas_id] = r.status;
      }
    });

    // Sub-query absensi pagi untuk default 'hadir' jika sudah scan QR pagi
    const { data: morningAbsen } = await supabase
      .from('absensi')
      .select('siswa_id, waktu_scan, status')
      .gte('waktu_scan', `${startDateStr}T00:00:00Z`)
      .lte('waktu_scan', `${endDateStr}T23:59:59Z`)
      .eq('status', 'hadir');

    const morningMap = new Map<string, Set<string>>(); // studentId -> Set of date (YYYY-MM-DD)
    morningAbsen?.forEach(m => {
      const dateStr = m.waktu_scan.slice(0, 10);
      if (!morningMap.has(m.siswa_id)) morningMap.set(m.siswa_id, new Set());
      morningMap.get(m.siswa_id)!.add(dateStr);
    });

    const studentRows = students?.map(s => {
      const siswaData = Array.isArray(s.siswa) ? s.siswa[0] : (s.siswa as any);
      const perusahaanData = Array.isArray(siswaData?.perusahaan) ? siswaData?.perusahaan[0] : siswaData?.perusahaan;
      const kelasData = Array.isArray(siswaData?.master_kelas) ? siswaData?.master_kelas[0] : siswaData?.master_kelas;

      const studentAtt: Record<string, string> = {};

      softSkillClasses?.forEach(cls => {
        const savedStatus = attendanceMap[s.id]?.[cls.id];
        if (savedStatus) {
          studentAtt[cls.id] = savedStatus;
        } else if (morningMap.get(s.id)?.has(cls.tanggal)) {
          studentAtt[cls.id] = 'hadir'; // Default dari Absen Pagi
        } else {
          studentAtt[cls.id] = 'belum_diabsen';
        }
      });

      return {
        id: s.id,
        name: s.name,
        nama_kelas: kelasData?.nama_kelas || null,
        nama_perusahaan: perusahaanData?.nama || null,
        batch: siswaData?.batch || null,
        tanggal_berangkat: siswaData?.tanggal_berangkat || null,
        attendance: studentAtt
      };
    });

    return {
      success: true,
      classes: softSkillClasses || [],
      students: studentRows || []
    };

  } catch (error: any) {
    console.error('Error fetching rekap soft skill:', error);
    return { success: false, error: error.message || 'Terjadi kesalahan.' };
  }
}

// 3. Action untuk memuat Popup Detail Siswa (Profile, Stats Absensi & History Soft Skill)
export async function getStudentDetailSummaryAction(studentId: string) {
  try {
    await verifyAdminOrInstruktur();

    // 1. Profil Siswa
    const { data: userProfile, error: profileErr } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        phone,
        created_at,
        siswa (
          status_penempatan,
          batch,
          tanggal_berangkat,
          perusahaan (nama),
          master_kelas (nama_kelas)
        )
      `)
      .eq('id', studentId)
      .single();

    if (profileErr || !userProfile) throw profileErr || new Error('Siswa tidak ditemukan');

    // 2. Summary Absensi Harian (Count total Hadir, Telat, Luar Radius, Izin, Sakit)
    const [
      { count: countHadir },
      { count: countTelat },
      { count: countLuarRadius },
      { count: countIzin },
      { count: countSakit }
    ] = await Promise.all([
      supabase.from('absensi').select('*', { count: 'exact', head: true }).eq('siswa_id', studentId).eq('status', 'hadir'),
      supabase.from('absensi').select('*', { count: 'exact', head: true }).eq('siswa_id', studentId).eq('status', 'telat'),
      supabase.from('absensi').select('*', { count: 'exact', head: true }).eq('siswa_id', studentId).eq('status', 'ditolak_lokasi'),
      supabase.from('izin_absen').select('*', { count: 'exact', head: true }).eq('siswa_id', studentId).eq('tipe', 'izin').eq('status', 'approved'),
      supabase.from('izin_absen').select('*', { count: 'exact', head: true }).eq('siswa_id', studentId).eq('tipe', 'sakit').eq('status', 'approved')
    ]);

    // 3. Riwayat Kelas Soft Skill yang Pernah Diikuti
    const { data: softSkillHistory } = await supabase
      .from('absensi_soft_skill')
      .select(`
        status,
        waktu_absen,
        kelas_soft_skill (
          judul_materi,
          pengisi_acara,
          tanggal,
          waktu_mulai,
          waktu_selesai
        )
      `)
      .eq('siswa_id', studentId)
      .order('waktu_absen', { ascending: false });

    const siswaData = Array.isArray(userProfile.siswa) ? userProfile.siswa[0] : (userProfile.siswa as any);
    const perusahaanData = Array.isArray(siswaData?.perusahaan) ? siswaData?.perusahaan[0] : siswaData?.perusahaan;
    const kelasData = Array.isArray(siswaData?.master_kelas) ? siswaData?.master_kelas[0] : siswaData?.master_kelas;

    return {
      success: true,
      data: {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone || '-',
        created_at: userProfile.created_at,
        status_penempatan: siswaData?.status_penempatan || 'belum',
        nama_perusahaan: perusahaanData?.nama || null,
        batch: siswaData?.batch || null,
        tanggal_berangkat: siswaData?.tanggal_berangkat || null,
        nama_kelas: kelasData?.nama_kelas || null,
        stats: {
          hadir: countHadir || 0,
          telat: countTelat || 0,
          luarRadius: countLuarRadius || 0,
          izin: countIzin || 0,
          sakit: countSakit || 0,
        },
        softSkillHistory: softSkillHistory || []
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal memuat detail siswa' };
  }
}
