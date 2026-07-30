'use server';

import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import { closeExpiredSessions } from '@/app/actions/sesi';

// Mengambil ID Siswa yang sedang login
async function getStudentId() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) throw new Error('Unauthorized');
  const session = await verifySessionToken(token);
  if (!session || session.role !== 'siswa') throw new Error('Unauthorized');
  return session.userId;
}

// Helper Waktu WIB (UTC+7)
function getWibNow() {
  const now = new Date();
  // Tambah 7 jam dari UTC
  const wibMs = now.getTime() + (7 * 60 * 60 * 1000);
  const wibDate = new Date(wibMs);
  
  const year = wibDate.getUTCFullYear();
  const month = String(wibDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(wibDate.getUTCDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  const hour = wibDate.getUTCHours();
  
  return { dateStr, hour, wibDate };
}

export async function getStudentDashboardDataAction(monthFilter?: string) {
  try {
    closeExpiredSessions().catch(console.error);

    const userId = await getStudentId();

    // 1. Ambil Profil & Status Penempatan Siswa
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select(`
        name,
        created_at,
        siswa (
          kelas_id,
          status_penempatan,
          status_pendidikan,
          perusahaan (nama),
          master_kelas (nama_kelas)
        )
      `)
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    const studentKelasId = profile?.siswa?.[0]?.kelas_id || null;

    // Tentukan rentang bulan (default bulan ini jika tidak diisi)
    const targetMonth = monthFilter || new Date().toISOString().slice(0, 7);
    const startDateISO = new Date(`${targetMonth}-01T00:00:00Z`).toISOString();
    const endOfMonth = new Date(new Date(`${targetMonth}-01T00:00:00Z`).getFullYear(), new Date(`${targetMonth}-01T00:00:00Z`).getMonth() + 1, 0, 23, 59, 59);
    const endDateISO = endOfMonth.toISOString();
    const startDateOnly = `${targetMonth}-01`;
    const endDateOnly = `${targetMonth}-${String(endOfMonth.getDate()).padStart(2, '0')}`;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    // Query untuk Sesi Aktif Siswa (Khusus Kelas Siswa atau General)
    let activeSesiQuery = supabase
      .from('sesi_absensi')
      .select('id, kelas_id')
      .eq('status', 'aktif');

    if (studentKelasId) {
      activeSesiQuery = activeSesiQuery.or(`kelas_id.eq.${studentKelasId},kelas_id.is.null`);
    }

    // Query Sesi Absensi Bulan Ini (Khusus Kelas Siswa atau General)
    let sesiBulanQuery = supabase
      .from('sesi_absensi')
      .select(`
        id,
        dibuat_pada,
        status,
        kelas_id
      `)
      .gte('dibuat_pada', startDateISO)
      .lte('dibuat_pada', endDateISO);

    if (studentKelasId) {
      sesiBulanQuery = sesiBulanQuery.or(`kelas_id.eq.${studentKelasId},kelas_id.is.null`);
    }

    // 2. Query Paralel
    const [
      { data: absensiList },
      { data: sesiList },
      { data: izinList },
      { data: sesiAktifData },
      { data: absensiHariIniData }
    ] = await Promise.all([
      // Absensi yang di-scan siswa
      supabase
        .from('absensi')
        .select(`
          id, 
          waktu_scan, 
          status, 
          sesi_id
        `)
        .eq('siswa_id', userId)
        .gte('waktu_scan', startDateISO)
        .lte('waktu_scan', endDateISO),

      sesiBulanQuery,

      // Data Pengajuan Izin/Sakit siswa pada bulan ini
      supabase
        .from('izin_absen')
        .select(`
          id,
          tanggal,
          tipe,
          alasan,
          status
        `)
        .eq('siswa_id', userId)
        .gte('tanggal', startDateOnly)
        .lte('tanggal', endDateOnly),

      activeSesiQuery.order('dibuat_pada', { ascending: false }).limit(1),

      // Cek Absensi Siswa hari ini
      supabase
        .from('absensi')
        .select('id, status')
        .eq('siswa_id', userId)
        .gte('waktu_scan', todayISO)
        .order('waktu_scan', { ascending: false })
        .limit(1)
    ]);

    const { dateStr: todayWibStr, hour: currentWibHour } = getWibNow();

    // Map absensi berdasarkan sesi_id
    const absensiBySesiMap = new Map<string, any>();
    absensiList?.forEach(a => absensiBySesiMap.set(a.sesi_id, a));

    // Map izin berdasarkan tanggal (YYYY-MM-DD)
    const izinByDateMap = new Map<string, any>();
    izinList?.forEach(i => izinByDateMap.set(i.tanggal, i));

    // User registration / join date
    const userCreatedAtDate = profile?.created_at ? new Date(profile.created_at) : new Date(0);
    userCreatedAtDate.setHours(0, 0, 0, 0);

    const combinedRiwayat: any[] = [];

    // Proses Sesi Absensi untuk mendeteksi Hadir, Gagal Scan, atau Tidak Masuk / Pending Izin
    sesiList?.forEach(sesi => {
      const scanItem = absensiBySesiMap.get(sesi.id);
      const sessionDateStr = sesi.dibuat_pada.slice(0, 10);
      const izinItem = izinByDateMap.get(sessionDateStr);
      const sessionDate = new Date(sesi.dibuat_pada);
      sessionDate.setHours(0, 0, 0, 0);

      if (scanItem) {
        // Siswa melakukan scan
        combinedRiwayat.push({
          id: scanItem.id,
          waktu_scan: scanItem.waktu_scan,
          status: scanItem.status,
          sesi_id: sesi.id
        });
      } else {
        // Jika sesi ini dibuat SEBELUM siswa mendaftar/bergabung, jangan hitung Alpha!
        if (sessionDate < userCreatedAtDate) {
          return;
        }

        // Siswa TIDAK melakukan scan pada sesi ini
        let finalStatus = 'alpha'; // Default: Tidak Masuk (Alpha)

        if (izinItem) {
          // Ada pengajuan izin pada tanggal ini
          if (izinItem.status === 'pending') {
            finalStatus = 'izin_pending'; // Menunggu Approval Izin (Override Alpha)
          } else if (izinItem.status === 'approved') {
            finalStatus = izinItem.tipe; // 'izin' atau 'sakit'
          } else {
            // Rejected -> Tetap Alpha
            finalStatus = 'alpha';
          }
        } else {
          // Tidak ada izin
          const isToday = sessionDateStr === todayWibStr;
          const isPastDate = sessionDateStr < todayWibStr;

          if (isToday) {
            // Jika sesi hari ini
            if (currentWibHour < 17) {
              finalStatus = 'belum_absen'; // Belum absen (Proses sebelum 17:00 WIB)
            } else {
              finalStatus = 'alpha'; // Sudah lewat 17:00 WIB hari ini -> Alpha
            }
          } else if (isPastDate) {
            finalStatus = 'alpha'; // Sesi tanggal lampau -> Alpha
          } else {
            finalStatus = 'belum_absen';
          }
        }

        combinedRiwayat.push({
          id: `missing-${sesi.id}`,
          waktu_scan: sesi.dibuat_pada,
          status: finalStatus,
          sesi_id: sesi.id,
          alasan_izin: izinItem?.alasan || null
        });
      }
    });

    // Urutkan riwayat secara descending berdasarkan waktu (terbaru di atas)
    combinedRiwayat.sort((a, b) => new Date(b.waktu_scan).getTime() - new Date(a.waktu_scan).getTime());

    // Extract profile info
    const siswaObj = Array.isArray(profile.siswa) ? profile.siswa[0] : (profile.siswa as any);
    const perusahaanObj = siswaObj?.perusahaan;
    const namaPerusahaan = Array.isArray(perusahaanObj) ? perusahaanObj[0]?.nama : (perusahaanObj as any)?.nama;
    
    const kelasObj = siswaObj?.master_kelas;
    const namaKelas = Array.isArray(kelasObj) ? kelasObj[0]?.nama_kelas : (kelasObj as any)?.nama_kelas;

    const isSesiAktif = (sesiAktifData && sesiAktifData.length > 0) || false;
    const latestTodayAbsensi = absensiHariIniData && absensiHariIniData.length > 0 ? absensiHariIniData[0] : null;
    const statusAbsensiToday = latestTodayAbsensi?.status || null;
    const sudahMasukKelas = ['hadir', 'telat', 'pending_hadir', 'pending_telat'].includes(statusAbsensiToday || '');

    return { 
      success: true, 
      profile: {
        name: profile.name,
        statusPenempatan: siswaObj?.status_penempatan || 'belum',
        statusPendidikan: siswaObj?.status_pendidikan || 'aktif',
        namaPerusahaan: namaPerusahaan || null,
        namaKelas: namaKelas || null
      },
      isSesiAktif,
      sesiAktif: sesiAktifData && sesiAktifData.length > 0 ? sesiAktifData[0] : null,
      sudahMasukKelas,
      statusAbsensiToday,
      riwayat: combinedRiwayat 
    };

  } catch (error: any) {
    return { error: error.message || 'Terjadi kesalahan sistem' };
  }
}

export async function updateBulkStatusPendidikanAction(siswaIds: string[], statusPendidikan: string) {
  try {
    if (!siswaIds || siswaIds.length === 0) throw new Error('Pilih minimal satu siswa.');
    const { error } = await supabase
      .from('siswa')
      .update({ status_pendidikan: statusPendidikan })
      .in('id', siswaIds);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateBulkKelasAction(siswaIds: string[], kelasId: string | null) {
  try {
    if (!siswaIds || siswaIds.length === 0) throw new Error('Pilih minimal satu siswa.');
    const { error } = await supabase
      .from('siswa')
      .update({ kelas_id: kelasId || null })
      .in('id', siswaIds);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

