
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lawaadzoxwufjbskafzu.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxhd2FhZHpveHd1Zmpic2thZnp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NTczMTUsImV4cCI6MjA3MzEzMzMxNX0.RFjSoHZOk4r3ioZwxs7a-ZOvsK9C5KcGlitcNm-Ovl0';

const supabase = createClient(SUPABASE_URL, ANON_KEY.trim());

async function run() {
  console.log('--- Fetching ALL tickets ---');
  const { data, error } = await supabase
    .from('support_cases')
    .select('*');

  if (error) {
      console.error('Error:', error.message);
      return;
  }
  
  console.log(`Found ${data.length} tickets.`);
  data.forEach(t => {
      console.log(`ID: ${t.id} | Status: ${t.status} | Title: ${t.title}`);
  });
}

run();
