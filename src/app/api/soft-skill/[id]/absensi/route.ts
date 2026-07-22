import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET active students and their attendance status for a specific soft skill class
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 1. Dapatkan daftar siswa aktif (belum berangkat)
    const { data: activeStudents, error: studentsError } = await supabaseAdmin
      .from('siswa')
      .select('user_id, status_penempatan, batch, tanggal_berangkat, users(name, email)')
      .eq('status_penempatan', 'belum');

    if (studentsError) {
      console.error('Error fetching active students:', studentsError);
      return NextResponse.json({ error: studentsError.message }, { status: 500 });
    }

    // 2. Dapatkan data absensi yang sudah tercatat untuk kelas ini
    const { data: attendanceData, error: attendanceError } = await supabaseAdmin
      .from('absensi_soft_skill')
      .select('*')
      .eq('kelas_id', id);

    if (attendanceError) {
      console.error('Error fetching attendance data:', attendanceError);
      return NextResponse.json({ error: attendanceError.message }, { status: 500 });
    }

    // 3. Gabungkan data
    const attendanceMap = new Map();
    attendanceData?.forEach((record: any) => {
      attendanceMap.set(record.siswa_id, record);
    });

    const mergedList = activeStudents?.map((student: any) => {
      const attendance = attendanceMap.get(student.user_id);
      return {
        siswa_id: student.user_id,
        name: student.users?.name,
        batch: student.batch,
        status_absensi: attendance ? attendance.status : 'belum_diabsen',
        waktu_absen: attendance ? attendance.waktu_absen : null,
      };
    });

    return NextResponse.json({ data: mergedList });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST save manual attendance
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { siswa_id, status, diabsen_oleh } = body;

    if (!siswa_id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('absensi_soft_skill')
      .upsert(
        {
          kelas_id: id,
          siswa_id,
          status,
          waktu_absen: new Date().toISOString(),
          diabsen_oleh,
        },
        { onConflict: 'kelas_id,siswa_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving attendance:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
