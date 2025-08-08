-- Rollback: Create messages table
-- Created: 2025-08-08

-- Drop indexes
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_messages_is_read;
DROP INDEX IF EXISTS idx_messages_email;

-- Drop table
DROP TABLE IF EXISTS messages;