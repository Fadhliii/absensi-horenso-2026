import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Adding tanggal_berangkat...");
  // Note: Anon key usually cannot run DDL like ALTER TABLE through the standard REST API
  // unless we use RPC. But if we can't, we can just use the Service Role key or direct PG connection.
}

run();
