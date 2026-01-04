-- 1. Add full_name column if it doesn't exist
ALTER TABLE public._users ADD COLUMN IF NOT EXISTS full_name text;

-- 2. Backfill full_name from existing first/last names
-- (Safe update: only if full_name is empty)
UPDATE public._users 
SET full_name = TRIM(BOTH FROM COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
WHERE (full_name IS NULL OR full_name = '') 
  AND (first_name IS NOT NULL OR last_name IS NOT NULL);

-- 3. Update the RPC to insert into standard fields as well
CREATE OR REPLACE FUNCTION create_employee(
  email TEXT,
  password TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'EMPLOYEE'
) RETURNS UUID AS $$
DECLARE
  new_id UUID;
  v_first_name TEXT;
  v_last_name TEXT;
BEGIN
  -- Check if email exists
  IF EXISTS (SELECT 1 FROM _users WHERE _users.email = create_employee.email) THEN
    RAISE EXCEPTION 'Email already exists';
  END IF;

  -- Simple Split for compatibility (First word = First Name, Rest = Last Name)
  v_first_name := split_part(full_name, ' ', 1);
  v_last_name := NULLIF(substring(full_name from length(v_first_name) + 2), '');

  -- Insert with all fields
  INSERT INTO _users (email, password, full_name, first_name, last_name, role)
  VALUES (
    email,
    crypt(password, gen_salt('bf')),
    full_name,
    v_first_name,
    v_last_name,
    role
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
