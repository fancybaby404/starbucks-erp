
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lawaadzoxwufjbskafzu.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxhd2FhZHpveHd1Zmpic2thZnp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NTczMTUsImV4cCI6MjA3MzEzMzMxNX0.RFjSoHZOk4r3ioZwxs7a-ZOvsK9C5KcGlitcNm-Ovl0';

const supabase = createClient(SUPABASE_URL, ANON_KEY.trim());

async function run() {
  const ticketId = 'cef6ad30-34ad-4360-9d90-75361e1a2a56';
  console.log(`--- Resolving Ticket ${ticketId} ---`);

  const { error } = await supabase
    .from('support_cases')
    .update({ status: 'resolved' })
    .eq('id', ticketId);

  if (error) console.error('Update failed:', error.message);
  else console.log('Update successful! Ticket should now be in Closed column.');
}

run();
