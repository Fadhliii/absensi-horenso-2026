import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET active students, their morning attendance, and soft skill attendance
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 1. Dapatkan detail kelas soft skill (untuk mengambil tanggal)
    const { data: classDetail, error: classError } = await supabaseAdmin
      .from('kelas_soft_skill')
      .select('id, tanggal')
      .eq('id', id)
      .single();

    if (classError || !classDetail) {
      return NextResponse.json({ error: 'Kelas Soft Skill tidak ditemukan' }, { status: 404 });
    }

    const classDateStr = classDetail.tanggal;

    // 2. Dapatkan daftar siswa aktif (belum berangkat ke Jepang)
    const { data: activeStudents, error: studentsError } = await supabaseAdmin
      .from('siswa')
      .select(`
        user_id, 
        status_penempatan, 
        perusahaan_id,
        batch_id,
        batch, 
        kelas_id,
        tanggal_berangkat, 
        users(name, email),
        master_kelas(nama_kelas),
        perusahaan(nama)
      `)
      .eq('status_penempatan', 'belum');

    if (studentsError) {
      console.error('Error fetching active students:', studentsError);
      return NextResponse.json({ error: studentsError.message }, { status: 500 });
    }

    // 3. Dapatkan data absensi pagi (QR scan) pada tanggal kelas ini
    const startOfDay = `${classDateStr}T00:00:00Z`;
    const endOfDay = `${classDateStr}T23:59:59Z`;

    const { data: morningAttendance } = await supabaseAdmin
      .from('absensi')
      .select('siswa_id, status')
      .gte('waktu_scan', startOfDay)
      .lte('waktu_scan', endOfDay);

    const morningMap = new Map<string, string>();
    morningAttendance?.forEach((rec: any) => {
      morningMap.set(rec.siswa_id, rec.status);
    });

    // 4. Dapatkan data absensi soft skill yang sudah tersimpan untuk kelas ini
    const { data: softSkillAttendance, error: attendanceError } = await supabaseAdmin
      .from('absensi_soft_skill')
      .select('*')
      .eq('kelas_id', id);

    if (attendanceError) {
      console.error('Error fetching attendance data:', attendanceError);
      return NextResponse.json({ error: attendanceError.message }, { status: 500 });
    }

    const attendanceMap = new Map();
    softSkillAttendance?.forEach((record: any) => {
      attendanceMap.set(record.siswa_id, record);
    });

    // 5. Gabungkan data
    const mergedList = activeStudents?.map((student: any) => {
      const savedRecord = attendanceMap.get(student.user_id);
      const morningStatus = morningMap.get(student.user_id);

      let computedStatus = 'belum_diabsen';

      if (savedRecord) {
        computedStatus = savedRecord.status;
      } else if (morningStatus === 'hadir' || morningStatus === 'telat') {
        // Otomatis default Hadir jika tadi pagi sudah scan QR!
        computedStatus = 'hadir';
      }

      const kelasObj = Array.isArray(student.master_kelas) ? student.master_kelas[0] : student.master_kelas;
      const perusahaanObj = Array.isArray(student.perusahaan) ? student.perusahaan[0] : student.perusahaan;

      return {
        siswa_id: student.user_id,
        name: student.users?.name || 'Siswa',
        kelas_id: student.kelas_id,
        nama_kelas: kelasObj?.nama_kelas || null,
        perusahaan_id: student.perusahaan_id,
        nama_perusahaan: perusahaanObj?.nama || null,
        batch_id: student.batch_id,
        batch: student.batch || null,
        status_absensi: computedStatus,
        status_pagi: morningStatus || 'alpha',
        waktu_absen: savedRecord ? savedRecord.waktu_absen : null,
      };
    });

    return NextResponse.json({ data: mergedList });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST save manual attendance (single or bulk array)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { siswa_id, siswa_ids, status, diabsen_oleh } = body;

    if (!status || (!siswa_id && (!siswa_ids || !Array.isArray(siswa_ids)))) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const idsToUpdate: string[] = siswa_ids && Array.isArray(siswa_ids) ? siswa_ids : [siswa_id];

    const recordsToUpsert = idsToUpdate.map((sId: string) => ({
      kelas_id: id,
      siswa_id: sId,
      status,
      waktu_absen: new Date().toISOString(),
      diabsen_oleh: diabsen_oleh || null,
    }));

    const { data, error } = await supabaseAdmin
      .from('absensi_soft_skill')
      .upsert(recordsToUpsert, { onConflict: 'kelas_id,siswa_id' })
      .select();

    if (error) {
      console.error('Error saving attendance:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
