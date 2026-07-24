'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function getAllKelasAction() {
  try {
    const { data, error } = await supabase
      .from('master_kelas')
      .select('*, siswa:siswa(count)')
      .order('nama_kelas', { ascending: true });
      
    if (error) throw error;

    const formattedData = (data || []).map((k: any) => ({
      ...k,
      jumlah_siswa: k.siswa?.[0]?.count || 0,
    }));

    return { success: true, data: formattedData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createKelasAction(formData: FormData) {
  try {
    const nama_kelas = formData.get('nama_kelas') as string;
    const deskripsi = formData.get('deskripsi') as string;

    if (!nama_kelas) throw new Error('Nama kelas wajib diisi');

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('master_kelas')
      .insert([{ nama_kelas, deskripsi, updated_at: now }]);

    if (error) throw error;
    
    revalidatePath('/admin/kelas');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateKelasAction(formData: FormData) {
  try {
    const id = formData.get('id') as string;
    const nama_kelas = formData.get('nama_kelas') as string;
    const deskripsi = formData.get('deskripsi') as string;

    if (!id || !nama_kelas) throw new Error('Data tidak lengkap');

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('master_kelas')
      .update({ nama_kelas, deskripsi, updated_at: now })
      .eq('id', id);

    if (error) throw error;
    
    revalidatePath('/admin/kelas');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteKelasAction(formData: FormData) {
  try {
    const id = formData.get('id') as string;
    if (!id) throw new Error('ID tidak valid');

    const { error } = await supabase
      .from('master_kelas')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    revalidatePath('/admin/kelas');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Fetch all students belonging to a specific class
export async function getSiswaInKelasAction(kelasId: string) {
  try {
    const { data, error } = await supabase
      .from('siswa')
      .select('id, user_id, status_pendidikan, users:users(id, name, email, phone)')
      .eq('kelas_id', kelasId);

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Fetch all approved students for assigning to a class
export async function getAllApprovedSiswaForKelasAction() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, siswa:siswa!inner(id, kelas_id, status_pendidikan, master_kelas:master_kelas(nama_kelas))')
      .eq('role', 'siswa')
      .eq('status_registrasi', 'approved')
      .order('name', { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Add/Assign a student to a class
export async function addSiswaToKelasAction(siswaId: string, kelasId: string) {
  try {
    const { error } = await supabase
      .from('siswa')
      .update({ kelas_id: kelasId })
      .eq('id', siswaId);

    if (error) throw error;

    revalidatePath('/admin/kelas');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Remove a student from a class (set kelas_id to null)
export async function removeSiswaFromKelasAction(siswaId: string) {
  try {
    const { error } = await supabase
      .from('siswa')
      .update({ kelas_id: null })
      .eq('id', siswaId);

    if (error) throw error;

    revalidatePath('/admin/kelas');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
