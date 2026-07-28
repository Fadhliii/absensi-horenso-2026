'use server';

import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';

const MAX_SESSION_DURATION_SECONDS = 30 * 60; // 30 Menit dalam detik
let lastCleanupTime = 0;

// Helper internal untuk otomatis menutup sesi yang kadaluarsa & auto-approve absensi pending > 3 jam
export async function closeExpiredSessions() {
  const now = Date.now();
  if (now - lastCleanupTime < 30000) return; // batasi max 1x per 30 detik
  lastCleanupTime = now;

  try {
    const limitTime = new Date(now - MAX_SESSION_DURATION_SECONDS * 1000).toISOString();
    
    // 1. Matikan sesi aktif yang dibuat lebih tua dari 30 menit yang lalu
    await supabase
      .from('sesi_absensi')
      .update({ status: 'selesai' })
      .eq('status', 'aktif')
      .lt('dibuat_pada', limitTime);

    // 2. PERATURAN 3 JAM: Auto-approve semua absensi pending menjadi 'hadir' 
    // jika sudah 3 jam sejak siswa PERTAMA menekan tombol Masuk Kelas
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
    const { data: pendingList } = await supabase
      .from('absensi')
      .select('id, sesi_id, waktu_scan')
      .in('status', ['pending_hadir', 'pending_telat', 'pending_luar_radius']);

    if (pendingList && pendingList.length > 0) {
      const sesiPendingMap = new Map<string, { id: string; waktu_scan: string }[]>();
      pendingList.forEach(item => {
        const key = item.sesi_id || 'default_sesi';
        if (!sesiPendingMap.has(key)) sesiPendingMap.set(key, []);
        sesiPendingMap.get(key)!.push(item);
      });

      const idsToAutoApprove: string[] = [];

      for (const [sesiId, items] of sesiPendingMap.entries()) {
        let earliestTime = Math.min(...items.map(i => new Date(i.waktu_scan).getTime()));

        if (sesiId !== 'default_sesi') {
          const { data: firstScan } = await supabase
            .from('absensi')
            .select('waktu_scan')
            .eq('sesi_id', sesiId)
            .order('waktu_scan', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (firstScan) {
            const firstScanMs = new Date(firstScan.waktu_scan).getTime();
            if (firstScanMs < earliestTime) earliestTime = firstScanMs;
          }
        }

        // Jika sudah 3 jam dari scan PERTAMA siswa
        if (now - earliestTime >= THREE_HOURS_MS) {
          items.forEach(i => idsToAutoApprove.push(i.id));
        }
      }

      // Auto-approve per-item jika waktu scan item itu sendiri > 3 jam
      const threeHoursAgoIso = new Date(now - THREE_HOURS_MS).toISOString();
      pendingList.forEach(item => {
        if (item.waktu_scan <= threeHoursAgoIso && !idsToAutoApprove.includes(item.id)) {
          idsToAutoApprove.push(item.id);
        }
      });

      if (idsToAutoApprove.length > 0) {
        await supabase
          .from('absensi')
          .update({ status: 'hadir' })
          .in('id', idsToAutoApprove);
      }
    }
  } catch (err) {
    console.error('Gagal menutup sesi / auto-approve absensi:', err);
  }
}

async function getAdminOrInstrukturId() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) throw new Error('Unauthorized');
  const session = await verifySessionToken(token);
  if (!session || (session.role !== 'admin' && session.role !== 'instruktur')) throw new Error('Unauthorized');
  return { userId: session.userId, role: session.role };
}

export async function mulaiSesiAction(formData: FormData) {
  let userAuth;
  try {
    userAuth = await getAdminOrInstrukturId();
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
  const kelas_id = (formData.get('kelas_id') as string) || null;

  if (isNaN(lat) || isNaN(lng)) {
    return { error: 'Lokasi GPS tidak valid. Pastikan Anda mengizinkan akses lokasi browser.' };
  }

  const { data, error } = await supabase
    .from('sesi_absensi')
    .insert([
      {
        dibuat_oleh: userAuth.userId,
        kelas_id: kelas_id === '' ? null : kelas_id,
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

// 1-Click Buka Presensi Kelas untuk Instruktur / Admin berdasarkan Koordinat Kelas yang Ditentukan
export async function mulaiSesiKelas1ClickAction(kelasId: string) {
  let userAuth;
  try {
    userAuth = await getAdminOrInstrukturId();
  } catch (e) {
    return { error: 'Anda tidak memiliki akses.' };
  }

  const { data: kelasData, error: kelasErr } = await supabase
    .from('master_kelas')
    .select('*')
    .eq('id', kelasId)
    .single();

  if (kelasErr || !kelasData) {
    return { error: 'Data kelas tidak ditemukan.' };
  }

  // Jika user adalah Instruktur / Guru, pastikan kelas ini ditugaskan kepadanya!
  if (userAuth.role === 'instruktur') {
    const { data: mappingCheck } = await supabase
      .from('kelas_instruktur')
      .select('id')
      .eq('kelas_id', kelasId)
      .eq('instruktur_id', userAuth.userId)
      .maybeSingle();

    if (!mappingCheck && kelasData.instruktur_id !== userAuth.userId) {
      return { error: 'Anda hanya dapat membuka presensi untuk kelas yang ditugaskan kepada Anda.' };
    }
  }

  const lat = kelasData.lokasi_lat;
  const lng = kelasData.lokasi_lng;
  const radius = kelasData.radius_meter || 100;

  if (lat === null || lng === null) {
    return { 
      error: `Kelas ${kelasData.nama_kelas} belum di-set titik lokasi koordinatnya oleh Admin. Silakan atur koordinat di menu Manajemen Kelas terlebih dahulu.` 
    };
  }

  // Tutup dulu sesi aktif lama KHUSUS untuk kelas ini
  await supabase
    .from('sesi_absensi')
    .update({ status: 'selesai' })
    .eq('kelas_id', kelasId)
    .eq('status', 'aktif');

  const { data, error } = await supabase
    .from('sesi_absensi')
    .insert([
      {
        dibuat_oleh: userAuth.userId,
        kelas_id: kelasId,
        lokasi_lat: lat,
        lokasi_lng: lng,
        radius_meter: radius,
        interval_qr_detik: 10,
        status: 'aktif',
      }
    ])
    .select('id')
    .single();

  if (error) return { error: error.message };

  return { success: true, sessionId: data.id, namaKelas: kelasData.nama_kelas };
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

// Action global untuk mengecek sesi aktif saat ini (Per Kelas & General)
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

    const { data: activeList, error } = await supabase
      .from('sesi_absensi')
      .select('id, dibuat_pada, radius_meter, status, kelas_id')
      .eq('status', 'aktif')
      .order('dibuat_pada', { ascending: false });

    if (error || !activeList || activeList.length === 0) {
      return { active: false, activeMap: {}, activeCount: 0, userRole };
    }

    const activeMap: Record<string, { sessionId: string; remainingSeconds: number }> = {};
    let globalActiveId: string | undefined = undefined;

    for (const item of activeList) {
      const createdAt = new Date(item.dibuat_pada).getTime();
      const elapsedSeconds = Math.floor((Date.now() - createdAt) / 1000);
      const remainingSeconds = MAX_SESSION_DURATION_SECONDS - elapsedSeconds;

      if (remainingSeconds <= 0) {
        await supabase.from('sesi_absensi').update({ status: 'selesai' }).eq('id', item.id);
      } else {
        if (!globalActiveId) globalActiveId = item.id;
        if (item.kelas_id) {
          activeMap[item.kelas_id] = { sessionId: item.id, remainingSeconds };
        } else {
          activeMap['general'] = { sessionId: item.id, remainingSeconds };
        }
      }
    }

    const activeCount = Object.keys(activeMap).length;
    const firstActive = Object.values(activeMap)[0];
    const globalRemainingSeconds = firstActive?.remainingSeconds;

    return {
      active: activeCount > 0,
      sessionId: globalActiveId,
      remainingSeconds: globalRemainingSeconds,
      activeMap,
      activeCount,
      userRole
    };
  } catch (err: any) {
    return { active: false, activeMap: {}, activeCount: 0, userRole: 'guest' };
  }
}

// ================= LOKASI PRESET ACTIONS ================= //

export async function getLokasiPresetsAction() {
  try {
    const { data, error } = await supabase
      .from('lokasi_preset')
      .select('*')
      .order('nama_lokasi', { ascending: true });

    if (error) return { error: error.message };
    return { data: data || [] };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function createLokasiPresetAction(formData: FormData) {
  try {
    await getAdminOrInstrukturId();
    const nama_lokasi = formData.get('nama_lokasi') as string;
    const lat = parseFloat(formData.get('latitude') as string);
    const lng = parseFloat(formData.get('longitude') as string);
    const radius = parseInt(formData.get('radius') as string) || 50;

    if (!nama_lokasi || isNaN(lat) || isNaN(lng)) {
      return { error: 'Nama lokasi dan koordinat GPS wajib diisi.' };
    }

    const { error } = await supabase
      .from('lokasi_preset')
      .insert([{
        nama_lokasi,
        latitude: lat,
        longitude: lng,
        radius_meter: radius
      }]);

    if (error) return { error: error.message };
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deleteLokasiPresetAction(id: string) {
  try {
    await getAdminOrInstrukturId();
    const { error } = await supabase
      .from('lokasi_preset')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
