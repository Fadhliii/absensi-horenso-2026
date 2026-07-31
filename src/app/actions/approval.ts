'use server';

import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import { closeExpiredSessions } from '@/app/actions/sesi';

async function verifyAdminOrInstruktur() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) throw new Error('Unauthorized');
  const session = await verifySessionToken(token);
  if (!session || (session.role !== 'admin' && session.role !== 'instruktur')) {
    throw new Error('Unauthorized');
  }
  return session;
}

// 1. Ambil daftar absensi yang pending untuk persetujuan masal
export async function getPendingAbsensiListAction(tanggalStr?: string, kelasIdFilter?: string) {
  try {
    await closeExpiredSessions();
    await verifyAdminOrInstruktur();

    const today = tanggalStr ? new Date(tanggalStr) : new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    // UTC+7 Boundaries for WIB date
    const startOfDay = new Date(Date.UTC(year, month, day, -7, 0, 0)).toISOString();
    const endOfDay = new Date(Date.UTC(year, month, day + 1, -7, 0, 0)).toISOString();

    const [{ data: rawPending, error }, { data: rawIzin, error: izinError }] = await Promise.all([
      supabase
        .from('absensi')
        .select(`
          id,
          siswa_id,
          waktu_scan,
          status,
          jarak_meter,
          lat_siswa,
          lng_siswa,
          users!inner (
            id,
            name,
            siswa!inner (
              kelas_id,
              batch,
              master_kelas (nama_kelas),
              perusahaan (nama)
            )
          )
        `)
        .in('status', ['pending_hadir', 'pending_telat', 'pending_luar_radius'])
        .gte('waktu_scan', startOfDay)
        .lt('waktu_scan', endOfDay)
        .order('waktu_scan', { ascending: true }),

      supabase
        .from('izin_absen')
        .select(`
          id,
          siswa_id,
          tanggal,
          tipe,
          alasan,
          status,
          created_at,
          users!izin_absen_siswa_id_fkey!inner (
            id,
            name,
            siswa!inner (
              kelas_id,
              batch,
              master_kelas (nama_kelas),
              perusahaan (nama)
            )
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
    ]);

    if (error) {
      console.error('Error fetching pending absensi:', error);
      throw error;
    }

    const absensiList = (rawPending || []).map((item: any) => {
      const u = item.users;
      const s = Array.isArray(u.siswa) ? u.siswa[0] : u.siswa;
      const k = Array.isArray(s?.master_kelas) ? s?.master_kelas[0] : s?.master_kelas;
      const p = Array.isArray(s?.perusahaan) ? s?.perusahaan[0] : s?.perusahaan;

      return {
        id: item.id,
        siswa_id: item.siswa_id,
        name: u.name,
        kelas_id: s?.kelas_id,
        nama_kelas: k?.nama_kelas || 'Tanpa Kelas',
        nama_perusahaan: p?.nama || '-',
        waktu_scan: item.waktu_scan,
        status: item.status,
        jarak_meter: item.jarak_meter || 0,
        is_izin: false
      };
    });

    const izinList = (rawIzin || []).map((item: any) => {
      const u = item.users;
      const s = Array.isArray(u.siswa) ? u.siswa[0] : u.siswa;
      const k = Array.isArray(s?.master_kelas) ? s?.master_kelas[0] : s?.master_kelas;
      const p = Array.isArray(s?.perusahaan) ? s?.perusahaan[0] : s?.perusahaan;

      return {
        id: item.id,
        siswa_id: item.siswa_id,
        name: u.name,
        kelas_id: s?.kelas_id,
        nama_kelas: k?.nama_kelas || 'Tanpa Kelas',
        nama_perusahaan: p?.nama || '-',
        waktu_scan: item.created_at || item.tanggal,
        status: item.tipe === 'sakit' ? 'sakit_pending' : 'izin_pending',
        jarak_meter: 0,
        is_izin: true,
        tipe_izin: item.tipe,
        alasan: item.alasan
      };
    });

    let list = [...absensiList, ...izinList];

    if (kelasIdFilter) {
      list = list.filter(i => i.kelas_id === kelasIdFilter);
    }

    return { success: true, data: list };
  } catch (err: any) {
    console.error('Error getPendingAbsensiListAction:', err);
    return { success: false, error: err.message || 'Gagal memuat absensi pending.' };
  }
}

// Get total count of pending attendances for admin notification badge
export async function getPendingCountAction() {
  try {
    await verifyAdminOrInstruktur();

    const today = new Date();
    const startOfDay = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), -7, 0, 0)).toISOString();

    const [{ count: countAbsensi }, { count: countIzin }] = await Promise.all([
      supabase
        .from('absensi')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending_hadir', 'pending_telat', 'pending_luar_radius'])
        .gte('waktu_scan', startOfDay),
      supabase
        .from('izin_absen')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
    ]);

    return { count: (countAbsensi || 0) + (countIzin || 0) };
  } catch {
    return { count: 0 };
  }
}

// 2. Setujui Berjamaah (Bulk Approve)
export async function bulkApproveAbsensiAction(approvals: { id: string; targetStatus: 'hadir' | 'telat' }[]) {
  try {
    await verifyAdminOrInstruktur();

    if (!approvals || approvals.length === 0) {
      return { error: 'Pilih minimal 1 siswa untuk disetujui.' };
    }

    const idsToProcess = approvals.map(a => a.id);
    const { data: izinRecords } = await supabase
      .from('izin_absen')
      .select('id')
      .in('id', idsToProcess);

    const izinSet = new Set((izinRecords || []).map(r => r.id));

    const absensiApprovals = approvals.filter(a => !izinSet.has(a.id));
    const izinApprovals = approvals.filter(a => izinSet.has(a.id));

    if (izinApprovals.length > 0) {
      const izinIdsToApprove = izinApprovals.map(a => a.id);
      const { error: iErr } = await supabase
        .from('izin_absen')
        .update({ status: 'approved' })
        .in('id', izinIdsToApprove);
      if (iErr) throw iErr;
    }

    if (absensiApprovals.length > 0) {
      const hadirIds = absensiApprovals.filter(a => a.targetStatus === 'hadir').map(a => a.id);
      const telatIds = absensiApprovals.filter(a => a.targetStatus === 'telat').map(a => a.id);

      if (hadirIds.length > 0) {
        const { error: hErr } = await supabase
          .from('absensi')
          .update({ status: 'hadir' })
          .in('id', hadirIds);
        if (hErr) throw hErr;
      }

      if (telatIds.length > 0) {
        const { error: tErr } = await supabase
          .from('absensi')
          .update({ status: 'telat' })
          .in('id', telatIds);
        if (tErr) throw tErr;
      }
    }

    return { success: true, count: approvals.length };
  } catch (err: any) {
    console.error('Error bulkApproveAbsensiAction:', err);
    return { success: false, error: err.message || 'Gagal memproses persetujuan masal.' };
  }
}

// 3. Tolak Berjamaah (Bulk Reject)
export async function bulkRejectAbsensiAction(ids: string[]) {
  try {
    await verifyAdminOrInstruktur();

    if (!ids || ids.length === 0) {
      return { error: 'Pilih minimal 1 siswa untuk ditolak.' };
    }

    const { data: izinRecords } = await supabase
      .from('izin_absen')
      .select('id')
      .in('id', ids);

    const izinSet = new Set((izinRecords || []).map(r => r.id));

    const absensiIds = ids.filter(id => !izinSet.has(id));
    const izinIds = ids.filter(id => izinSet.has(id));

    if (izinIds.length > 0) {
      const { error: iErr } = await supabase
        .from('izin_absen')
        .update({ status: 'rejected' })
        .in('id', izinIds);
      if (iErr) throw iErr;
    }

    if (absensiIds.length > 0) {
      const { error: aErr } = await supabase
        .from('absensi')
        .update({ status: 'ditolak_lokasi' })
        .in('id', absensiIds);
      if (aErr) throw aErr;
    }

    return { success: true, count: ids.length };
  } catch (err: any) {
    console.error('Error bulkRejectAbsensiAction:', err);
    return { success: false, error: err.message || 'Gagal menolak absensi.' };
  }
}
