'use server';

import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import { jwtVerify } from 'jose';
import { closeExpiredSessions } from '@/app/actions/sesi';

const QR_SECRET = new TextEncoder().encode(
  process.env.QR_SECRET_KEY || 'default_secret_key_for_development_only_123'
);

// Rumus Haversine untuk menghitung jarak (dalam meter) antara dua titik GPS
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000; // Radius bumi dalam meter
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c;
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180);
}

export async function submitAbsensiAction(qrToken: string, studentLat: number, studentLng: number) {
  try {
    // Bersihkan sesi yang sudah kadaluarsa
    await closeExpiredSessions();

    // 1. Verifikasi Siswa yang Login
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    
    if (!sessionToken) return { error: 'Anda harus login untuk absen.' };
    
    const session = await verifySessionToken(sessionToken);
    if (!session || session.role !== 'siswa') return { error: 'Hanya siswa yang dapat melakukan absen.' };
    const userId = session.userId;

    // 2. RATE LIMITING: Cek jumlah absensi dalam 1 menit terakhir
    const satuMenitLalu = new Date(Date.now() - 60000).toISOString();
    const { count: recentAttempts } = await supabase
      .from('absensi')
      .select('*', { count: 'exact', head: true })
      .eq('siswa_id', userId)
      .gte('waktu_scan', satuMenitLalu);

    if (recentAttempts !== null && recentAttempts >= 10) {
      return { error: 'Terlalu banyak percobaan (Rate Limit). Tunggu 1 menit sebelum mencoba lagi.' };
    }

    // 3. Verifikasi Token QR
    let payload;
    try {
      const { payload: jwtPayload } = await jwtVerify(qrToken, QR_SECRET);
      payload = jwtPayload;
    } catch (err: any) {
      if (err.code === 'ERR_JWT_EXPIRED') {
        return { error: 'QR Code sudah kadaluarsa! Silakan scan ulang kode yang baru.' };
      }
      return { error: 'QR Code tidak valid atau palsu.' };
    }

    const sessionId = payload.sessionId as string;
    if (!sessionId) return { error: 'Data sesi tidak ditemukan dalam QR.' };

    // 4. Ambil data sesi dari database
    const { data: sesiData, error: sesiError } = await supabase
      .from('sesi_absensi')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sesiError || !sesiData) return { error: 'Sesi absensi tidak ditemukan di server.' };
    
    // Cek batas 30 menit
    const sessionAgeMs = Date.now() - new Date(sesiData.dibuat_pada).getTime();
    if (sessionAgeMs > 30 * 60 * 1000) {
      await supabase.from('sesi_absensi').update({ status: 'selesai' }).eq('id', sessionId);
      return { error: 'Sesi absensi ini sudah berakhir otomatis (melebihi batas waktu 30 menit).' };
    }

    if (sesiData.status !== 'aktif') {
      return { error: 'Sesi absensi ini sudah ditutup oleh Guru/Admin.' };
    }

    // 5. Cek apakah siswa sudah absen (yang berhasil) di sesi ini
    const { data: existingAbsen } = await supabase
      .from('absensi')
      .select('id, status')
      .eq('sesi_id', sessionId)
      .eq('siswa_id', userId)
      .eq('status', 'hadir')
      .single();

    if (existingAbsen) {
      return { error: 'Anda sudah tercatat hadir pada sesi ini.' };
    }

    // 6. Validasi Lokasi (Haversine Formula) + Toleransi Buffer GPS Laptop/Mobile (+30 meter / minimal 80 meter)
    const distance = getDistanceFromLatLonInMeters(
      sesiData.lokasi_lat, 
      sesiData.lokasi_lng, 
      studentLat, 
      studentLng
    );

    const allowedRadius = Math.max((sesiData.radius_meter || 50) + 30, 80);
    const isTooFar = distance > allowedRadius;
    
    // 7. Catat Kehadiran (Audit Trail)
    const finalStatus = isTooFar ? 'ditolak_lokasi' : 'hadir';

    const { error: insertError } = await supabase
      .from('absensi')
      .upsert(
        {
          sesi_id: sessionId,
          siswa_id: userId,
          status: finalStatus,
          lat_siswa: studentLat,
          lng_siswa: studentLng,
          jarak_meter: Math.round(distance),
          waktu_scan: new Date().toISOString()
        },
        { onConflict: 'siswa_id, sesi_id' }
      );

    if (insertError) {
      if (insertError.code === '23505') {
         return { error: 'Data kehadiran sudah diproses sebelumnya.' };
      }
      return { error: insertError.message };
    }

    if (isTooFar) {
      return { 
        error: `Posisi Anda terlalu jauh. Jarak: ${Math.round(distance)}m (Batas Toleransi: ${allowedRadius}m). Pencatatan ditolak.` 
      };
    }

    return { success: true, message: 'Absensi berhasil dicatat!' };

  } catch (error: any) {
    console.error('Error submit absensi:', error);
    return { error: 'Terjadi kesalahan sistem internal.' };
  }
}
