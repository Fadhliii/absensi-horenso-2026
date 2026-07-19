import { createClient } from '@supabase/supabase-js';

// Initialize lazily to ensure process.env is fully populated (e.g., if env vars are loaded late or missing at boot)
let adminClientInstance: ReturnType<typeof createClient> | null = null;

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient>, {
  get: (target, prop) => {
    if (!adminClientInstance) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!url || !key) {
        console.warn('Warning: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing at runtime.');
      }
      
      adminClientInstance = createClient(
        url || 'https://placeholder.supabase.co', 
        key || 'placeholder-key', 
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );
    }
    return (adminClientInstance as any)[prop];
  }
});
