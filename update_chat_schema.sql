-- Add columns for Last Message feature to avoid N+1 queries
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS last_message text;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS last_message_at timestamptz;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS last_message_sender text; -- 'agent', 'customer', 'system'

-- Optional: Backfill existing sessions (basic approximation)
-- UPDATE chat_sessions 
-- SET last_message = (SELECT content FROM chat_messages WHERE session_id = chat_sessions.id ORDER BY created_at DESC LIMIT 1),
--     last_message_at = (SELECT created_at FROM chat_messages WHERE session_id = chat_sessions.id ORDER BY created_at DESC LIMIT 1);
