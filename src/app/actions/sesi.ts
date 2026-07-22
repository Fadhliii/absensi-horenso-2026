'use server';

import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';

const MAX_SESSION_DURATION_SECONDS = 30 * 60; // 30 Menit dalam detik

// Helper internal untuk otomatis menutup sesi yang sudah lebih dari 30 menit
export async function closeExpiredSessions() {
  try {
    const limitTime = new Date(Date.now() - MAX_SESSION_DURATION_SECONDS * 1000).toISOString();
    
    // Matikan sesi aktif yang dibuat lebih tua dari 30 menit yang lalu
    await supabase
      .from('sesi_absensi')
      .update({ status: 'selesai' })
      .eq('status', 'aktif')
      .lt('dibuat_pada', limitTime);
  } catch (err) {
    console.error('Gagal menutup sesi kadaluarsa:', err);
  }
}

async function getAdminOrInstrukturId() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) throw new Error('Unauthorized');
  const session = await verifySessionToken(token);
  if (!session || (session.role !== 'admin' && session.role !== 'instruktur')) throw new Error('Unauthorized');
  return session.userId;
}

export async function mulaiSesiAction(formData: FormData) {
  let userId;
  try {
    userId = await getAdminOrInstrukturId();
  } catch (e) {
    return { error: 'Anda tidak memiliki akses.' };
  }

  // Tutup dulu semua sesi lama yang menggantung/aktif
  await supabase
    .from('sesi_absensi')
    .update({ status: 'selesai' })
    .eq('status', 'aktif');

  const lat = parseFloat(formData.get('latitude') as string);
  const lng = parseFloat(formData.get('longitude') as string);
  const radius = parseInt(formData.get('radius') as string);
  const interval = parseInt(formData.get('interval') as string);

  if (isNaN(lat) || isNaN(lng)) {
    return { error: 'Lokasi GPS tidak valid. Pastikan Anda mengizinkan akses lokasi browser.' };
  }

  const { data, error } = await supabase
    .from('sesi_absensi')
    .insert([
      {
        dibuat_oleh: userId,
        lokasi_lat: lat,
        lokasi_lng: lng,
        radius_meter: radius || 50,
        interval_qr_detik: interval || 10,
        status: 'aktif',
      }
    ])
    .select('id')
    .single();

  if (error) return { error: error.message };

  return { success: true, sessionId: data.id };
}

export async function selesaiSesiAction(sessionId: string) {
  try {
    await getAdminOrInstrukturId();
  } catch (e) {
    return { error: 'Hanya Admin/Instruktur yang dapat menutup sesi.' };
  }

  const { error } = await supabase
    .from('sesi_absensi')
    .update({ status: 'selesai' })
    .eq('id', sessionId);

  if (error) return { error: error.message };

  return { success: true };
}

export async function getDetailSesiAction(sessionId: string) {
  await closeExpiredSessions();

  const { data, error } = await supabase
    .from('sesi_absensi')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error || !data) return { error: error?.message || 'Sesi tidak ditemukan' };

  // Hitung sisa waktu
  const createdAt = new Date(data.dibuat_pada).getTime();
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - createdAt) / 1000);
  const remainingSeconds = Math.max(0, MAX_SESSION_DURATION_SECONDS - elapsedSeconds);

  if (data.status === 'aktif' && remainingSeconds <= 0) {
    // Sesi sudah kadaluarsa saat di-fetch
    await supabase.from('sesi_absensi').update({ status: 'selesai' }).eq('id', sessionId);
    data.status = 'selesai';
  }

  return { data, remainingSeconds };
}

export async function getJumlahHadirAction(sessionId: string) {
  const { count, error } = await supabase
    .from('absensi')
    .select('*', { count: 'exact', head: true })
    .eq('sesi_id', sessionId)
    .eq('status', 'hadir');

  if (error) return { error: error.message };
  return { count: count || 0 };
}

// Action global untuk mengecek sesi aktif saat ini
export async function getActiveSesiInfoAction() {
  try {
    await closeExpiredSessions();

    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    let userRole = 'guest';

    if (token) {
      const session = await verifySessionToken(token);
      if (session) userRole = session.role;
    }

    const { data, error } = await supabase
      .from('sesi_absensi')
      .select('id, dibuat_pada, radius_meter, status')
      .eq('status', 'aktif')
      .order('dibuat_pada', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return { active: false, userRole };
    }

    const createdAt = new Date(data.dibuat_pada).getTime();
    const elapsedSeconds = Math.floor((Date.now() - createdAt) / 1000);
    const remainingSeconds = MAX_SESSION_DURATION_SECONDS - elapsedSeconds;

    if (remainingSeconds <= 0) {
      await supabase.from('sesi_absensi').update({ status: 'selesai' }).eq('id', data.id);
      return { active: false, userRole };
    }

    return {
      active: true,
      sessionId: data.id,
      remainingSeconds,
      userRole
    };
  } catch (err: any) {
    return { active: false, userRole: 'guest' };
  }
}
