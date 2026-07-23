import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Baca cookie sesi
  const token = request.cookies.get('session')?.value;
  let session = null;

  if (token) {
    session = await verifySessionToken(token);
  }

  // Rute Publik yang tidak boleh diakses jika sudah login
  const isAuthRoute = pathname === '/login' || pathname === '/register';

  if (isAuthRoute && session) {
    if (session.role === 'admin' || session.role === 'instruktur') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    if (session.role === 'siswa') return NextResponse.redirect(new URL('/siswa/dashboard', request.url));
  }

  // Jika tidak ada sesi tapi mencoba akses halaman yang dilindungi
  const isProtectedRoute = pathname.startsWith('/admin') || pathname.startsWith('/siswa') || pathname === '/ganti-password';
  const isPublicSesi = pathname === '/admin/sesi/aktif' || /^\/admin\/sesi\/[a-zA-Z0-9-]+$/.test(pathname);
  
  if (isProtectedRoute && !session && !isPublicSesi) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (session) {
    // 1. Pengecekan status pending/rejected (Bypass untuk ganti password)
    if (session.status !== 'approved' && session.role !== 'admin' && pathname !== '/ganti-password') {
      // Jika masih pending dan mencoba masuk dashboard, tendang ke login dengan query error
      return NextResponse.redirect(new URL('/login?error=pending', request.url));
    }

    // 2. Pengecekan pemaksaan ganti password
    if (session.forceChangePassword && pathname !== '/ganti-password') {
      // Hanya boleh akses /ganti-password
      return NextResponse.redirect(new URL('/ganti-password', request.url));
    }

    // 3. Pengecekan hak akses admin & instruktur (keduanya boleh akses /admin)
    if (pathname.startsWith('/admin') && session.role !== 'admin' && session.role !== 'instruktur' && !isPublicSesi) {
      return NextResponse.redirect(new URL('/siswa/dashboard', request.url));
    }

    // 3b. Restriksi Instruktur ke halaman admin tertentu
    if (session.role === 'instruktur') {
      const forbiddenForInstruktur = ['/admin/siswa', '/admin/perusahaan', '/admin/approval'];
      if (forbiddenForInstruktur.some(route => pathname.startsWith(route))) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
    }

    // 4. Pengecekan hak akses siswa
    if (pathname.startsWith('/siswa') && session.role !== 'siswa') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }

    // 5. Mencegah akses ke ganti-password jika tidak diwajibkan
    if (pathname === '/ganti-password' && !session.forceChangePassword) {
      if (session.role === 'admin' || session.role === 'instruktur') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
      return NextResponse.redirect(new URL('/siswa/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/siswa/:path*',
    '/login',
    '/register',
    '/ganti-password',
  ],
};
