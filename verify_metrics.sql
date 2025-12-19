
-- 1. Insert some tickets with various created_at times for Volume Chart
-- Current time is assumed to be NOW()

-- 5 tickets in the last hour
INSERT INTO "supportCase" (title, case_description, status, priority, created_at, customer_id)
SELECT 'Vol Test 1', 'Test Description', 'Open', 'Medium', NOW() - interval '10 minutes', id FROM customer LIMIT 1;
INSERT INTO "supportCase" (title, case_description, status, priority, created_at, customer_id)
SELECT 'Vol Test 2', 'Test Description', 'Open', 'Low', NOW() - interval '20 minutes', id FROM customer LIMIT 1;
INSERT INTO "supportCase" (title, case_description, status, priority, created_at, customer_id)
SELECT 'Vol Test 3', 'Test Description', 'Open', 'Medium', NOW() - interval '30 minutes', id FROM customer LIMIT 1;
INSERT INTO "supportCase" (title, case_description, status, priority, created_at, customer_id)
SELECT 'Vol Test 4', 'Test Description', 'Open', 'High', NOW() - interval '40 minutes', id FROM customer LIMIT 1;
INSERT INTO "supportCase" (title, case_description, status, priority, created_at, customer_id)
SELECT 'Vol Test 5', 'Test Description', 'Open', 'Medium', NOW() - interval '50 minutes', id FROM customer LIMIT 1;

-- 3 tickets 5 hours ago
INSERT INTO "supportCase" (title, case_description, status, priority, created_at, customer_id)
SELECT 'Vol Test 6', 'Test Description', 'Open', 'Medium', NOW() - interval '5 hours', id FROM customer LIMIT 1;
INSERT INTO "supportCase" (title, case_description, status, priority, created_at, customer_id)
SELECT 'Vol Test 7', 'Test Description', 'Open', 'Medium', NOW() - interval '5 hours 10 minutes', id FROM customer LIMIT 1;
INSERT INTO "supportCase" (title, case_description, status, priority, created_at, customer_id)
SELECT 'Vol Test 8', 'Test Description', 'Open', 'Medium', NOW() - interval '5 hours 20 minutes', id FROM customer LIMIT 1;

-- 1 Urgent Ticket (High Priority)
INSERT INTO "supportCase" (title, case_description, status, priority, created_at, customer_id)
SELECT 'Urgent Test Ticket', 'Urgent Description', 'Open', 'High', NOW(), id FROM customer LIMIT 1;

-- 1 SLA Breached Ticket
INSERT INTO "supportCase" (title, case_description, status, priority, created_at, customer_id, sla_breached)
SELECT 'SLA Breach Test', 'SLA Description', 'Open', 'Medium', NOW() - interval '2 days', id, true FROM customer LIMIT 1;

-- Active Chat Session for Online Agents
-- Ensure an agent exists first
DO $$
DECLARE
  agent_id_val uuid;
BEGIN
  SELECT id INTO agent_id_val FROM _users WHERE role = 'EMPLOYEE' LIMIT 1;
  IF agent_id_val IS NOT NULL THEN
    INSERT INTO chat_sessions (customer_id, agent_id, status, started_at)
    SELECT id, agent_id_val, 'Active', NOW() FROM customer LIMIT 1;
  END IF;
END $$;
