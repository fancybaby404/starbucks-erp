-- Add last_seen column to _users
ALTER TABLE _users ADD COLUMN IF NOT EXISTS last_seen timestamptz DEFAULT now();

-- Create function to update presence
CREATE OR REPLACE FUNCTION update_last_seen(user_email text)
RETURNS void AS $$
BEGIN
  UPDATE _users 
  SET last_seen = now()
  WHERE email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;