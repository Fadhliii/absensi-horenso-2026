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

export async function createUserByAdminAction(formData: FormData) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    if (!token) return { error: 'Sesi tidak valid.' };
    const session = await verifySessionToken(token);
    if (!session || session.role !== 'admin') return { error: 'Akses ditolak. Hanya Admin yang dapat menambah akun.' };

    const name = (formData.get('name') as string)?.trim();
    const email = (formData.get('email') as string)?.trim()?.toLowerCase();
    const password = formData.get('password') as string;
    const role = formData.get('role') as string;
    const phone = (formData.get('phone') as string)?.trim() || null;

    if (!name || !email || !password || !role) {
      return { error: 'Nama, Email, Password, dan Role wajib diisi.' };
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return { error: 'Email sudah terdaftar. Gunakan email lain.' };
    }

    const password_hash = await (await import('@/lib/auth')).hashPassword(password);

    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert([
        {
          name,
          email,
          password_hash,
          role,
          phone,
          is_approved: true,
          status_registrasi: 'approved',
          force_change_password: false
        }
      ])
      .select('id')
      .single();

    if (userError || !newUser) {
      return { error: userError?.message || 'Gagal membuat akun user baru.' };
    }

    if (role === 'siswa') {
      const kelas_id = (formData.get('kelas_id') as string) || null;
      const perusahaan_id = (formData.get('perusahaan_id') as string) || null;
      const batch = (formData.get('batch') as string)?.trim() || null;
      const tanggal_berangkat = (formData.get('tanggal_berangkat') as string) || null;
      const status_pendidikan = (formData.get('status_pendidikan') as string) || 'belum_mulai';

      const { error: siswaError } = await supabase.from('siswa').insert([
        {
          user_id: newUser.id,
          status_penempatan: perusahaan_id ? 'sudah' : 'belum',
          status_pendidikan,
          kelas_id,
          perusahaan_id,
          batch,
          tanggal_berangkat,
        }
      ]);

      if (siswaError) {
        console.error('Error inserting student metadata:', siswaError);
      }
    }

    const { revalidatePath } = await import('next/cache');
    revalidatePath('/admin/users');
    return { success: true, message: 'Akun baru berhasil dibuat!' };

  } catch (error: any) {
    return { error: error.message || 'Terjadi kesalahan sistem.' };
  }
}
