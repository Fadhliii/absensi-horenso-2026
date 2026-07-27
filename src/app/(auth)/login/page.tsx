'use client';

import { useState, Suspense } from 'react';
import { loginAction } from '@/app/actions/auth';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import IndonesianClock from '@/components/IndonesianClock';
import { Eye, EyeOff } from 'lucide-react';

function LoginForm() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const pendingError = searchParams.get('error') === 'pending' ? 'Akun kamu sedang menunggu persetujuan admin.' : null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const result = await loginAction(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f4f0] p-4 font-sans">
      <div className="mb-6">
        <IndonesianClock />
      </div>
      
      <div className="max-w-md w-full bg-[#ffe600] neo-card neo-shadow-lg p-8">
        <div className="text-center mb-8 border-b-4 border-black pb-4">
          <h2 className="text-3xl font-black text-black uppercase tracking-tight">Login Absensi LPK</h2>
          <p className="text-xs text-black font-bold uppercase mt-1">Masuk ke akun Anda</p>
        </div>

        {(error || pendingError) && (
          <div className="bg-[#ff1744] text-white neo-border p-4 mb-6 text-xs font-black uppercase">
            ⚠️ {error || pendingError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-black uppercase mb-1">Email</label>
            <input 
              type="email" 
              name="email" 
              required
              className="w-full px-3.5 py-2.5 neo-input font-bold"
              placeholder="contoh@email.com"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-black uppercase mb-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                name="password" 
                required
                className="w-full px-3.5 py-2.5 pr-10 neo-input font-bold"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-black hover:text-gray-700 transition-colors"
                title={showPassword ? 'Sembunyikan Password' : 'Tampilkan Password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4 stroke-[2.5]" /> : <Eye className="w-4 h-4 stroke-[2.5]" />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#00f0ff] hover:bg-[#00d8e6] text-black font-black uppercase neo-btn py-3 text-sm shadow-md"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        <p className="text-center text-xs font-bold text-black uppercase mt-6">
          Belum punya akun? <Link href="/register" className="underline font-black hover:text-blue-700">Daftar sekarang</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f4f4f0] p-4 font-sans">
        <span className="font-black text-black uppercase animate-pulse">Memuat halaman...</span>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
