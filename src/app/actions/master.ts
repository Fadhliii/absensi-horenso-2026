'use server';

import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';
import { hashPassword } from '@/lib/auth';

// ================= PERUSAHAAN ACTIONS ================= //

export async function getPerusahaanAction(page: number, search: string) {
  const limit = 10;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabaseAdmin.from('perusahaan').select('*', { count: 'exact' });

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
  const { data, error } = await supabaseAdmin.from('perusahaan').select('id, nama').order('nama');
  if (error) return { error: error.message };
  return { data };
}

export async function createPerusahaanAction(formData: FormData) {
  const nama = formData.get('nama') as string;
  const alamat = formData.get('alamat') as string;
  const kontak = formData.get('kontak') as string;

  if (!nama) return { error: 'Nama perusahaan wajib diisi.' };

  const { error } = await supabaseAdmin.from('perusahaan').insert([{ nama, alamat, kontak }]);
  if (error) return { error: error.message };

  revalidatePath('/admin/perusahaan');
  return { success: true };
}

export async function updatePerusahaanAction(id: string, formData: FormData) {
  const nama = formData.get('nama') as string;
  const alamat = formData.get('alamat') as string;
  const kontak = formData.get('kontak') as string;

  if (!nama) return { error: 'Nama perusahaan wajib diisi.' };

  const { error } = await supabaseAdmin.from('perusahaan').update({ nama, alamat, kontak }).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/admin/perusahaan');
  return { success: true };
}

export async function deletePerusahaanAction(id: string) {
  // Karena schema menggunakan ON DELETE SET NULL, kita perlu update manual status_penempatan siswa
  // yang asalnya perusahaan ini agar kembali menjadi 'belum'
  await supabaseAdmin.from('siswa').update({ status_penempatan: 'belum' }).eq('perusahaan_id', id);

  const { error } = await supabaseAdmin.from('perusahaan').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/admin/perusahaan');
  revalidatePath('/admin/siswa');
  return { success: true };
}

// ================= PERUSAHAAN BATCH ACTIONS ================= //

export async function getBatchesByPerusahaanAction(perusahaanId: string) {
  const { data, error } = await supabaseAdmin
    .from('perusahaan_batch')
    .select('*')
    .eq('perusahaan_id', perusahaanId)
    .order('created_at', { ascending: true });

  if (error) return { error: error.message };
  return { data };
}

export async function createPerusahaanBatchAction(formData: FormData) {
  const perusahaan_id = formData.get('perusahaan_id') as string;
  const nama_batch = formData.get('nama_batch') as string;
  const tanggal_berangkat = (formData.get('tanggal_berangkat') as string) || null;
  const kuota = parseInt((formData.get('kuota') as string) || '0', 10);
  const keterangan = (formData.get('keterangan') as string) || '';

  if (!perusahaan_id || !nama_batch) {
    return { error: 'Perusahaan dan Nama Batch wajib diisi.' };
  }

  const { error } = await supabaseAdmin.from('perusahaan_batch').insert([{
    perusahaan_id,
    nama_batch,
    tanggal_berangkat,
    kuota,
    keterangan
  }]);

  if (error) return { error: error.message };

  revalidatePath('/admin/perusahaan');
  revalidatePath('/admin/siswa');
  return { success: true };
}

export async function updatePerusahaanBatchAction(id: string, formData: FormData) {
  const nama_batch = formData.get('nama_batch') as string;
  const tanggal_berangkat = (formData.get('tanggal_berangkat') as string) || null;
  const kuota = parseInt((formData.get('kuota') as string) || '0', 10);
  const keterangan = (formData.get('keterangan') as string) || '';

  if (!nama_batch) return { error: 'Nama Batch wajib diisi.' };

  const { error } = await supabaseAdmin.from('perusahaan_batch').update({
    nama_batch,
    tanggal_berangkat,
    kuota,
    keterangan
  }).eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/admin/perusahaan');
  revalidatePath('/admin/siswa');
  return { success: true };
}

export async function deletePerusahaanBatchAction(id: string) {
  // Set batch_id siswa yang ada di batch ini menjadi null
  await supabaseAdmin.from('siswa').update({ batch_id: null }).eq('batch_id', id);

  const { error } = await supabaseAdmin.from('perusahaan_batch').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/admin/perusahaan');
  revalidatePath('/admin/siswa');
  return { success: true };
}

export async function getPerusahaanHierarchyAction(search: string = '') {
  let pQuery = supabaseAdmin.from('perusahaan').select(`
    id, nama, alamat, kontak, created_at
  `).order('nama');

  if (search) {
    pQuery = pQuery.ilike('nama', `%${search}%`);
  }

  const { data: perusahaanList, error: pError } = await pQuery;
  if (pError) return { error: pError.message };

  if (!perusahaanList || perusahaanList.length === 0) {
    return { data: [] };
  }

  const perusahaanIds = perusahaanList.map(p => p.id);

  // Fetch all batches for these companies
  const { data: batchList } = await supabaseAdmin
    .from('perusahaan_batch')
    .select('*')
    .in('perusahaan_id', perusahaanIds)
    .order('created_at', { ascending: true });

  // Fetch all students assigned to these companies
  const { data: siswaList } = await supabaseAdmin
    .from('siswa')
    .select(`
      id, user_id, perusahaan_id, batch_id, batch, tanggal_berangkat, status_penempatan,
      users ( id, name, email, phone )
    `)
    .in('perusahaan_id', perusahaanIds);

  // Structure into hierarchy
  const hierarchy = perusahaanList.map(p => {
    const pBatches = (batchList || []).filter(b => b.perusahaan_id === p.id);
    const pSiswa = (siswaList || []).filter(s => s.perusahaan_id === p.id);

    const batchesWithSiswa = pBatches.map(b => {
      const bSiswa = pSiswa.filter(s => s.batch_id === b.id || s.batch === b.nama_batch);
      return {
        ...b,
        siswa: bSiswa.map(s => {
          const u = Array.isArray(s.users) ? s.users[0] : (s.users as any);
          return {
            id: s.id,
            user_id: s.user_id,
            name: u?.name || 'Siswa',
            email: u?.email || '',
            phone: u?.phone || '',
            tanggal_berangkat: s.tanggal_berangkat || b.tanggal_berangkat
          };
        })
      };
    });

    // Siswa assigned to company but no batch
    const unbatchedSiswa = pSiswa.filter(s => !s.batch_id && !pBatches.some(b => b.nama_batch === s.batch));

    return {
      ...p,
      batches: batchesWithSiswa,
      unbatchedSiswa: unbatchedSiswa.map(s => {
        const u = Array.isArray(s.users) ? s.users[0] : (s.users as any);
        return {
          id: s.id,
          user_id: s.user_id,
          name: u?.name || 'Siswa',
          email: u?.email || '',
          phone: u?.phone || '',
          tanggal_berangkat: s.tanggal_berangkat
        };
      }),
      totalSiswa: pSiswa.length
    };
  });

  return { data: hierarchy };
}

// ================= SISWA ACTIONS ================= //

export async function getSiswaApprovedAction(
  page: number, 
  search: string, 
  statusFilter: string, 
  perusahaanFilter: string = '', 
  keberangkatanFilter: string = 'semua', 
  sortOrder: string = 'desc', 
  batchFilter: string = '',
  kelasFilter: string = '',
  statusPendidikanFilter: string = 'semua'
) {
  const limit = 10;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabaseAdmin
    .from('users')
    .select(`
      id, name, email, phone, created_at,
      siswa ( id, status_penempatan, status_pendidikan, perusahaan_id, batch_id, batch, tanggal_berangkat, kelas_id, master_kelas (nama_kelas), perusahaan (nama) )
    `, { count: 'exact' })
    .eq('role', 'siswa')
    .eq('status_registrasi', 'approved');

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  if (
    (statusFilter && statusFilter !== 'semua') || 
    perusahaanFilter || 
    batchFilter || 
    kelasFilter ||
    (statusPendidikanFilter && statusPendidikanFilter !== 'semua') ||
    (keberangkatanFilter && keberangkatanFilter !== 'semua')
  ) {
    let siswaQuery = supabaseAdmin
    .from('siswa')
      .select(`
        id, status_penempatan, status_pendidikan, perusahaan_id, batch_id, batch, tanggal_berangkat, kelas_id, master_kelas (nama_kelas), perusahaan (nama),
        users!inner (id, name, email, phone, status_registrasi, role, created_at)
      `, { count: 'exact' })
      .eq('users.status_registrasi', 'approved')
      .eq('users.role', 'siswa');

    if (statusFilter && statusFilter !== 'semua') {
      siswaQuery = siswaQuery.eq('status_penempatan', statusFilter);
    }

    if (statusPendidikanFilter && statusPendidikanFilter !== 'semua') {
      siswaQuery = siswaQuery.eq('status_pendidikan', statusPendidikanFilter);
    }

    if (kelasFilter) {
      siswaQuery = siswaQuery.eq('kelas_id', kelasFilter);
    }

    if (search) {
      siswaQuery = siswaQuery.ilike('users.name', `%${search}%`);
    }

    if (perusahaanFilter) {
      siswaQuery = siswaQuery.eq('perusahaan_id', perusahaanFilter);
    }

    if (batchFilter) {
      siswaQuery = siswaQuery.eq('batch_id', batchFilter);
    }

    if (keberangkatanFilter === 'sudah') {
      siswaQuery = siswaQuery.not('tanggal_berangkat', 'is', null);
    } else if (keberangkatanFilter === 'belum') {
      siswaQuery = siswaQuery.is('tanggal_berangkat', null);
    }

    const { data, count, error } = await siswaQuery
      .order('id', { ascending: sortOrder === 'asc' })
      .range(from, to);

    if (error) return { error: error.message };
    
    const mappedData = (data || []).map(d => {
      if (!d) return null;
      const user = Array.isArray(d.users) ? d.users[0] : (d.users as any);
      const perusahaanObj = Array.isArray(d.perusahaan) ? d.perusahaan[0] : (d.perusahaan as any);
      return {
        id: user?.id || '',
        name: user?.name || 'Siswa',
        email: user?.email || '',
        phone: user?.phone || '',
        created_at: user?.created_at || null,
        siswa: {
          id: d.id || '',
          status_penempatan: d.status_penempatan || 'belum',
          status_pendidikan: d.status_pendidikan || 'aktif',
          perusahaan_id: d.perusahaan_id || null,
          batch_id: d.batch_id || null,
          batch: d.batch || null,
          tanggal_berangkat: d.tanggal_berangkat || null,
          kelas_id: d.kelas_id || null,
          master_kelas: d.master_kelas || null,
          perusahaan: perusahaanObj ? { nama: perusahaanObj.nama || '' } : null
        }
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    return { data: mappedData, total: count || 0, limit };
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: sortOrder === 'asc' })
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
      created_at: d.created_at || null,
      siswa: siswaObj ? {
        id: siswaObj.id || '',
        status_penempatan: siswaObj.status_penempatan || 'belum',
        status_pendidikan: siswaObj.status_pendidikan || 'aktif',
        perusahaan_id: siswaObj.perusahaan_id || null,
        batch_id: siswaObj.batch_id || null,
        batch: siswaObj.batch || null,
        tanggal_berangkat: siswaObj.tanggal_berangkat || null,
        kelas_id: siswaObj.kelas_id || null,
        master_kelas: siswaObj.master_kelas || null,
        perusahaan: perusahaanObj ? { nama: perusahaanObj.nama || '' } : null
      } : null
    };
  }).filter((item): item is NonNullable<typeof item> => item !== null);

  return { data: mappedData, total: count || 0, limit };
}

export async function assignSiswaPerusahaanAction(
  userId: string, 
  status: 'belum' | 'sudah', 
  perusahaanId?: string, 
  batchIdOrName?: string, 
  tanggal_berangkat?: string,
  kelas_id?: string
) {
  const updateData: any = { status_penempatan: status };
  
  if (kelas_id !== undefined) {
    updateData.kelas_id = kelas_id || null;
  }
  
  if (status === 'sudah' && perusahaanId) {
    updateData.perusahaan_id = perusahaanId;
  } else {
    updateData.perusahaan_id = null;
    updateData.batch_id = null;
    updateData.batch = null;
    updateData.tanggal_berangkat = null;
  }

  if (status === 'sudah' && batchIdOrName) {
    // Cek apakah batchIdOrName ini UUID (batch_id) atau nama_batch biasa
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(batchIdOrName);
    
    if (isUuid) {
      updateData.batch_id = batchIdOrName;
      // Ambil nama batch dan tgl berangkat dari perusahaan_batch jika ada
      const { data: batchData } = await supabaseAdmin
        .from('perusahaan_batch')
        .select('nama_batch, tanggal_berangkat')
        .eq('id', batchIdOrName)
        .single();

      if (batchData) {
        updateData.batch = batchData.nama_batch;
        if (!tanggal_berangkat && batchData.tanggal_berangkat) {
          updateData.tanggal_berangkat = batchData.tanggal_berangkat;
        }
      }
    } else {
      updateData.batch = batchIdOrName;
      updateData.batch_id = null;
    }
  }

  if (status === 'sudah' && tanggal_berangkat) {
    updateData.tanggal_berangkat = tanggal_berangkat;
  }

  const { error } = await supabaseAdmin
    .from('siswa')
    .update(updateData)
    .eq('user_id', userId);

  if (error) return { error: error.message };
  
  revalidatePath('/admin/siswa');
  revalidatePath('/admin/perusahaan');
  return { success: true };
}

export async function bulkSetKeberangkatanAction(userIds: string[], tanggal_berangkat: string | null) {
  if (!userIds || userIds.length === 0) return { error: 'Tidak ada siswa yang dipilih.' };

  const { error } = await supabaseAdmin
    .from('siswa')
    .update({ tanggal_berangkat: tanggal_berangkat || null })
    .in('user_id', userIds);

  if (error) return { error: error.message };
  
  revalidatePath('/admin/siswa');
  return { success: true };
}

export async function bulkSetKelasAction(userIds: string[], kelas_id: string | null) {
  if (!userIds || userIds.length === 0) return { error: 'Tidak ada siswa yang dipilih.' };

  const { error } = await supabaseAdmin
    .from('siswa')
    .update({ kelas_id: kelas_id || null })
    .in('user_id', userIds);

  if (error) return { error: error.message };
  
  revalidatePath('/admin/siswa');
  return { success: true };
}

export async function getSiswaByIdAction(id: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select(`
      id, name, email, phone,
      siswa ( status_penempatan, perusahaan_id, batch, tanggal_berangkat )
    `)
    .eq('id', id)
    .single();
    
  if (error) return { error: error.message };
  
  const siswaObj = Array.isArray(data.siswa) ? data.siswa[0] : (data.siswa as any);
  
  return { 
    data: {
      ...data,
      perusahaan_id: siswaObj?.perusahaan_id || '',
      batch: siswaObj?.batch || '',
      tanggal_berangkat: siswaObj?.tanggal_berangkat || '',
    } 
  };
}

export async function updateSiswaProfileAction(id: string, formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const password = formData.get('password') as string;
  
  const perusahaan_id = formData.get('perusahaan_id') as string;
  const batch = formData.get('batch') as string;
  const tanggal_berangkat = formData.get('tanggal_berangkat') as string;

  if (!name || !email) return { error: 'Nama dan Email wajib diisi.' };

  const updateData: any = { name, email, phone };
  
  if (password) {
    if (password.length < 6) return { error: 'Password minimal 6 karakter.' };
    const passwordHash = await hashPassword(password);
    updateData.password_hash = passwordHash;
    updateData.force_change_password = true; // Paksa siswa untuk ganti password saat login
  }

  const { error } = await supabaseAdmin.from('users').update(updateData).eq('id', id);
  if (error) {
    if (error.code === '23505') return { error: 'Email sudah digunakan oleh akun lain.' };
    return { error: error.message };
  }

  // Update perusahaan_id dan batch ke tabel siswa
  const updateSiswaData: any = {
    batch: batch || null,
    tanggal_berangkat: tanggal_berangkat || null,
  };
  
  if (perusahaan_id) {
    updateSiswaData.perusahaan_id = perusahaan_id;
    updateSiswaData.status_penempatan = 'sudah';
  } else {
    updateSiswaData.perusahaan_id = null;
    updateSiswaData.status_penempatan = 'belum';
  }
  
  await supabaseAdmin.from('siswa').update(updateSiswaData).eq('user_id', id);

  revalidatePath('/admin/siswa');
  return { success: true };
}

export async function getUnassignedSiswaAction(perusahaanId?: string, batchId?: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('siswa')
      .select(`
        id, user_id, perusahaan_id, batch_id, status_penempatan, batch,
        users!inner (id, name, email, status_registrasi, role)
      `)
      .eq('users.status_registrasi', 'approved')
      .eq('users.role', 'siswa');

    if (error) return { error: error.message };

    const available = (data || []).filter(s => {
      // Jangan tampilkan jika sudah ada di batch yang persis sama
      if (batchId && s.batch_id === batchId) return false;
      return true;
    });

    const mappedData = available.map(d => {
      const user = Array.isArray(d.users) ? d.users[0] : (d.users as any);
      const isSameCompanyUnbatched = Boolean(perusahaanId && d.perusahaan_id === perusahaanId && !d.batch_id);
      return {
        user_id: user?.id || '',
        name: user?.name || 'Siswa',
        email: user?.email || '',
        perusahaan_id: d.perusahaan_id,
        batch_id: d.batch_id,
        is_same_company_unbatched: isSameCompanyUnbatched
      };
    });

    // Prioritaskan siswa yang ada di perusahaan ini tapi belum punya batch ke paling atas
    mappedData.sort((a, b) => {
      if (a.is_same_company_unbatched && !b.is_same_company_unbatched) return -1;
      if (!a.is_same_company_unbatched && b.is_same_company_unbatched) return 1;
      return a.name.localeCompare(b.name);
    });

    return { data: mappedData };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function bulkAssignSiswaBatchAction(
  userIds: string[], 
  perusahaanId: string, 
  batchId: string
) {
  if (!userIds || userIds.length === 0) return { error: 'Tidak ada siswa yang dipilih.' };

  // Ambil data batch
  const { data: batchData } = await supabaseAdmin
    .from('perusahaan_batch')
    .select('nama_batch, tanggal_berangkat')
    .eq('id', batchId)
    .single();

  if (!batchData) return { error: 'Batch tidak ditemukan.' };

  const updateData = {
    status_penempatan: 'sudah',
    perusahaan_id: perusahaanId,
    batch_id: batchId,
    batch: batchData.nama_batch,
    tanggal_berangkat: batchData.tanggal_berangkat
  };

  const { error } = await supabaseAdmin
    .from('siswa')
    .update(updateData)
    .in('user_id', userIds);

  if (error) return { error: error.message };
  
  revalidatePath('/admin/siswa');
  revalidatePath('/admin/perusahaan');
  return { success: true };
}

export async function getPublicPerusahaanWithBatchesAction() {
  const { data: perusahaanList, error: pError } = await supabaseAdmin
    .from('perusahaan')
    .select('id, nama')
    .order('nama');

  if (pError) return { error: pError.message };

  const { data: batchList } = await supabaseAdmin
    .from('perusahaan_batch')
    .select('id, perusahaan_id, nama_batch, tanggal_berangkat')
    .order('created_at', { ascending: true });

  return { 
    perusahaan: perusahaanList || [],
    batches: batchList || []
  };
}


