-- Rollback: rollback_005_migration_tracking.sql
-- Created: 2025-11-21
-- Purpose: Rollback migration 005_migration_tracking.sql
--
-- WARNING: This will remove the migration tracking table and all history
--          of applied migrations. This does NOT rollback the actual migrations
--          themselves - it only removes the tracking system.
--
-- This is a SAFE rollback - it removes only the tracking system, not your data.

BEGIN;

-- ============================================================================
-- DROP MIGRATION TRACKING TABLE
-- ============================================================================

-- Drop the schema_migrations table if it exists
DROP TABLE IF EXISTS schema_migrations CASCADE;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    -- Verify table no longer exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'schema_migrations'
    ) THEN
        RAISE NOTICE '✅ Rollback 005 completed successfully';
        RAISE NOTICE '   - schema_migrations table removed';
        RAISE NOTICE '   - Migration tracking is now disabled';
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  NOTE: This only removed the tracking system';
        RAISE NOTICE '   Your actual data tables are unchanged';
    ELSE
        RAISE EXCEPTION '❌ Rollback 005 verification failed: schema_migrations still exists';
    END IF;
END $$;

COMMIT;
