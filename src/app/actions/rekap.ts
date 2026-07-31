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
  return session;
}

// Helper untuk mendapatkan tanggal (1-31) dalam WIB (Asia/Jakarta)
function getWibDayFromTimestamp(timestampStr: string): number {
  try {
    const d = new Date(timestampStr);
    const dayStr = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: 'numeric'
    }).format(d);
    return parseInt(dayStr, 10);
  } catch {
    return new Date(timestampStr).getDate();
  }
}

// Helper untuk mendapatkan tanggal (1-31) dari string YYYY-MM-DD
function getDayFromDateString(dateStr: string): number {
  if (!dateStr) return 1;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return parseInt(parts[2], 10);
  }
  return new Date(dateStr).getDate();
}

// 1. Rekap Absensi Harian (Grid View)
export async function getRekapAbsensiAction(year: number, month: number, perusahaanId?: string, kelasId?: string, statusPendidikan: string = 'aktif') {
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
          kelas_id,
          status_pendidikan,
          tanggal_berangkat
        )
      `)
      .eq('role', 'siswa')
      .eq('status_registrasi', 'approved')
      .order('name');

    if (perusahaanId) {
      query = query.eq('siswa.perusahaan_id', perusahaanId);
    }
    if (kelasId) {
      if (kelasId === 'unassigned' || kelasId === 'tanpa_kelas') {
        query = query.is('siswa.kelas_id', null);
      } else {
        query = query.eq('siswa.kelas_id', kelasId);
      }
    }

    const { data: rawStudents, error: studentsError } = await query;

    if (studentsError) throw studentsError;

    let students = rawStudents || [];
    if (statusPendidikan === 'aktif') {
      students = students.filter(s => {
        const siswaData = Array.isArray(s.siswa) ? s.siswa[0] : (s.siswa as any);
        const st = siswaData?.status_pendidikan || 'aktif';
        return st === 'aktif' || st === 'belum_mulai';
      });
    } else if (statusPendidikan && statusPendidikan !== 'all') {
      students = students.filter(s => {
        const siswaData = Array.isArray(s.siswa) ? s.siswa[0] : (s.siswa as any);
        const st = siswaData?.status_pendidikan || 'aktif';
        return st === statusPendidikan;
      });
    }

    // WIB Boundaries for Month Range (UTC+7)
    const startWib = new Date(Date.UTC(year, month - 1, 1, -7, 0, 0)).toISOString();
    const endWib = new Date(Date.UTC(year, month, 1, -7, 0, 0)).toISOString();

    const { data: absensi, error: absensiError } = await supabase
      .from('absensi')
      .select('siswa_id, waktu_scan, status')
      .gte('waktu_scan', startWib)
      .lt('waktu_scan', endWib)
      .in('status', ['hadir', 'telat']);

    if (absensiError) throw absensiError;

    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

    const { data: izin, error: izinError } = await supabase
      .from('izin_absen')
      .select('siswa_id, tanggal, tipe, alasan')
      .gte('tanggal', startDateStr)
      .lte('tanggal', endDateStr)
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
      .gte('kelas_soft_skill.tanggal', startDateStr)
      .lte('kelas_soft_skill.tanggal', endDateStr)
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

    absensi?.forEach(a => {
      if (attendanceMap[a.siswa_id]) {
        const day = getWibDayFromTimestamp(a.waktu_scan);
        attendanceMap[a.siswa_id][day] = { status: a.status === 'telat' ? 'T' : 'H' };
      }
    });

    izin?.forEach(i => {
      if (attendanceMap[i.siswa_id]) {
        const day = getDayFromDateString(i.tanggal);
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
          const day = getDayFromDateString(dateStr);
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
export async function getRekapSoftSkillAction(year: number, month: number, perusahaanId?: string, kelasId?: string, statusPendidikan: string = 'aktif') {
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
          kelas_id,
          status_pendidikan,
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
    if (kelasId) {
      query = query.eq('siswa.kelas_id', kelasId);
    }

    const { data: rawStudents, error: studentError } = await query;
    if (studentError) throw studentError;

    let students = rawStudents || [];
    if (statusPendidikan && statusPendidikan !== 'all') {
      students = students.filter(s => {
        const siswaData = Array.isArray(s.siswa) ? s.siswa[0] : (s.siswa as any);
        const st = siswaData?.status_pendidikan || 'aktif';
        return st === statusPendidikan;
      });
    }

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
          status_pendidikan,
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
        status_pendidikan: siswaData?.status_pendidikan || 'aktif',
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

// 4. Action untuk Edit Manual Absensi Per-Sel dari Rekap Grid
export async function updateCellAttendanceAction(
  siswaId: string, 
  tanggalStr: string, // YYYY-MM-DD
  status: 'H' | 'T' | 'I' | 'S' | 'RESET',
  alasan: string = ''
) {
  try {
    const session = await verifyAdminOrInstruktur();

    // Timestamp WIB untuk jam 07:00:00 (UTC+7)
    const waktuScanStr = `${tanggalStr}T07:00:00+07:00`;
    const startOfDay = `${tanggalStr}T00:00:00+07:00`;
    const endOfDay = `${tanggalStr}T23:59:59+07:00`;

    // 1. Hapus record absensi harian jika ada di tanggal ini
    await supabase
      .from('absensi')
      .delete()
      .eq('siswa_id', siswaId)
      .gte('waktu_scan', startOfDay)
      .lte('waktu_scan', endOfDay);

    // 2. Hapus record izin_absen jika ada di tanggal ini
    await supabase
      .from('izin_absen')
      .delete()
      .eq('siswa_id', siswaId)
      .eq('tanggal', tanggalStr);

    if (status === 'H' || status === 'T') {
      // Ambil sesi_absensi terbaru untuk FK constraint sesi_id
      let { data: latestSesi } = await supabase
        .from('sesi_absensi')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Jika tidak ada sesi sama sekali (tabel kosong), buat sesi dummy untuk memenuhi foreign key constraint (sesi_id NOT NULL)
      if (!latestSesi?.id) {
        const { data: newSesi, error: sesiError } = await supabase
          .from('sesi_absensi')
          .insert([{
            dibuat_oleh: session.userId,
            lokasi_lat: 0,
            lokasi_lng: 0,
            status: 'selesai'
          }])
          .select('id')
          .single();

        if (sesiError) {
          console.error('Error creating dummy session:', sesiError);
          throw new Error('Gagal membuat sesi absensi dummy.');
        }
        latestSesi = newSesi;
      }

      const dbStatus = status === 'T' ? 'telat' : 'hadir';
      const insertObj: any = {
        siswa_id: siswaId,
        waktu_scan: waktuScanStr,
        status: dbStatus,
        sesi_id: latestSesi.id,
        lat_siswa: 0,
        lng_siswa: 0,
        jarak_meter: 0
      };

      const { error } = await supabase.from('absensi').insert([insertObj]);
      if (error) {
        console.error('Error inserting absensi:', error);
        throw new Error(error.message);
      }
    } else if (status === 'I' || status === 'S') {
      const tipe = status === 'I' ? 'izin' : 'sakit';
      const { error } = await supabase.from('izin_absen').insert([{
        siswa_id: siswaId,
        tanggal: tanggalStr,
        tipe,
        status: 'approved',
        alasan: alasan || (tipe === 'izin' ? 'Izin Input Manual Admin' : 'Sakit Input Manual Admin'),
        dilaporkan_ke: session.userId
      }]);
      if (error) {
        console.error('Error inserting izin_absen:', error);
        throw new Error(error.message);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Exception in updateCellAttendanceAction:', err);
    return { success: false, error: err.message || 'Gagal mengubah absensi.' };
  }
}
