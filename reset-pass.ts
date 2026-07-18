import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log("Fetching users from Supabase...");

  // Get Admin
  const { data: adminData, error: adminError } = await supabase
    .from('users')
    .select('id, email, name, role')
    .eq('role', 'admin')
    .limit(1)
    .single();

  if (adminError) {
    console.error("Error fetching admin:", adminError.message);
  } else if (adminData) {
    console.log(`Found Admin: ${adminData.email} (${adminData.name})`);
    
    // Reset password
    const { error: updateError } = await supabase.auth.admin.updateUserById(adminData.id, {
      password: 'password123'
    });
    
    if (updateError) {
      console.error("Failed to reset admin password:", updateError.message);
    } else {
      console.log(`✅ Admin password reset to 'password123'`);
    }
  }

  // Get Student
  const { data: studentData, error: studentError } = await supabase
    .from('users')
    .select('id, email, name, role')
    .eq('role', 'siswa')
    .limit(1)
    .single();

  if (studentError) {
    console.error("Error fetching student:", studentError.message);
  } else if (studentData) {
    console.log(`Found Student: ${studentData.email} (${studentData.name})`);
    
    // Reset password
    const { error: updateError } = await supabase.auth.admin.updateUserById(studentData.id, {
      password: 'password123'
    });
    
    if (updateError) {
      console.error("Failed to reset student password:", updateError.message);
    } else {
      console.log(`✅ Student password reset to 'password123'`);
    }
  }
}

main().catch(console.error);
