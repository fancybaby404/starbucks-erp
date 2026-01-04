
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lawaadzoxwufjbskafzu.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxhd2FhZHpveHd1Zmpic2thZnp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NTczMTUsImV4cCI6MjA3MzEzMzMxNX0.RFjSoHZOk4r3ioZwxs7a-ZOvsK9C5KcGlitcNm-Ovl0';

const supabase = createClient(SUPABASE_URL, ANON_KEY.trim());

async function run() {
  // Use a partial match for the ID from the screenshot: "cef6ad30"
  console.log('--- Searching for ticket starting with "cef6ad30" ---');
  const { data, error } = await supabase
    .from('support_cases')
    .select('*')
    .ilike('id', 'cef6ad30%');

  if (error) {
      console.error('Error:', error.message);
      return;
  }
  
  if (data.length === 0) {
      console.log('No ticket found.');
  } else {
      console.log('Found Ticket:', data[0]);
      console.log('Current Status:', data[0].status);
  }
}

run();
