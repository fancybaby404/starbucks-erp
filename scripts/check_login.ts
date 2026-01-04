
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Load env vars
const envPath = path.resolve(process.cwd(), ".env.local");
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const SUPABASE_URL = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing keys");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function check() {
  console.log("Checking Admin User...");
  const { data, error } = await supabase
    .from('_users')
    .select('*')
    .eq('email', 'admin@starbucks.com')
    .single();

  if (error) {
    console.error("Connection/Query Error:", error.message);
    if (error.cause) console.error("Cause:", error.cause);
  } else {
    console.log("Success! Found User:", data.email);
    console.log("Password Matches 'admin123':", data.password === 'admin123');
  }
}

check();
