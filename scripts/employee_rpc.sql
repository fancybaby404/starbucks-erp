-- RPC to delete employee
CREATE OR REPLACE FUNCTION delete_employee(user_id uuid)
RETURNS void AS $$
BEGIN
  DELETE FROM _users WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
