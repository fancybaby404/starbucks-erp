-- Enable pgcrypto if not already
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- RPC to create a user securely with hashed password
CREATE OR REPLACE FUNCTION create_employee(
  email TEXT,
  password TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'EMPLOYEE'
) RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Check if email exists
  IF EXISTS (SELECT 1 FROM _users WHERE _users.email = create_employee.email) THEN
    RAISE EXCEPTION 'Email already exists';
  END IF;

  INSERT INTO _users (email, password, full_name, role)
  VALUES (
    email,
    crypt(password, gen_salt('bf')),
    full_name,
    role
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
