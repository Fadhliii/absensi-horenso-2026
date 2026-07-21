-- Skema Database untuk Sistem Absensi LPK (Supabase)
-- Menghapus tabel dan tipe data lama jika ada (untuk reset saat development)
DROP TABLE IF EXISTS absensi CASCADE;
DROP TABLE IF EXISTS sesi_absensi CASCADE;
DROP TABLE IF EXISTS siswa CASCADE;
DROP TABLE IF EXISTS perusahaan CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS status_registrasi CASCADE;
DROP TYPE IF EXISTS status_penempatan CASCADE;
DROP TYPE IF EXISTS status_sesi CASCADE;
DROP TYPE IF EXISTS status_absensi CASCADE;

-- 1. Buat ENUM untuk tipe data
CREATE TYPE user_role AS ENUM ('admin', 'siswa');
CREATE TYPE status_registrasi AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE status_penempatan AS ENUM ('belum', 'sudah');
CREATE TYPE status_sesi AS ENUM ('aktif', 'selesai');
CREATE TYPE status_absensi AS ENUM ('hadir', 'telat', 'ditolak_lokasi', 'ditolak_expired');

-- 2. Tabel users (Master Pengguna)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'siswa',
    status_registrasi status_registrasi NOT NULL DEFAULT 'pending',
    force_change_password BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabel perusahaan (Data Mitra)
CREATE TABLE perusahaan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    alamat TEXT,
    kontak VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabel perusahaan_batch (Master Batch/Angkatan Perusahaan)
CREATE TABLE perusahaan_batch (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    perusahaan_id UUID NOT NULL REFERENCES perusahaan(id) ON DELETE CASCADE,
    nama_batch VARCHAR(100) NOT NULL,
    tanggal_berangkat DATE,
    kuota INTEGER DEFAULT 0,
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabel siswa (Data Spesifik Siswa)
CREATE TABLE siswa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE, -- Relasi 1-to-1
    status_penempatan status_penempatan NOT NULL DEFAULT 'belum',
    perusahaan_id UUID REFERENCES perusahaan(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES perusahaan_batch(id) ON DELETE SET NULL,
    batch VARCHAR(50),
    tanggal_berangkat DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabel sesi_absensi (Sesi Absensi / Kelas)
CREATE TABLE sesi_absensi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dibuat_oleh UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lokasi_lat DOUBLE PRECISION NOT NULL,
    lokasi_lng DOUBLE PRECISION NOT NULL,
    radius_meter INTEGER NOT NULL DEFAULT 50,
    interval_qr_detik INTEGER NOT NULL DEFAULT 10,
    status status_sesi NOT NULL DEFAULT 'aktif',
    dibuat_pada TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabel absensi (Data Kehadiran)
CREATE TABLE absensi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    siswa_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sesi_id UUID NOT NULL REFERENCES sesi_absensi(id) ON DELETE CASCADE,
    waktu_scan TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    lat_siswa DOUBLE PRECISION NOT NULL,
    lng_siswa DOUBLE PRECISION NOT NULL,
    jarak_meter DOUBLE PRECISION NOT NULL,
    status status_absensi NOT NULL,
    UNIQUE(siswa_id, sesi_id) -- Mencegah siswa absen lebih dari 1 kali di sesi yang sama
);

-- (Opsional) Tambahkan RLS (Row Level Security) jika dibutuhkan nanti
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 7. Database Indexes untuk Optimasi Performa Query
CREATE INDEX IF NOT EXISTS idx_absensi_waktu_scan ON absensi(waktu_scan DESC);
CREATE INDEX IF NOT EXISTS idx_absensi_sesi_id ON absensi(sesi_id);
CREATE INDEX IF NOT EXISTS idx_siswa_perusahaan_id ON siswa(perusahaan_id);
CREATE INDEX IF NOT EXISTS idx_users_status_role ON users(status_registrasi, role);

