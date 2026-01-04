
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lawaadzoxwufjbskafzu.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxhd2FhZHpveHd1Zmpic2thZnp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NTczMTUsImV4cCI6MjA3MzEzMzMxNX0.RFjSoHZOk4r3ioZwxs7a-ZOvsK9C5KcGlitcNm-Ovl0';

const supabase = createClient(SUPABASE_URL, ANON_KEY.trim());

async function run() {
  console.log('--- Manually Resolving Ticket cef6ad30... ---');
  
  // 1. Get full ID
  const { data: tickets } = await supabase.from('support_cases').select('id').ilike('id', 'cef6ad30%');
  if (!tickets || tickets.length === 0) {
      console.error('Ticket not found.');
      return;
  }
  const id = tickets[0].id;
  console.log('Full ID:', id);

  // 2. Update to 'resolved'
  const { error } = await supabase
    .from('support_cases')
    .update({ status: 'resolved' })
    .eq('id', id);

  if (error) console.error('Update failed:', error.message);
  else console.log('Update successful! Ticket should now be in Closed column.');
}

run();
