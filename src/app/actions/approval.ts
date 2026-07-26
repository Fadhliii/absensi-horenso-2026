'use server';

import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';

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
    await verifyAdminOrInstruktur();

    const today = tanggalStr ? new Date(tanggalStr) : new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    // UTC+7 Boundaries for WIB date
    const startOfDay = new Date(Date.UTC(year, month, day, -7, 0, 0)).toISOString();
    const endOfDay = new Date(Date.UTC(year, month, day + 1, -7, 0, 0)).toISOString();

    const { data: rawPending, error } = await supabase
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
      .order('waktu_scan', { ascending: true });

    if (error) {
      console.error('Error fetching pending absensi:', error);
      throw error;
    }

    let list = (rawPending || []).map((item: any) => {
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
        jarak_meter: item.jarak_meter || 0
      };
    });

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

    const { count, error } = await supabase
      .from('absensi')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending_hadir', 'pending_telat', 'pending_luar_radius'])
      .gte('waktu_scan', startOfDay);

    if (error) return { count: 0 };
    return { count: count || 0 };
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

    // Group by target status for efficient bulk update
    const hadirIds = approvals.filter(a => a.targetStatus === 'hadir').map(a => a.id);
    const telatIds = approvals.filter(a => a.targetStatus === 'telat').map(a => a.id);

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

    const { error } = await supabase
      .from('absensi')
      .update({ status: 'ditolak_lokasi' })
      .in('id', ids);

    if (error) throw error;

    return { success: true, count: ids.length };
  } catch (err: any) {
    console.error('Error bulkRejectAbsensiAction:', err);
    return { success: false, error: err.message || 'Gagal menolak absensi.' };
  }
}
