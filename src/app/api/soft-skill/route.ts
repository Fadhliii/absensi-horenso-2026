import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET list of soft skill classes
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('kelas_soft_skill')
      .select('*, dibuat_oleh(name)')
      .order('tanggal', { ascending: false });

    if (error) {
      console.error('Error fetching soft skill classes:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
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
