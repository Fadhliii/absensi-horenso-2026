import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. Autentikasi Admin
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const session = await verifySessionToken(token);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Ambil Parameter Filter
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate'); // format: YYYY-MM-DD
    const endDate = searchParams.get('endDate');
    const statusPenempatan = searchParams.get('statusPenempatan'); // 'semua', 'belum', 'sudah'
    const perusahaanId = searchParams.get('perusahaanId');

    // 3. Bangun Query ke Database
    // Join tabel absensi -> users -> siswa -> perusahaan
    let query = supabase
      .from('absensi')
      .select(`
        waktu_scan,
        status,
        jarak_meter,
        lokasi_lat,
        lokasi_lng,
        users!inner (
          name,
          siswa!inner (
            status_penempatan,
            perusahaan (nama)
          )
        )
      `)
      .order('waktu_scan', { ascending: false });

    // Filter Tanggal
    if (startDate) {
      // Mulai dari 00:00:00 hari tersebut
      query = query.gte('waktu_scan', `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      // Sampai 23:59:59 hari tersebut
      query = query.lte('waktu_scan', `${endDate}T23:59:59.999Z`);
    }

    // Filter Penempatan
    if (statusPenempatan && statusPenempatan !== 'semua') {
      query = query.eq('users.siswa.status_penempatan', statusPenempatan);
    }
    if (perusahaanId && statusPenempatan === 'sudah') {
      query = query.eq('users.siswa.perusahaan_id', perusahaanId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // 4. Generate Excel Menggunakan ExcelJS
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Admin Absensi LPK';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Laporan Absensi');

    // Format Header
    sheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Nama Siswa', key: 'nama', width: 25 },
      { header: 'Status Penempatan', key: 'penempatan', width: 20 },
      { header: 'Nama Perusahaan', key: 'perusahaan', width: 30 },
      { header: 'Tanggal Scan', key: 'tanggal', width: 15 },
      { header: 'Jam Scan', key: 'jam', width: 15 },
      { header: 'Status Kehadiran', key: 'status', width: 18 },
      { header: 'Jarak (Meter)', key: 'jarak', width: 15 },
      { header: 'Koordinat GPS', key: 'gps', width: 25 },
    ];

    // Styling Header Row
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0070C0' }
    };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Masukkan Data
    data?.forEach((row: any, index: number) => {
      const dateObj = new Date(row.waktu_scan);
      
      const formatTanggal = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const formatJam = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      const perusahaanNama = row.users.siswa.perusahaan ? row.users.siswa.perusahaan.nama : '-';
      const penempatan = row.users.siswa.status_penempatan === 'sudah' ? 'Sudah Ditempatkan' : 'Belum Ditempatkan';
      
      let statusFormat = row.status;
      if (statusFormat === 'hadir') statusFormat = 'Hadir';
      else if (statusFormat === 'telat') statusFormat = 'Telat';
      else if (statusFormat === 'ditolak_lokasi') statusFormat = 'Luar Radius (Ditolak)';
      else if (statusFormat === 'ditolak_expired') statusFormat = 'QR Kadaluarsa (Ditolak)';

      sheet.addRow({
        no: index + 1,
        nama: row.users.name,
        penempatan: penempatan,
        perusahaan: perusahaanNama,
        tanggal: formatTanggal,
        jam: formatJam,
        status: statusFormat,
        jarak: row.jarak_meter,
        gps: `${row.lokasi_lat}, ${row.lokasi_lng}`
      });
    });

    // Write ke dalam buffer memory
    const buffer = await workbook.xlsx.writeBuffer();

    // 5. Kembalikan Stream sebagai File Unduhan
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Laporan_Absensi_${new Date().toISOString().slice(0,10)}.xlsx"`,
      },
    });

  } catch (error: any) {
    console.error('Export Error:', error);
    return NextResponse.json({ error: 'Gagal mengunduh laporan' }, { status: 500 });
  }
}
