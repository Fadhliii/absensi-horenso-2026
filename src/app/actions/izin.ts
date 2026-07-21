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
    const dilaporkan_ke = formData.get('dilaporkan_ke') as string;

    if (!tanggal || !tipe || !alasan) {
      return { error: 'Semua field harus diisi.' };
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
          dilaporkan_ke: dilaporkan_ke || null
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
        users!izin_absen_siswa_id_fkey (name, email),
        instruktur:users!izin_absen_dilaporkan_ke_fkey (name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
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
      if (error.code === '23505') {
        return { error: 'Satu atau lebih siswa sudah memiliki data izin/sakit pada tanggal tersebut.' };
      }
      throw error;
    }

    revalidatePath('/admin/rekap');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Terjadi kesalahan sistem' };
  }
}
