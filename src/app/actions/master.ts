'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { hashPassword } from '@/lib/auth';

// ================= PERUSAHAAN ACTIONS ================= //

export async function getPerusahaanAction(page: number, search: string) {
  const limit = 10;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from('perusahaan').select('*', { count: 'exact' });

  if (search) {
    query = query.ilike('nama', `%${search}%`);
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) return { error: error.message };
  return { data, total: count || 0, limit };
}

export async function getAllPerusahaanAction() {
  // Untuk dropdown assign siswa
  const { data, error } = await supabase.from('perusahaan').select('id, nama').order('nama');
  if (error) return { error: error.message };
  return { data };
}

export async function createPerusahaanAction(formData: FormData) {
  const nama = formData.get('nama') as string;
  const alamat = formData.get('alamat') as string;
  const kontak = formData.get('kontak') as string;

  if (!nama) return { error: 'Nama perusahaan wajib diisi.' };

  const { error } = await supabase.from('perusahaan').insert([{ nama, alamat, kontak }]);
  if (error) return { error: error.message };

  revalidatePath('/admin/perusahaan');
  return { success: true };
}

export async function updatePerusahaanAction(id: string, formData: FormData) {
  const nama = formData.get('nama') as string;
  const alamat = formData.get('alamat') as string;
  const kontak = formData.get('kontak') as string;

  if (!nama) return { error: 'Nama perusahaan wajib diisi.' };

  const { error } = await supabase.from('perusahaan').update({ nama, alamat, kontak }).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/admin/perusahaan');
  return { success: true };
}

export async function deletePerusahaanAction(id: string) {
  // Karena schema menggunakan ON DELETE SET NULL, kita perlu update manual status_penempatan siswa
  // yang asalnya perusahaan ini agar kembali menjadi 'belum'
  await supabase.from('siswa').update({ status_penempatan: 'belum' }).eq('perusahaan_id', id);

  const { error } = await supabase.from('perusahaan').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/admin/perusahaan');
  revalidatePath('/admin/siswa');
  return { success: true };
}

// ================= SISWA ACTIONS ================= //

export async function getSiswaApprovedAction(page: number, search: string, statusFilter: string) {
  const limit = 10;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('users')
    .select(`
      id, name, email, phone,
      siswa ( id, status_penempatan, perusahaan_id, perusahaan (nama) )
    `, { count: 'exact' })
    .eq('role', 'siswa')
    .eq('status_registrasi', 'approved');

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  // Next.js PostgREST filter on nested relation is a bit tricky, but we can filter by querying the joined table
  // However, Supabase (PostgREST) doesn't support easy nested filtering that affects the main row return.
  // Instead, if statusFilter is used, we can query `siswa` table directly and join `users`.
  
  if (statusFilter && statusFilter !== 'semua') {
    let siswaQuery = supabase
      .from('siswa')
      .select(`
        id, status_penempatan, perusahaan_id, perusahaan (nama),
        users!inner (id, name, email, phone, status_registrasi, role)
      `, { count: 'exact' })
      .eq('users.status_registrasi', 'approved')
      .eq('users.role', 'siswa')
      .eq('status_penempatan', statusFilter);

    if (search) {
      siswaQuery = siswaQuery.ilike('users.name', `%${search}%`);
    }

    const { data, count, error } = await siswaQuery
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) return { error: error.message };
    
    // Map kembali bentuknya agar sama
    const mappedData = (data || []).map(d => {
      if (!d) return null;
      const user = Array.isArray(d.users) ? d.users[0] : (d.users as any);
      const perusahaanObj = Array.isArray(d.perusahaan) ? d.perusahaan[0] : (d.perusahaan as any);
      return {
        id: user?.id || '',
        name: user?.name || 'Siswa',
        email: user?.email || '',
        phone: user?.phone || '',
        siswa: {
          id: d.id || '',
          status_penempatan: d.status_penempatan || 'belum',
          perusahaan_id: d.perusahaan_id || null,
          perusahaan: perusahaanObj ? { nama: perusahaanObj.nama || '' } : null
        }
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    return { data: mappedData, total: count || 0, limit };
  }

  // Jika tidak ada filter status_penempatan, query users join siswa
  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) return { error: error.message };

  const mappedData = (data || []).map(d => {
    if (!d) return null;
    const siswaObj = Array.isArray(d.siswa) ? d.siswa[0] : (d.siswa as any);
    const perusahaanObj = siswaObj?.perusahaan ? (Array.isArray(siswaObj.perusahaan) ? siswaObj.perusahaan[0] : siswaObj.perusahaan) : null;
    return {
      id: d.id || '',
      name: d.name || 'Siswa',
      email: d.email || '',
      phone: d.phone || '',
      siswa: siswaObj ? {
        id: siswaObj.id || '',
        status_penempatan: siswaObj.status_penempatan || 'belum',
        perusahaan_id: siswaObj.perusahaan_id || null,
        perusahaan: perusahaanObj ? { nama: perusahaanObj.nama || '' } : null
      } : null
    };
  }).filter((item): item is NonNullable<typeof item> => item !== null);

  return { data: mappedData, total: count || 0, limit };
}

export async function assignSiswaPerusahaanAction(userId: string, status: 'belum' | 'sudah', perusahaanId?: string) {
  const updateData: any = { status_penempatan: status };
  
  if (status === 'sudah' && perusahaanId) {
    updateData.perusahaan_id = perusahaanId;
  } else {
    updateData.perusahaan_id = null;
  }

  const { error } = await supabase
    .from('siswa')
    .update(updateData)
    .eq('user_id', userId);

  if (error) return { error: error.message };
  
  revalidatePath('/admin/siswa');
  return { success: true };
}

export async function getSiswaByIdAction(id: string) {
  const { data, error } = await supabase.from('users').select('id, name, email, phone').eq('id', id).single();
  if (error) return { error: error.message };
  return { data };
}

export async function updateSiswaProfileAction(id: string, formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const password = formData.get('password') as string;

  if (!name || !email) return { error: 'Nama dan Email wajib diisi.' };

  const updateData: any = { name, email, phone };
  
  if (password) {
    if (password.length < 6) return { error: 'Password minimal 6 karakter.' };
    const passwordHash = await hashPassword(password);
    updateData.password_hash = passwordHash;
    updateData.force_change_password = true; // Paksa siswa untuk ganti password saat login
  }

  const { error } = await supabase.from('users').update(updateData).eq('id', id);
  if (error) {
    if (error.code === '23505') return { error: 'Email sudah digunakan oleh akun lain.' };
    return { error: error.message };
  }

  revalidatePath('/admin/siswa');
  return { success: true };
}
