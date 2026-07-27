import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET list of soft skill classes with attendance summary
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('kelas_soft_skill')
      .select('*, dibuat_oleh(name), absensi_soft_skill(status)')
      .order('tanggal', { ascending: false });

    if (error) {
      console.error('Error fetching soft skill classes:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formatted = (data || []).map((item: any) => {
      const absensi = item.absensi_soft_skill || [];
      const totalHadir = absensi.filter((a: any) => a.status === 'hadir').length;
      const totalTidakHadir = absensi.filter((a: any) => a.status === 'tidak_hadir').length;
      const totalIzinSakit = absensi.filter((a: any) => a.status === 'izin' || a.status === 'sakit').length;
      const totalTerdaftar = absensi.length;

      return {
        ...item,
        summary: {
          totalHadir,
          totalTidakHadir,
          totalIzinSakit,
          totalTerdaftar
        }
      };
    });

    return NextResponse.json({ data: formatted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST create a new soft skill class
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { judul_materi, pengisi_acara, tanggal, waktu_mulai, waktu_selesai, dibuat_oleh } = body;

    if (!judul_materi || !pengisi_acara || !tanggal || !waktu_mulai) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('kelas_soft_skill')
      .insert([
        {
          judul_materi,
          pengisi_acara,
          tanggal,
          waktu_mulai,
          waktu_selesai: waktu_selesai || null,
          dibuat_oleh,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating soft skill class:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
