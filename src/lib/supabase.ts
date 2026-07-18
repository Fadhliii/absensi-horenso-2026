import { createClient } from '@supabase/supabase-js';

// Menggunakan placeholder agar next build tidak error saat env variables kosong
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-build-only.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key-build-only';

// Instance Supabase standard
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
