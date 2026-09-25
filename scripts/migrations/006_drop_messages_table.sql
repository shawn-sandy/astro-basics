-- ============================================================================
-- Migration 006: Drop Messages Table
-- ============================================================================
-- Purpose: Remove the messages table. The contact form no longer stores
--          submissions; it only sends a notification email, and the dashboard
--          inbox that read this table has been removed.
-- Created: 2026-09-25
-- Dependencies: None. Safe on databases that never had a messages table.
--               005_migration_tracking.sql is optional; when present this
--               migration records itself in schema_migrations.
-- Rollback: None. IRREVERSIBLE - every stored message is permanently deleted.
--           Export the table first if you need to keep its contents:
--           psql $DATABASE_URL -c "\copy messages TO 'messages-backup.csv' CSV HEADER"
-- Version: 1.0
-- ============================================================================

BEGIN;

-- CASCADE also removes the table's indexes, triggers and RLS policies
DROP TABLE IF EXISTS messages CASCADE;

-- ----------------------------------------------------------------------------
-- MIGRATION TRACKING
-- ----------------------------------------------------------------------------

DO $$
BEGIN
    IF to_regclass('public.schema_migrations') IS NOT NULL THEN
        INSERT INTO schema_migrations (version, name)
        VALUES ('006', 'drop_messages_table')
        ON CONFLICT (version) DO NOTHING;
    ELSE
        RAISE NOTICE 'schema_migrations not found (005 not applied); skipping tracking record';
    END IF;
END$$;

-- ----------------------------------------------------------------------------
-- VERIFICATION
-- ----------------------------------------------------------------------------

DO $$
BEGIN
    IF to_regclass('public.messages') IS NOT NULL THEN
        RAISE EXCEPTION 'Migration 006 verification failed: messages table still exists';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 006 completed successfully!';
    RAISE NOTICE '  - messages table removed (with its indexes, triggers and policies)';
    RAISE NOTICE '========================================';
END$$;

COMMIT;
