-- Run this script in Supabase SQL Editor to populate Self-Service (Articles) and Chat Data

-- 1. Create 'articles' table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.articles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  category text,
  content text,
  tags text[], -- Array of strings
  status text DEFAULT 'Published',
  helpfulness_score integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  author_id uuid, -- Optional link to _users
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
-- Policy
DO $$
BEGIN
    CREATE POLICY "Enable read access for all users" ON public.articles FOR SELECT USING (true);
    CREATE POLICY "Enable insert for authenticated users only" ON public.articles FOR INSERT WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- 2. Seed Articles (Self-Service Content)
INSERT INTO public.articles (title, category, content, tags, helpfulness_score)
VALUES 
('How to Reset Your Password', 'Account', 'To reset your password, go to settings...', ARRAY['account', 'security'], 150),
('Starbucks Rewards Tier Benefits', 'Rewards', 'Green level gets free refills. Gold level gets double stars...', ARRAY['rewards', 'gold'], 342),
('Mobile Order & Pay Troubleshooting', 'App Support', 'If your order does not go through, check your connectivity...', ARRAY['app', 'mobile'], 89),
('Nutritional Information Guide', 'Menu', 'You can view nutritional info for any drink on our app...', ARRAY['health', 'menu'], 210),
('Refund Policy for Mobile Orders', 'Orders', 'Refunds can be processed within 24 hours of purchase...', ARRAY['refund', 'policy'], 55);


-- 3. Ensure Chat Schema matches requirements
-- (The table might exist from an older migration without these columns)
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.chat_sessions ADD COLUMN last_message text;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE public.chat_sessions ADD COLUMN last_message_at timestamptz;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.chat_sessions ADD COLUMN last_message_sender text;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
END $$;

-- 4. Seed Chat Sessions (for Agent Dashboard)
-- We need some customer IDs. Let's try to fetch one or insert dummy ones if needed.
-- Since this is SQL, we have to be careful about IDs. 
-- We'll insert a dummy customer-less session or use known IDs if possible.

DO $$
DECLARE
  v_agent_id uuid;
  v_session_id uuid;
BEGIN
  -- Simple Active Session
  INSERT INTO public.chat_sessions (status, last_message, last_message_sender, last_message_at)
  VALUES ('Active', 'I need help with my order', 'customer', now())
  RETURNING id INTO v_session_id;

  INSERT INTO public.chat_messages (session_id, sender_type, content)
  VALUES 
  (v_session_id, 'customer', 'Hi, are you there?'),
  (v_session_id, 'system', 'An agent will be with you shortly.'),
  (v_session_id, 'customer', 'I need help with my order');

  -- Waiting Session
  INSERT INTO public.chat_sessions (status, last_message, last_message_sender, last_message_at)
  VALUES ('Waiting', 'Where is my gift card?', 'customer', now() - interval '5 minutes');

END $$;
