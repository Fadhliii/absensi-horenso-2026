import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    const { data, error, count } = await supabase
        .from('perusahaan')
        .select('*', { count: 'exact', head: false });
        
    if (error) {
        console.error('Error fetching perusahaan:', error);
    } else {
        console.log(`Found ${count} records in perusahaan table.`);
        console.log(data);
    }
}

checkData();
