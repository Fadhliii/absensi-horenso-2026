import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import { SignJWT } from 'jose';

const QR_SECRET = new TextEncoder().encode(
  process.env.QR_SECRET_KEY || 'default_secret_key_for_development_only_123'
);

export async function POST(request: Request) {
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

    // 2. Ambil parameter dari body
    const body = await request.json();
    const { sessionId, interval } = body;

    if (!sessionId || !interval) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 3. Generate QR Token (Stateless)
    // Token ini hanya valid selama X detik (interval) dari sekarang
    const expTime = Math.floor(Date.now() / 1000) + parseInt(interval);
    
    const qrToken = await new SignJWT({ sessionId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expTime)
      .sign(QR_SECRET);

    return NextResponse.json({ token: qrToken, expiredAt: expTime * 1000 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
