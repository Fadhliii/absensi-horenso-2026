import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col justify-center items-center p-6 font-sans">
      <div className="max-w-3xl bg-white/80 backdrop-blur-lg p-10 md:p-14 rounded-[2rem] shadow-2xl text-center border border-white/60">
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl shadow-lg flex items-center justify-center transform rotate-3 hover:rotate-6 transition-transform duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-700 mb-6 tracking-tight leading-tight">
          Absensi Horenso
        </h1>
        <p className="text-lg md:text-xl text-slate-600 mb-10 leading-relaxed max-w-xl mx-auto font-medium">
          Platform absensi digital modern yang cepat, akurat, dan transparan. Terintegrasi dengan QR Code Dinamis dan validasi Geolocation.
        </p>
        <div className="flex justify-center">
          <Link 
            href="/login" 
            className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-full shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2">
              Masuk ke Sistem
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
            <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-indigo-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"></div>
          </Link>
        </div>
      </div>
      <div className="mt-12 text-sm text-slate-500 font-medium">
        &copy; {new Date().getFullYear()} Horenso. All rights reserved.
      </div>
    </div>
  );
}
