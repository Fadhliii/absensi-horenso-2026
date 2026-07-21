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

export async function getSiswaApprovedAction(page: number, search: string, statusFilter: string, perusahaanFilter: string = '') {
  const limit = 10;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabaseAdmin
    .from('users')
    .select(`
      id, name, email, phone,
      siswa ( id, status_penempatan, perusahaan_id, batch, tanggal_berangkat, perusahaan (nama) )
    `, { count: 'exact' })
    .eq('role', 'siswa')
    .eq('status_registrasi', 'approved');

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  // Next.js PostgREST filter on nested relation is a bit tricky, but we can filter by querying the joined table
  // However, Supabase (PostgREST) doesn't support easy nested filtering that affects the main row return.
  // Instead, if statusFilter is used OR perusahaanFilter is used, we can query `siswa` table directly and join `users`.
  
  if ((statusFilter && statusFilter !== 'semua') || perusahaanFilter) {
    let siswaQuery = supabaseAdmin
    .from('siswa')
      .select(`
        id, status_penempatan, perusahaan_id, batch, tanggal_berangkat, perusahaan (nama),
        users!inner (id, name, email, phone, status_registrasi, role)
      `, { count: 'exact' })
      .eq('users.status_registrasi', 'approved')
      .eq('users.role', 'siswa');

    if (statusFilter && statusFilter !== 'semua') {
      siswaQuery = siswaQuery.eq('status_penempatan', statusFilter);
    }

    if (search) {
      siswaQuery = siswaQuery.ilike('users.name', `%${search}%`);
    }

    if (perusahaanFilter) {
      siswaQuery = siswaQuery.eq('perusahaan_id', perusahaanFilter);
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
          batch: d.batch || null,
          tanggal_berangkat: d.tanggal_berangkat || null,
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
        batch: siswaObj.batch || null,
        tanggal_berangkat: siswaObj.tanggal_berangkat || null,
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
  tanggal_berangkat?: string
) {
  const updateData: any = { status_penempatan: status };
  
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

export async function getUnassignedSiswaAction() {
  const { data, error } = await supabaseAdmin
    .from('siswa')
    .select(`
      id, status_penempatan,
      users!inner (id, name, email)
    `)
    .eq('users.status_registrasi', 'approved')
    .eq('users.role', 'siswa')
    .eq('status_penempatan', 'belum');

  if (error) return { error: error.message };
  
  const mappedData = (data || []).map(d => {
    const user = Array.isArray(d.users) ? d.users[0] : (d.users as any);
    return {
      user_id: user?.id || '',
      name: user?.name || 'Siswa',
      email: user?.email || ''
    };
  });
  
  // Urutkan berdasarkan nama di client side atau js saja
  mappedData.sort((a, b) => a.name.localeCompare(b.name));
  
  return { data: mappedData };
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

