'use server';

import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';

export async function getAllUsersAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return { error: 'Sesi tidak valid.' };
  const session = await verifySessionToken(token);
  if (!session || session.role !== 'admin') return { error: 'Akses ditolak.' };

  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      name,
      email,
      phone,
      role,
      status_registrasi,
      created_at,
      siswa(id, batch)
    `)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };
  return { data };
}

export async function updateUserRoleAction(userId: string, newRole: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return { error: 'Sesi tidak valid.' };
  const session = await verifySessionToken(token);
  if (!session || session.role !== 'admin') return { error: 'Akses ditolak.' };

  const { error } = await supabase
    .from('users')
    .update({ role: newRole })
    .eq('id', userId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateUserStatusAction(userId: string, newStatus: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return { error: 'Sesi tidak valid.' };
  const session = await verifySessionToken(token);
  if (!session || session.role !== 'admin') return { error: 'Akses ditolak.' };

  // Update status di users
  const { error: userError } = await supabase
    .from('users')
    .update({ status_registrasi: newStatus })
    .eq('id', userId);

  if (userError) return { error: userError.message };

  // Jika di-approve dan dia adalah siswa, pastikan record di tabel siswa ada
  if (newStatus === 'approved') {
    const { data: user } = await supabase.from('users').select('role').eq('id', userId).single();
    
    if (user?.role === 'siswa') {
      const { data: existingSiswa } = await supabase
        .from('siswa')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!existingSiswa) {
        await supabase
          .from('siswa')
          .insert({ user_id: userId, status_penempatan: 'belum' });
      }
    }
  }

  return { success: true };
}
