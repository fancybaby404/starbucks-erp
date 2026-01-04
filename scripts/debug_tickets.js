
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lawaadzoxwufjbskafzu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzU1NzMxNSwiZXhwIjoyMDczMTMzMzE1fQ.nBuHL30zMuQWjLdjf9hSMiFuKstqSiWTyTKGZxLwKho';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY.trim());

async function checkTickets() {
  console.log('Checking tickets with Service Role (Bypassing RLS)...');
  
  const { data, error } = await supabase
    .from('support_cases')
    .select('status, id, title');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total Tickets: ${data.length}`);
  
  const statusCounts = {};
  data.forEach(t => {
    const s = t.status || 'NULL';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });

  console.log('Status Counts:', statusCounts);
}

checkTickets();
