-- ============================================================================
-- Rollback Migration 002: Security Policies
-- ============================================================================
-- Purpose: Remove all RLS policies and disable RLS
-- Created: 2025-10-06
-- Reverts: 002_security_policies.sql
-- Warning: This will remove all access control - use with caution!
-- ============================================================================

BEGIN;

RAISE NOTICE 'Rolling back Migration 002: Security Policies';

-- ----------------------------------------------------------------------------
-- DROP ALL POLICIES
-- ----------------------------------------------------------------------------

-- Users table policies
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_service_all" ON users;

-- Organization memberships policies
DROP POLICY IF EXISTS "org_memberships_select_own" ON organization_memberships;
DROP POLICY IF EXISTS "org_memberships_select_org_admin" ON organization_memberships;
DROP POLICY IF EXISTS "org_memberships_service_all" ON organization_memberships;

-- User preferences policies
DROP POLICY IF EXISTS "user_prefs_all_own" ON user_preferences;
DROP POLICY IF EXISTS "user_prefs_service_all" ON user_preferences;

-- ----------------------------------------------------------------------------
-- DISABLE ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- VERIFICATION
-- ----------------------------------------------------------------------------

DO $$
DECLARE
    v_policy_count INTEGER;
    v_rls_enabled_count INTEGER;
BEGIN
    -- Count remaining policies
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN ('users', 'organization_memberships', 'user_preferences');

    -- Check RLS status
    SELECT COUNT(*) INTO v_rls_enabled_count
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('users', 'organization_memberships', 'user_preferences')
    AND rowsecurity = true;

    -- Report results
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Rollback 002 completed successfully!';
    RAISE NOTICE 'RLS policies removed:';
    RAISE NOTICE '  - Remaining policies: % (expected 0)', v_policy_count;
    RAISE NOTICE '  - RLS enabled tables: % (expected 0)', v_rls_enabled_count;
    RAISE NOTICE '';
    RAISE WARNING 'WARNING: All access control has been removed!';
    RAISE WARNING 'Tables are now accessible without restrictions.';
    RAISE NOTICE '========================================';

    IF v_policy_count > 0 THEN
        RAISE WARNING 'Some policies still exist!';
    END IF;

    IF v_rls_enabled_count > 0 THEN
        RAISE WARNING 'RLS still enabled on some tables!';
    END IF;
END$$;

COMMIT;

RAISE NOTICE 'Rollback complete. You may now rollback Migration 001 if needed.';
