-- Run this script in the Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Tables (Idempotent)
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone character varying,
  address text,
  city character varying,
  province character varying,
  zip_code character varying,
  country character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_new_customer boolean DEFAULT true,
  total_orders integer DEFAULT 0,
  total_spent numeric DEFAULT 0,
  user_id uuid REFERENCES public._users(id),
  is_active boolean DEFAULT true,
  is_deleted boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.support_cases (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id uuid REFERENCES public.customers(id),
  case_number character varying NOT NULL UNIQUE,
  title character varying NOT NULL,
  description text NOT NULL,
  status character varying DEFAULT 'open',
  priority character varying DEFAULT 'medium',
  category character varying DEFAULT 'general',
  assigned_to character varying,
  assigned_department character varying,
  resolution_time integer,
  sla_deadline timestamp with time zone,
  escalation_level integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid,
  agent_id uuid,
  status text DEFAULT 'Waiting',
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  metadata jsonb,
  last_message text,
  last_message_at timestamptz,
  last_message_sender text
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  sender_type text NOT NULL, 
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 2. CREATE LOGIN RPC (Secure Hashing)
CREATE OR REPLACE FUNCTION public.login_user(email_input text, password_input text)
RETURNS json AS $$
DECLARE
  found_user public._users;
BEGIN
  SELECT * INTO found_user FROM public._users WHERE email = email_input;
  
  IF found_user IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Verify Password Hash
  IF found_user.password = crypt(password_input, found_user.password) THEN
    RETURN json_build_object(
      'id', found_user.id,
      'email', found_user.email,
      'role', found_user.role,
      'full_name', concat(found_user.first_name, ' ', found_user.last_name)
    );
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. SEED USERS (Hashed Passwords)

-- 3. SEED USERS (Hashed Passwords)

DO $$
DECLARE 
  v_user_id uuid;
  v_cust_id uuid;
BEGIN
  -- 1. Admin
  INSERT INTO public._users (email, password, role, first_name, last_name)
  VALUES ('admin@starbucks.com', crypt('password', gen_salt('bf')), 'EMPLOYEE', 'System', 'Admin')
  ON CONFLICT (email) DO UPDATE 
  SET password = crypt('password', gen_salt('bf'));

  -- 2. Customer User
  INSERT INTO public._users (email, password, role, first_name, last_name)
  VALUES ('customer@gmail.com', crypt('password', gen_salt('bf')), 'CUSTOMER', 'Julian', 'Customer')
  ON CONFLICT (email) DO UPDATE 
  SET password = crypt('password', gen_salt('bf'));

  -- Get Customer ID safely
  SELECT id INTO v_user_id FROM public._users WHERE email = 'customer@gmail.com';

  -- Create Customer Profile (Check duplication by user_id)
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE user_id = v_user_id) THEN
    INSERT INTO public.customers (user_id, phone, address, city, country)
    VALUES (v_user_id, '555-0199', '123 Pike Place', 'Seattle', 'USA');
  END IF;

  -- 3. Additional Employees
  
  -- Sarah Connor
  INSERT INTO public._users (email, password, role, first_name, last_name)
  VALUES ('sarah.connor@starbucks.com', crypt('password', gen_salt('bf')), 'EMPLOYEE', 'Sarah', 'Connor')
  ON CONFLICT (email) DO UPDATE SET password = crypt('password', gen_salt('bf'));

  -- James Bond
  INSERT INTO public._users (email, password, role, first_name, last_name)
  VALUES ('james.bond@starbucks.com', crypt('password', gen_salt('bf')), 'EMPLOYEE', 'James', 'Bond')
  ON CONFLICT (email) DO UPDATE SET password = crypt('password', gen_salt('bf'));

  -- Nancy Drew
  INSERT INTO public._users (email, password, role, first_name, last_name)
  VALUES ('nancy.drew@starbucks.com', crypt('password', gen_salt('bf')), 'EMPLOYEE', 'Nancy', 'Drew')
  ON CONFLICT (email) DO UPDATE SET password = crypt('password', gen_salt('bf'));

  -- Sherlock Holmes
  INSERT INTO public._users (email, password, role, first_name, last_name)
  VALUES ('sherlock.holmes@starbucks.com', crypt('password', gen_salt('bf')), 'EMPLOYEE', 'Sherlock', 'Holmes')
  ON CONFLICT (email) DO UPDATE SET password = crypt('password', gen_salt('bf'));

  -- Tony Stark
  INSERT INTO public._users (email, password, role, first_name, last_name)
  VALUES ('tony.stark@starbucks.com', crypt('password', gen_salt('bf')), 'EMPLOYEE', 'Tony', 'Stark')
  ON CONFLICT (email) DO UPDATE SET password = crypt('password', gen_salt('bf'));

END $$;

-- 4. ENABLE RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE _users ENABLE ROW LEVEL SECURITY;

-- Allow RPC access (public)
GRANT EXECUTE ON FUNCTION public.login_user(text, text) TO anon, authenticated, service_role;

-- Policies (Permissive for demo)
DO $$
BEGIN
  CREATE POLICY "Enable all for customers" ON customers FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Enable all for support_cases" ON support_cases FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Enable all for _users" ON _users FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
