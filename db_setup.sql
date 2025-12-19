-- SQL Setup Script for Starbucks Helpdesk Integration

-- 1. Create CUSTOMER table first (referenced by others)
CREATE TABLE IF NOT EXISTS "customer" (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  name text,
  contact_info text,
  email text,
  customer_id text, -- Legacy string ID support
  loyalty_level text DEFAULT 'Green',
  points_balance integer DEFAULT 0,
  favorite_item text,
  preferences jsonb DEFAULT '{}'::jsonb
);

-- 2. Create supportCase table (Note: Case-sensitive name)
CREATE TABLE IF NOT EXISTS "supportCase" (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  title text,
  case_description text,
  priority text DEFAULT 'Medium',
  status text DEFAULT 'Open',
  channel text DEFAULT 'email',
  customer_id uuid REFERENCES "customer"(id), 
  assignee text,
  assigned_team text DEFAULT 'General',
  sla_policy_id uuid,
  sla_due_at timestamptz,
  sla_breached boolean DEFAULT false,
  internal_notes text,
  resolution_date timestamptz DEFAULT now()
);

-- 3. Create case_notes table
CREATE TABLE IF NOT EXISTS case_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid REFERENCES "supportCase"(id) ON DELETE CASCADE,
  text text NOT NULL,
  at timestamptz DEFAULT now(),
  internal boolean DEFAULT true,
  author_id uuid
);

-- 4. Create sla_rules table
CREATE TABLE IF NOT EXISTS sla_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  condition_field text,
  condition_value text,
  response_mins integer DEFAULT 60,
  resolution_mins integer DEFAULT 480
);

-- 5. Create articles table (Self-Service)
CREATE TABLE IF NOT EXISTS articles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  category text,
  content text, 
  tags text[],
  status text DEFAULT 'Draft',
  helpfulness_score integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  author_id uuid
);

-- 6. Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES "customer"(id),
  agent_id uuid,
  status text DEFAULT 'Waiting',
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  metadata jsonb
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender_type text NOT NULL, 
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 7. Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb,
  actor_id text,
  created_at timestamptz DEFAULT now()
);

-- 8. Create _users table (Custom Auth)
CREATE TABLE IF NOT EXISTS _users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  full_name text, -- Added for agent names
  role text NOT NULL DEFAULT 'CUSTOMER',
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Ensure full_name exists if table was created previously without it
ALTER TABLE _users ADD COLUMN IF NOT EXISTS full_name text;

-- 9. Enable RLS and Policies
-- (Using a DO block to safely ignore duplicate policies)
DO $$ 
BEGIN 
  -- Enable RLS
  ALTER TABLE "supportCase" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "customer" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE case_notes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE sla_rules ENABLE ROW LEVEL SECURITY;
  ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
  ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
  ALTER TABLE _users ENABLE ROW LEVEL SECURITY;

  -- Create Policies (Drop first to ensure clean state if re-run)
  BEGIN DROP POLICY IF EXISTS "Public enable all" ON "supportCase"; EXCEPTION WHEN undefined_object THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Public enable all" ON "customer"; EXCEPTION WHEN undefined_object THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Public enable all" ON case_notes; EXCEPTION WHEN undefined_object THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Public enable all" ON sla_rules; EXCEPTION WHEN undefined_object THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Public enable all" ON articles; EXCEPTION WHEN undefined_object THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Public enable all" ON chat_sessions; EXCEPTION WHEN undefined_object THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Public enable all" ON chat_messages; EXCEPTION WHEN undefined_object THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Public enable all" ON audit_log; EXCEPTION WHEN undefined_object THEN NULL; END;
  BEGIN DROP POLICY IF EXISTS "Public enable all" ON _users; EXCEPTION WHEN undefined_object THEN NULL; END;

  -- Re-create Policies
  BEGIN CREATE POLICY "Public enable all" ON "supportCase" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Public enable all" ON "customer" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Public enable all" ON case_notes FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Public enable all" ON sla_rules FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Public enable all" ON articles FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Public enable all" ON chat_sessions FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Public enable all" ON chat_messages FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Public enable all" ON audit_log FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Public enable all" ON _users FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 10. Seed Initial Users
-- 10. Seed Initial Users
INSERT INTO _users (email, password, role, full_name)
SELECT 'admin@starbucks.com', 'admin123', 'EMPLOYEE', 'System Admin'
WHERE NOT EXISTS (SELECT 1 FROM _users WHERE email = 'admin@starbucks.com');

INSERT INTO _users (email, password, role, full_name)
SELECT 'customer@gmail.com', '123456', 'CUSTOMER', 'Guest Customer'
WHERE NOT EXISTS (SELECT 1 FROM _users WHERE email = 'customer@gmail.com');

-- Seed 5 Agents
INSERT INTO _users (email, password, role, full_name) VALUES
('sarah.connor@starbucks.com', 'pass123', 'EMPLOYEE', 'Sarah Connor'),
('james.bond@starbucks.com', 'pass123', 'EMPLOYEE', 'James Bond'),
('nancy.drew@starbucks.com', 'pass123', 'EMPLOYEE', 'Nancy Drew'),
('sherlock.holmes@starbucks.com', 'pass123', 'EMPLOYEE', 'Sherlock Holmes'),
('tony.stark@starbucks.com', 'pass123', 'EMPLOYEE', 'Tony Stark')
ON CONFLICT (email) DO NOTHING;

-- 11. Seed SLA Rules and Articles
-- Clear existing to avoid duplicates if re-run (optional, be careful in prod)
DELETE FROM articles WHERE title IN (
  'Getting Started with Starbucks Rewards',
  'Mobile Order & Pay',
  'Nutritional Information',
  'Payment Options',
  'Starbucks Card Balance',
  'Troubleshooting App Issues',
  'Find a Store',
  'Our Coffee Roasts',
  'Vegan & Dairy-Free Options',
  'Understanding Our SLA Policy'
);

INSERT INTO articles (title, category, content, status, tags, helpfulness_score) VALUES
('Getting Started with Starbucks Rewards', 'Rewards', 'Join Starbucks Rewards to earn Stars for free food and drinks, any way you pay. Get access to mobile ordering, a birthday sensation, and more.', 'Published', ARRAY['rewards', 'stars', 'mobile app'], 150),
('Mobile Order & Pay', 'Ordering', 'Order ahead and pick up at your local participating store. You can customize your order just the way you like it.', 'Published', ARRAY['mobile', 'app', 'ordering'], 120),
('Nutritional Information', 'Menu', 'We are committed to transparency. You can find nutritional information for all our beverages and food items on our website and app.', 'Published', ARRAY['nutrition', 'calories', 'ingredients'], 85),
('Payment Options', 'Payments', 'We accept Starbucks Cards, credit/debit cards, Apple Pay, Google Pay, and PayPal app. You can also pay with cash in-store.', 'Published', ARRAY['payment', 'credit card', 'cash'], 95),
('Starbucks Card Balance', 'Rewards', 'Check your balance in the Starbucks app or online. You can also ask a barista to check it for you.', 'Published', ARRAY['balance', 'card', 'gift card'], 110),
('Troubleshooting App Issues', 'Technical', 'If you are experiencing issues with the app, try updating to the latest version, clearing cache, or reinstalling.', 'Published', ARRAY['app', 'bug', 'troubleshoot'], 60),
('Find a Store', 'Locations', 'Use our Store Locator to find the nearest Starbucks, check hours, and see available amenities.', 'Published', ARRAY['store', 'location', 'hours'], 130),
('Our Coffee Roasts', 'Menu', 'Explore our Blonde, Medium, and Dark roasts. Each roast has a unique flavor profile to suit your preference.', 'Published', ARRAY['coffee', 'roast', 'blonde', 'dark'], 75),
('Vegan & Dairy-Free Options', 'Menu', 'We offer almond, coconut, oat, and soy milk. Many of our food items are also vegan-friendly.', 'Published', ARRAY['vegan', 'dairy-free', 'milk'], 140),
('Understanding Our SLA Policy', 'Policy', '# Service Level Agreement (SLA)\n\nAt Starbucks Support, we prioritize your inquiries based on urgency.\n\n### Response Times\n\n* **High Priority**: within 1 hour\n* **Medium Priority**: within 4 hours\n* **Low Priority**: within 24 hours\n\n### Resolution Goals\n\nWe aim to resolve all issues within 48 hours. If we miss a deadline, your ticket is automatically escalated to a supervisor.\n\n### How we track it\n\nOur system automatically calculates a "Due Date" for every ticket. You can check the status of your ticket at any time to see if it is on track.', 'Published', ARRAY['sla', 'policy', 'response time'], 200);
