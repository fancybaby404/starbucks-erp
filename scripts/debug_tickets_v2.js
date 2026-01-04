
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lawaadzoxwufjbskafzu.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzU1NzMxNSwiZXhwIjoyMDczMTMzMzE1fQ.nBuHL30zMuQWjLdjf9hSMiFuKstqSiWTyTKGZxLwKho';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxhd2FhZHpveHd1Zmpic2thZnp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NTczMTUsImV4cCI6MjA3MzEzMzMxNX0.RFjSoHZOk4r3ioZwxs7a-ZOvsK9C5KcGlitcNm-Ovl0';

async function run() {
  console.log('--- Testing Service Role Key ---');
  const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY.trim());
  const { data: d1, error: e1 } = await serviceClient.from('support_cases').select('status').limit(5);
  if (e1) console.error('Service Key Error:', e1.message);
  else console.log('Service Key Success. Count:', d1.length);

  console.log('\n--- Testing Anon Key ---');
  const anonClient = createClient(SUPABASE_URL, ANON_KEY.trim());
  const { data: d2, error: e2 } = await anonClient.from('support_cases').select('status').limit(5);
  if (e2) console.error('Anon Key Error:', e2.message);
  else console.log('Anon Key Success. Count:', d2.length);
}

run();
