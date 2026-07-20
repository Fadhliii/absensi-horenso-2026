import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import Link from 'next/link';

export default async function AktifSessionRedirectPage() {
  // Check auth
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) redirect('/');
  const session = await verifySessionToken(token);
  if (!session || session.role !== 'admin') redirect('/');

  // Find active session
  const { data, error } = await supabase
    .from('sesi_absensi')
    .select('id')
    .eq('status', 'aktif')
    .order('dibuat_pada', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-xl shadow-xl max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-white mb-4">Tidak Ada Sesi Aktif</h1>
          <p className="text-gray-400 mb-6">
            Saat ini tidak ada kelas/sesi absensi yang sedang dibuka.
          </p>
          <Link 
            href="/admin/dashboard"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Redirect to the active session ID page
  redirect(`/admin/sesi/${data.id}`);
}
