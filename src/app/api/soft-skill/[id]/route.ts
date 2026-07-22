import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET soft skill class detail
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('kelas_soft_skill')
      .select('*, dibuat_oleh(name)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching soft skill class:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT update soft skill class
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { judul_materi, pengisi_acara, tanggal, waktu_mulai, waktu_selesai } = body;

    const { data, error } = await supabaseAdmin
      .from('kelas_soft_skill')
      .update({
        judul_materi,
        pengisi_acara,
        tanggal,
        waktu_mulai,
        waktu_selesai: waktu_selesai || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating soft skill class:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE soft skill class
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('kelas_soft_skill')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting soft skill class:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
