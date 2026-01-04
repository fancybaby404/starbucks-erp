
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Load env vars from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const SUPABASE_URL = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function seed() {
  console.log("Seeding data...");

  // 1. Seed Admin User
  const adminEmail = "admin@starbucks.com";
  let adminUserId = "";

  const { data: existingAdmin } = await supabase
    .from("_users")
    .select("id")
    .eq("email", adminEmail)
    .single();

  if (existingAdmin) {
    console.log("Admin user already exists.");
    adminUserId = existingAdmin.id;
  } else {
    const { data: newAdmin, error: adminError } = await supabase
      .from("_users")
      .insert({
        email: adminEmail,
        password: "admin123",
        role: "EMPLOYEE",
        first_name: "System",
        last_name: "Admin",
      })
      .select("id")
      .single();

    if (adminError) {
      console.error("Error creating admin:", JSON.stringify(adminError, null, 2));
      return;
    }
    console.log("Created Name: System Admin");
    adminUserId = newAdmin.id;
  }

  // 2. Seed Customer User
  const customerEmail = "customer@gmail.com";
  let customerUserId = "";

  const { data: existingUser } = await supabase
    .from("_users")
    .select("id")
    .eq("email", customerEmail)
    .single();

  if (existingUser) {
    console.log("Customer user already exists.");
    customerUserId = existingUser.id;
  } else {
    const { data: newUser, error: userError } = await supabase
      .from("_users")
      .insert({
        email: customerEmail,
        password: "123456",
        role: "CUSTOMER",
        first_name: "Julian",
        last_name: "Customer",
      })
      .select("id")
      .single();

    if (userError) {
      console.error("Error creating customer user:", userError);
      return;
    }
    console.log("Created Customer User: Julian Customer");
    customerUserId = newUser.id;
  }

  // 3. Seed Customer Profile (linked to User)
  let customerProfileId = "";
  // Check if profile exists by user_id
  const { data: existingProfile } = await supabase
    .from("customers")
    .select("id")
    .eq("user_id", customerUserId)
    .single();

  if (existingProfile) {
    console.log("Customer profile already exists.");
    customerProfileId = existingProfile.id;
  } else {
    const { data: newProfile, error: profileError } = await supabase
      .from("customers")
      .insert({
        user_id: customerUserId,
        phone: "555-0100",
        address: "123 Coffee Lane",
        city: "Seattle",
        country: "USA",
      })
      .select("id")
      .single();

    if (profileError) {
      console.error("Error creating customer profile:", profileError);
      return;
    }
    console.log("Created Customer Profile");
    customerProfileId = newProfile.id;
  }

  // 4. Seed Support Cases
  const { count } = await supabase
    .from("support_cases")
    .select("*", { count: "exact" });

  if (count === 0) {
    console.log("Seeding support cases...");
    const cases = [
      {
        customer_id: customerProfileId,
        case_number: "CASE-001",
        title: "Order not received",
        description: "I ordered a coffee 2 hours ago and it hasn't arrived.",
        status: "open",
        priority: "high",
        category: "logistics",
        created_at: new Date().toISOString(),
      },
      {
        customer_id: customerProfileId,
        case_number: "CASE-002",
        title: "Wrong item delivered",
        description: "I received a tea instead of a coffee.",
        status: "resolved",
        priority: "medium",
        category: "general",
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    const { error: casesError } = await supabase.from("support_cases").insert(cases);
    if (casesError) {
      console.error("Error creating cases:", casesError);
    } else {
      console.log("Seeded support cases.");
    }
  } else {
    console.log("Support cases already exist.");
  }
}

seed().catch(console.error);
