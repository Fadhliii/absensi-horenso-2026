'use server';

import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// Helper: Get user id from session
async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) throw new Error('Unauthorized');
  const session = await verifySessionToken(token);
  if (!session) throw new Error('Unauthorized');
  return session;
}

export async function ajukanIzinAction(formData: FormData) {
  try {
    const session = await getSessionUser();
    if (session.role !== 'siswa') {
      return { error: 'Hanya siswa yang dapat mengajukan izin.' };
    }

    const tanggal = formData.get('tanggal') as string;
    const tipe = formData.get('tipe') as 'izin' | 'sakit';
    const alasan = formData.get('alasan') as string;
    let dilaporkan_ke = (formData.get('dilaporkan_ke') as string) || null;

    if (!tanggal || !tipe || !alasan) {
      return { error: 'Semua field harus diisi.' };
    }

    if (!dilaporkan_ke) {
      // Auto lookup class instructor for student
      const { data: siswaData } = await supabase
        .from('siswa')
        .select('kelas_id')
        .eq('user_id', session.userId)
        .maybeSingle();

      if (siswaData?.kelas_id) {
        const { data: classIns } = await supabase
          .from('kelas_instruktur')
          .select('instruktur_id')
          .eq('kelas_id', siswaData.kelas_id)
          .limit(1)
          .maybeSingle();

        if (classIns?.instruktur_id) {
          dilaporkan_ke = classIns.instruktur_id;
        }
      }

      if (!dilaporkan_ke) {
        const { data: adminUser } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'admin')
          .limit(1)
          .maybeSingle();
        dilaporkan_ke = adminUser?.id || null;
      }
    }

    // Insert to DB
    const { error } = await supabase
      .from('izin_absen')
      .insert([
        {
          siswa_id: session.userId,
          tanggal,
          tipe,
          alasan,
          status: 'pending',
          dilaporkan_ke
        }
      ]);

    if (error) {
      if (error.code === '23505') {
        return { error: 'Anda sudah mengajukan izin/sakit pada tanggal tersebut.' };
      }
      throw error;
    }

    revalidatePath('/siswa/dashboard');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Terjadi kesalahan sistem' };
  }
}

export async function getIzinSiswaAction() {
  try {
    const session = await getSessionUser();
    if (session.role !== 'siswa') {
      return { error: 'Unauthorized', data: [] };
    }

    const { data, error } = await supabase
      .from('izin_absen')
      .select('*')
      .eq('siswa_id', session.userId)
      .order('tanggal', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { error: err.message || 'Error fetching data', data: [] };
  }
}

// ---------------- ADMIN / INSTRUKTUR ACTIONS ----------------

async function verifyAdminOrInstruktur() {
  const session = await getSessionUser();
  if (session.role !== 'admin' && session.role !== 'instruktur') {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function getSemuaIzinAction() {
  try {
    await verifyAdminOrInstruktur();

    const { data, error } = await supabase
      .from('izin_absen')
      .select(`
        *,
        users!izin_absen_siswa_id_fkey (
          id, 
          name, 
          email,
          siswa (
            kelas_id,
            master_kelas (nama_kelas),
            perusahaan (nama)
          )
        ),
        instruktur:users!izin_absen_dilaporkan_ke_fkey (name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch class instructor map for fallback
    const { data: mappingData } = await supabase
      .from('kelas_instruktur')
      .select('kelas_id, users:instruktur_id(name)');

    const classInsMap: Record<string, string> = {};
    mappingData?.forEach((m: any) => {
      const insName = Array.isArray(m.users) ? m.users[0]?.name : m.users?.name;
      if (m.kelas_id && insName) {
        classInsMap[m.kelas_id] = insName;
      }
    });

    const formattedData = (data || []).map((item: any) => {
      const u = item.users;
      const s = Array.isArray(u?.siswa) ? u.siswa[0] : u?.siswa;
      const k = Array.isArray(s?.master_kelas) ? s?.master_kelas[0] : s?.master_kelas;
      const p = Array.isArray(s?.perusahaan) ? s?.perusahaan[0] : s?.perusahaan;

      const kelasId = s?.kelas_id;
      const fallbackInsName = kelasId ? classInsMap[kelasId] : null;

      return {
        ...item,
        nama_kelas: k?.nama_kelas || 'Tanpa Kelas',
        nama_perusahaan: p?.nama || 'Belum Ditempatkan',
        instruktur_name: item.instruktur?.name || fallbackInsName || 'Admin LPK / Instruktur Umum'
      };
    });

    return { success: true, data: formattedData };
  } catch (err: any) {
    return { error: err.message || 'Error fetching data', data: [] };
  }
}

export async function setStatusIzinAction(id: string, status: 'approved' | 'rejected') {
  try {
    await verifyAdminOrInstruktur();

    const { error } = await supabase
      .from('izin_absen')
      .update({ status })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/admin/izin');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Terjadi kesalahan' };
  }
}

export async function getInstrukturAction() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name')
      .in('role', ['instruktur', 'admin'])
      .eq('status_registrasi', 'approved')
      .order('name');
      
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { error: err.message, data: [] };
  }
}

export async function inputIzinManualAction(formData: FormData) {
  try {
    const session = await verifyAdminOrInstruktur();

    const siswa_ids_json = formData.get('siswa_ids') as string;
    const tanggal = formData.get('tanggal') as string;
    const tipe = formData.get('tipe') as 'izin' | 'sakit';
    const alasan = formData.get('alasan') as string;

    if (!siswa_ids_json || !tanggal || !tipe || !alasan) {
      return { error: 'Semua field harus diisi.' };
    }

    let siswa_ids: string[] = [];
    try {
      siswa_ids = JSON.parse(siswa_ids_json);
      if (!Array.isArray(siswa_ids) || siswa_ids.length === 0) throw new Error();
    } catch {
      return { error: 'Daftar siswa tidak valid.' };
    }

    // 1. Hapus record absensi harian jika ada di tanggal ini untuk siswa-siswa tersebut
    const startOfDay = `${tanggal}T00:00:00+07:00`;
    const endOfDay = `${tanggal}T23:59:59+07:00`;

    await supabase
      .from('absensi')
      .delete()
      .in('siswa_id', siswa_ids)
      .gte('waktu_scan', startOfDay)
      .lte('waktu_scan', endOfDay);

    // 2. Hapus record izin_absen jika ada di tanggal ini untuk siswa-siswa tersebut
    await supabase
      .from('izin_absen')
      .delete()
      .in('siswa_id', siswa_ids)
      .eq('tanggal', tanggal);

    const payload = siswa_ids.map(id => ({
      siswa_id: id,
      tanggal,
      tipe,
      alasan: `[Input Manual Admin] ${alasan}`,
      status: 'approved',
      dilaporkan_ke: session.userId
    }));

    // Insert to DB dengan status otomatis approved
    const { error } = await supabase
      .from('izin_absen')
      .insert(payload);

    if (error) {
      console.error('Error inserting manual izin_absen:', error);
      return { error: error.message || 'Gagal menyimpan data izin manual.' };
    }

    revalidatePath('/admin/rekap');
    return { success: true };
  } catch (err: any) {
    console.error('Exception in inputIzinManualAction:', err);
    return { error: err.message || 'Terjadi kesalahan sistem' };
  }
}
