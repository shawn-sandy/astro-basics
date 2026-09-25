-- Rollback: rollback_006_messages.sql
-- Created: 2026-09-25
-- Purpose: Rollback migration 006_messages.sql
--
-- WARNING: This DESTROYS DATA. Dropping the messages table removes every
--          contact-form submission stored in it. Back it up first:
--            pg_dump "$DATABASE_URL" --table=messages > messages-backup.sql
--
-- The contact form and /dashboard/messages stop working after this rollback.

BEGIN;

-- ============================================================================
-- DROP MESSAGES TABLE
-- ============================================================================

DROP TRIGGER IF EXISTS messages_updated_at ON messages;

DROP TABLE IF EXISTS messages CASCADE;

-- The update_updated_at() function is shared with 001_core_schema.sql, so it
-- is deliberately left in place.

-- ============================================================================
-- MIGRATION TRACKING
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'schema_migrations'
    ) THEN
        DELETE FROM schema_migrations WHERE version = '006';
    END IF;
END$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'messages'
    ) THEN
        RAISE NOTICE '✅ Rollback 006 completed successfully';
        RAISE NOTICE '   - messages table removed';
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  The contact form and /dashboard/messages no longer work';
    ELSE
        RAISE EXCEPTION '❌ Rollback 006 verification failed: messages table still exists';
    END IF;
END $$;

COMMIT;
