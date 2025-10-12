-- ============================================================================
-- Rollback Migration 001: Core Schema
-- ============================================================================
-- Purpose: Drop all tables, types, and functions
-- Created: 2025-10-06
-- Reverts: 001_core_schema.sql
-- Warning: This will delete ALL data - use with extreme caution!
-- Prerequisite: Must run rollback_002_security_policies.sql first
-- ============================================================================

BEGIN;

RAISE NOTICE 'Rolling back Migration 001: Core Schema';
RAISE WARNING 'This will DELETE ALL DATA from users, organization_memberships, and user_preferences tables!';

-- ----------------------------------------------------------------------------
-- VERIFY RLS IS DISABLED
-- ----------------------------------------------------------------------------

DO $$
DECLARE
    v_rls_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_rls_count
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('users', 'organization_memberships', 'user_preferences')
    AND rowsecurity = true;

    IF v_rls_count > 0 THEN
        RAISE EXCEPTION 'RLS is still enabled! Run rollback_002_security_policies.sql first';
    END IF;
END$$;

-- ----------------------------------------------------------------------------
-- DROP INDEXES
-- ----------------------------------------------------------------------------

-- Drop email uniqueness constraint (added in consolidated migration)
DROP INDEX IF EXISTS idx_users_email_unique;

-- ----------------------------------------------------------------------------
-- DROP TRIGGERS
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS users_updated_at ON users;
DROP TRIGGER IF EXISTS org_memberships_updated_at ON organization_memberships;
DROP TRIGGER IF EXISTS user_preferences_updated_at ON user_preferences;

-- ----------------------------------------------------------------------------
-- DROP TABLES (CASCADE will drop dependent objects)
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS organization_memberships CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ----------------------------------------------------------------------------
-- DROP TYPES
-- ----------------------------------------------------------------------------

DROP TYPE IF EXISTS user_role CASCADE;

-- ----------------------------------------------------------------------------
-- DROP FUNCTIONS
-- ----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

-- ----------------------------------------------------------------------------
-- VERIFICATION
-- ----------------------------------------------------------------------------

DO $$
DECLARE
    v_table_count INTEGER;
    v_type_exists BOOLEAN;
    v_function_exists BOOLEAN;
BEGIN
    -- Check tables
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('users', 'organization_memberships', 'user_preferences');

    -- Check type
    SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'user_role'
    ) INTO v_type_exists;

    -- Check function
    SELECT EXISTS (
        SELECT 1 FROM pg_proc
        JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
        WHERE pg_namespace.nspname = 'public'
        AND pg_proc.proname = 'update_updated_at'
    ) INTO v_function_exists;

    -- Report results
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Rollback 001 completed successfully!';
    RAISE NOTICE 'Database objects removed:';
    RAISE NOTICE '  - Remaining tables: % (expected 0)', v_table_count;
    RAISE NOTICE '  - user_role type exists: % (expected false)', v_type_exists;
    RAISE NOTICE '  - update_updated_at function exists: % (expected false)', v_function_exists;
    RAISE NOTICE '';
    RAISE NOTICE 'Database state:';
    RAISE NOTICE '  - All user data deleted';
    RAISE NOTICE '  - All organization memberships deleted';
    RAISE NOTICE '  - All user preferences deleted';
    RAISE NOTICE '  - Schema completely removed';
    RAISE NOTICE '========================================';

    IF v_table_count > 0 THEN
        RAISE WARNING 'Some tables still exist!';
    END IF;

    IF v_type_exists THEN
        RAISE WARNING 'user_role type still exists!';
    END IF;

    IF v_function_exists THEN
        RAISE WARNING 'update_updated_at function still exists!';
    END IF;
END$$;

COMMIT;

RAISE NOTICE '';
RAISE NOTICE 'Complete rollback finished. Database is now in pre-migration state.';
RAISE NOTICE 'You can now re-apply migrations if needed.';
