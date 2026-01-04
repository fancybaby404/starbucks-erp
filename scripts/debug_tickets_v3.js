
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lawaadzoxwufjbskafzu.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxhd2FhZHpveHd1Zmpic2thZnp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NTczMTUsImV4cCI6MjA3MzEzMzMxNX0.RFjSoHZOk4r3ioZwxs7a-ZOvsK9C5KcGlitcNm-Ovl0';

const supabase = createClient(SUPABASE_URL, ANON_KEY.trim());

async function run() {
  console.log('--- Checking table: support_cases ---');
  const { data: d1, error: e1 } = await supabase.from('support_cases').select('status, id').limit(10);
  if (e1) console.error('Error:', e1.message);
  else {
      console.log('Count:', d1.length);
      console.log('Statuses:', d1.map(t => t.status));
  }

  console.log('\n--- Checking table: supportCase ---');
  const { data: d2, error: e2 } = await supabase.from('supportCase').select('status, id').limit(10);
  if (e2) console.error('Error:', e2.message);
  else {
      console.log('Count:', d2.length);
      console.log('Statuses:', d2.map(t => t.status));
  }
  
  console.log('\n--- Checking table: "supportCase" (quoted) ---');
  // Supabase client might default to lowercase if not careful, passing strict string
  const { data: d3, error: e3 } = await supabase.from('"supportCase"').select('status, id').limit(10);
  if (e3) console.error('Error:', e3.message);
  else {
      console.log('Count:', d3.length);
      console.log('Statuses:', d3.map(t => t.status));
  }
}

run();
