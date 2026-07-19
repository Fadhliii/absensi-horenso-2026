import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-build-only.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-build-only-key';

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
