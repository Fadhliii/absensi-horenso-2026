'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function getAllKelasAction() {
  try {
    const { data, error } = await supabase
      .from('master_kelas')
      .select('*')
      .order('nama_kelas', { ascending: true });
      
    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createKelasAction(formData: FormData) {
  try {
    const nama_kelas = formData.get('nama_kelas') as string;
    const deskripsi = formData.get('deskripsi') as string;

    if (!nama_kelas) throw new Error('Nama kelas wajib diisi');

    const { error } = await supabase
      .from('master_kelas')
      .insert([{ nama_kelas, deskripsi }]);

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

    const { error } = await supabase
      .from('master_kelas')
      .update({ nama_kelas, deskripsi })
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
