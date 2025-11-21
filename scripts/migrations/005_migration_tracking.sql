-- Migration: 005_migration_tracking.sql
-- Created: 2025-11-21
-- Purpose: Add migration tracking table to record which migrations have been applied
--
-- Dependencies: None (standalone feature)
-- Rollback: rollback_005_migration_tracking.sql
--
-- This migration creates a system table to track applied migrations,
-- preventing duplicate applications and providing visibility into database state.

BEGIN;

-- ============================================================================
-- MIGRATION TRACKING TABLE
-- ============================================================================

-- Create schema_migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,                    -- Migration version (e.g., '001', '002')
    name TEXT NOT NULL,                           -- Descriptive name (e.g., 'core_schema')
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- When migration was applied
    checksum TEXT,                                 -- Optional: Migration file checksum for verification
    execution_time_ms INTEGER,                     -- Optional: How long migration took to run
    applied_by TEXT DEFAULT CURRENT_USER          -- Who applied the migration
);

-- Add comment for documentation
COMMENT ON TABLE schema_migrations IS 'Tracks which database migrations have been applied';
COMMENT ON COLUMN schema_migrations.version IS 'Migration version number (e.g., ''001'')';
COMMENT ON COLUMN schema_migrations.name IS 'Descriptive name of the migration';
COMMENT ON COLUMN schema_migrations.applied_at IS 'Timestamp when migration was applied';
COMMENT ON COLUMN schema_migrations.checksum IS 'Optional checksum of migration file for integrity verification';
COMMENT ON COLUMN schema_migrations.execution_time_ms IS 'Optional execution time in milliseconds';
COMMENT ON COLUMN schema_migrations.applied_by IS 'Database user who applied the migration';

-- Create index for querying by applied date
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at
ON schema_migrations(applied_at DESC);

-- ============================================================================
-- SEED WITH CURRENTLY APPLIED MIGRATIONS
-- ============================================================================

-- Insert records for migrations that should already be applied
-- These are idempotent - will not create duplicates
INSERT INTO schema_migrations (version, name, applied_at)
VALUES
    ('001', 'core_schema', NOW()),
    ('002', 'security_policies', NOW())
ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- RECORD THIS MIGRATION
-- ============================================================================

-- Record that this migration has been applied
INSERT INTO schema_migrations (version, name)
VALUES ('005', 'migration_tracking')
ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    migration_count INTEGER;
BEGIN
    -- Check that table exists and has expected records
    SELECT COUNT(*) INTO migration_count
    FROM schema_migrations;

    IF migration_count >= 3 THEN
        RAISE NOTICE '✅ Migration 005 completed successfully';
        RAISE NOTICE '   - schema_migrations table created';
        RAISE NOTICE '   - Seeded with % existing migration(s)', migration_count;
        RAISE NOTICE '   - Migration tracking is now active';
    ELSE
        RAISE EXCEPTION '❌ Migration 005 verification failed: Expected at least 3 records, found %', migration_count;
    END IF;
END $$;

COMMIT;
