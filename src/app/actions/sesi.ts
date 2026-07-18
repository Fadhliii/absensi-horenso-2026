'use server';

import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

async function getAdminId() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) throw new Error('Unauthorized');
  const session = await verifySessionToken(token);
  if (!session || session.role !== 'admin') throw new Error('Unauthorized');
  return session.userId;
}

export async function mulaiSesiAction(formData: FormData) {
  let userId;
  try {
    userId = await getAdminId();
  } catch (e) {
    return { error: 'Anda tidak memiliki akses.' };
  }

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

  // Kembalikan ID untuk di-redirect oleh client
  return { success: true, sessionId: data.id };
}

export async function selesaiSesiAction(sessionId: string) {
  try {
    await getAdminId(); // Verifikasi admin
  } catch (e) {
    return { error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('sesi_absensi')
    .update({ status: 'selesai' })
    .eq('id', sessionId);

  if (error) return { error: error.message };

  return { success: true };
}

export async function getDetailSesiAction(sessionId: string) {
  const { data, error } = await supabase
    .from('sesi_absensi')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function getJumlahHadirAction(sessionId: string) {
  const { count, error } = await supabase
    .from('absensi')
    .select('*', { count: 'exact', head: true }) // head: true hanya mengambil count tanpa row data
    .eq('sesi_id', sessionId)
    .eq('status', 'hadir');

  if (error) return { error: error.message };
  return { count: count || 0 };
}
