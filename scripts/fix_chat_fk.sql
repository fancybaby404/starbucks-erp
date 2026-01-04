-- Fix for FK Constraint Error: "Key is not present in table customer"
-- This redirects the foreign key from the old 'customer' table to the new 'customers' table.

DO $$
BEGIN
  -- 1. Drop the legacy constraint (which points to "customer")
  BEGIN
    ALTER TABLE public.chat_sessions DROP CONSTRAINT IF EXISTS "chat_sessions_customer_id_fkey";
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 2. Add the correct constraint (pointing to "customers")
  -- We assume customer_id in chat_sessions is UUID.
  BEGIN
    ALTER TABLE public.chat_sessions 
    ADD CONSTRAINT "chat_sessions_customer_id_fkey" 
    FOREIGN KEY (customer_id) 
    REFERENCES public.customers(id);
  EXCEPTION WHEN OTHERS THEN 
    RAISE NOTICE 'Could not add constraint, ensure data consistency first.';
  END;

END $$;
