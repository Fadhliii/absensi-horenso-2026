'use server';

import { supabase } from '@/lib/supabase';
import { hashPassword, verifyPassword, createSessionToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function registerAction(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const password = formData.get('password') as string;
  const role = (formData.get('role') as string) || 'siswa';

  if (!name || !email || !password) {
    return { error: 'Semua kolom wajib diisi!' };
  }

  if (role !== 'siswa' && role !== 'instruktur') {
    return { error: 'Peran (Role) tidak valid!' };
  }

  try {
    const passwordHash = await hashPassword(password);
    const perusahaan_id = (formData.get('perusahaan_id') as string) || null;
    const batch_id = (formData.get('batch_id') as string) || null;
    
    // Status 'pending' until approved by admin
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([
        {
          name,
          email,
          phone,
          password_hash: passwordHash,
          role,
          status_registrasi: 'pending',
          force_change_password: false,
        }
      ])
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        return { error: 'Email sudah terdaftar!' };
      }
      throw error;
    }

    if (role === 'siswa' && newUser?.id) {
      let batchName = null;
      let tglBerangkat = null;

      if (batch_id) {
        const { data: bData } = await supabase
          .from('perusahaan_batch')
          .select('nama_batch, tanggal_berangkat')
          .eq('id', batch_id)
          .single();
        if (bData) {
          batchName = bData.nama_batch;
          tglBerangkat = bData.tanggal_berangkat;
        }
      }

      await supabase.from('siswa').insert([
        {
          user_id: newUser.id,
          status_penempatan: perusahaan_id ? 'sudah' : 'belum',
          perusahaan_id: perusahaan_id,
          batch_id: batch_id,
          batch: batchName,
          tanggal_berangkat: tglBerangkat,
        }
      ]);
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Terjadi kesalahan saat registrasi.' };
  }
}

// Rate limiting untuk login: email -> { count, lastAttempt }
const loginRateLimitMap = new Map<string, { count: number; lastAttempt: number }>();

function checkLoginRateLimit(email: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const limitWindow = 60000; // 1 menit
  const maxAttempts = 5; // Maksimal 5 kali login per menit

  const record = loginRateLimitMap.get(email);
  if (!record) {
    loginRateLimitMap.set(email, { count: 1, lastAttempt: now });
    return { allowed: true };
  }

  if (now - record.lastAttempt > limitWindow) {
    // Reset window setelah 1 menit berlalu
    loginRateLimitMap.set(email, { count: 1, lastAttempt: now });
    return { allowed: true };
  }

  if (record.count >= maxAttempts) {
    const remainingTime = Math.ceil((limitWindow - (now - record.lastAttempt)) / 1000);
    return { allowed: false, waitSeconds: remainingTime };
  }

  record.count += 1;
  return { allowed: true };
}

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email dan password wajib diisi!' };
  }

  // Cek Rate Limit
  const rateLimit = checkLoginRateLimit(email);
  if (!rateLimit.allowed) {
    return { error: `Terlalu banyak percobaan login. Silakan tunggu ${rateLimit.waitSeconds} detik.` };
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return { error: 'Email atau password salah!' };
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return { error: 'Email atau password salah!' };
    }

    if (user.status_registrasi === 'rejected') {
      return { error: 'Akun Anda ditolak oleh Admin.' };
    }

    if (user.status_registrasi === 'pending' && user.role !== 'admin') {
      return { error: 'Akun kamu sedang menunggu persetujuan admin' };
    }

    // Set Cookie
    const token = await createSessionToken({
      userId: user.id,
      role: user.role,
      status: user.status_registrasi,
      forceChangePassword: user.force_change_password,
    });

    const cookieStore = await cookies();
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });

  } catch (err: any) {
    return { error: err.message || 'Terjadi kesalahan saat login.' };
  }

  // Lakukan redirect di luar try-catch karena Next.js redirect melemparkan error khusus
  redirect('/'); 
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  redirect('/login');
}

// ---------------- ADMIN ACTIONS ---------------- //

export async function getPendingStudentsAction() {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, phone, created_at')
    .eq('role', 'siswa')
    .eq('status_registrasi', 'pending')
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };
  return { data };
}

export async function approveStudentAction(id: string) {
  // 1. Update status di users
  const { error: userError } = await supabase
    .from('users')
    .update({ status_registrasi: 'approved' })
    .eq('id', id);

  if (userError) return { error: userError.message };

  // 2. Insert ke tabel siswa jika belum ada
  const { data: existingSiswa } = await supabase
    .from('siswa')
    .select('id')
    .eq('user_id', id)
    .single();

  if (!existingSiswa) {
    const { error: siswaError } = await supabase
      .from('siswa')
      .insert({ user_id: id, status_penempatan: 'belum' });

    if (siswaError) return { error: siswaError.message };
  }

  return { success: true };
}

export async function rejectStudentAction(id: string) {
  const { error } = await supabase
    .from('users')
    .update({ status_registrasi: 'rejected' })
    .eq('id', id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function resetPasswordAction(id: string, customPassword?: string) {
  const newPassword = customPassword && customPassword.trim() !== '' 
    ? customPassword 
    : Math.random().toString(36).slice(-8);
    
  if (newPassword.length < 6) {
    return { error: 'Password minimal 6 karakter.' };
  }

  const passwordHash = await hashPassword(newPassword);

  const { error } = await supabase
    .from('users')
    .update({ 
      password_hash: passwordHash, 
      force_change_password: true 
    })
    .eq('id', id);

  if (error) return { error: error.message };
  return { success: true, newPassword };
}

// ---------------- STUDENT ACTIONS ---------------- //

export async function changePasswordAction(formData: FormData) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return { error: 'Sesi tidak valid.' };

  const session = await import('@/lib/auth').then(m => m.verifySessionToken(token));
  if (!session) return { error: 'Sesi kedaluwarsa.' };

  const newPassword = formData.get('new_password') as string;
  const confirmPassword = formData.get('confirm_password') as string;

  if (!newPassword || newPassword.length < 6) {
    return { error: 'Password minimal 6 karakter.' };
  }
  if (newPassword !== confirmPassword) {
    return { error: 'Konfirmasi password tidak cocok.' };
  }

  const passwordHash = await hashPassword(newPassword);

  const { error } = await supabase
    .from('users')
    .update({ 
      password_hash: passwordHash, 
      force_change_password: false 
    })
    .eq('id', session.userId);

  if (error) return { error: error.message };

  // Update cookie agar forceChangePassword = false
  const newToken = await createSessionToken({
    ...session,
    forceChangePassword: false,
  });

  const updatedCookieStore = await cookies();
  updatedCookieStore.set('session', newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect(session.role === 'admin' ? '/admin/dashboard' : '/siswa/dashboard');
}

