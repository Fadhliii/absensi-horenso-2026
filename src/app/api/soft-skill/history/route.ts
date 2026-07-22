import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const siswaId = searchParams.get('siswa_id');

    let query = supabaseAdmin
      .from('absensi_soft_skill')
      .select('*, kelas:kelas_id(*)');

    if (siswaId) {
      query = query.eq('siswa_id', siswaId);
    }

    const { data, error } = await query.order('waktu_absen', { ascending: false });

    if (error) {
      console.error('Error fetching soft skill history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
