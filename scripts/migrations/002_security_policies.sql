-- ============================================================================
-- Migration 002: Security Policies - Row Level Security (RLS)
-- ============================================================================
-- Purpose: Multi-tier access control for users, organizations, and preferences
-- Created: 2025-10-06
-- Dependencies: 001_core_schema.sql
-- Version: 1.0
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- ENABLE ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- USERS TABLE POLICIES
-- ----------------------------------------------------------------------------

-- Drop existing policies (idempotency)
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_service_all" ON users;

-- Users can view their own profile
-- Uses Clerk JWT 'sub' claim (user ID) to match clerk_id column
-- Performance: SELECT wrapper ensures auth.jwt() evaluated once per query, not per row
CREATE POLICY "users_select_own" ON users
    FOR SELECT
    USING (((select auth.jwt())->>'sub')::text = clerk_id);

-- Users can update their own profile
-- WITH CHECK ensures users can only update their own record
-- Performance: SELECT wrapper ensures auth.jwt() evaluated once per query, not per row
CREATE POLICY "users_update_own" ON users
    FOR UPDATE
    USING (((select auth.jwt())->>'sub')::text = clerk_id)
    WITH CHECK (((select auth.jwt())->>'sub')::text = clerk_id);

-- Service role has full access (for webhooks and admin operations)
-- Service role is used by Supabase server-side operations
-- Performance: SELECT wrapper ensures auth.role() evaluated once per query, not per row
CREATE POLICY "users_service_all" ON users
    FOR ALL
    USING ((select auth.role()) = 'service_role');

-- ----------------------------------------------------------------------------
-- ORGANIZATION MEMBERSHIPS POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "org_memberships_select_own" ON organization_memberships;
DROP POLICY IF EXISTS "org_memberships_select_org_admin" ON organization_memberships;
DROP POLICY IF EXISTS "org_memberships_service_all" ON organization_memberships;

-- Users can view their own memberships
-- Matches user_id through users table using Clerk JWT
-- Performance: SELECT wrapper ensures auth.jwt() evaluated once per query, not per row
CREATE POLICY "org_memberships_select_own" ON organization_memberships
    FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM users
            WHERE clerk_id = ((select auth.jwt())->>'sub')::text
        )
    );

-- Org admins can view all members in their organizations
-- This enables organization member directory features
-- Admin role check: clerk_org_role = 'org:admin'
-- Performance: SELECT wrapper ensures auth.jwt() evaluated once per query, not per row
CREATE POLICY "org_memberships_select_org_admin" ON organization_memberships
    FOR SELECT
    USING (
        clerk_org_id IN (
            SELECT clerk_org_id FROM organization_memberships
            WHERE user_id IN (
                SELECT id FROM users
                WHERE clerk_id = ((select auth.jwt())->>'sub')::text
            )
            AND clerk_org_role = 'org:admin'
        )
    );

-- Service role has full access
-- Performance: SELECT wrapper ensures auth.role() evaluated once per query, not per row
CREATE POLICY "org_memberships_service_all" ON organization_memberships
    FOR ALL
    USING ((select auth.role()) = 'service_role');

-- ----------------------------------------------------------------------------
-- USER PREFERENCES POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "user_prefs_all_own" ON user_preferences;
DROP POLICY IF EXISTS "user_prefs_service_all" ON user_preferences;

-- Users can fully manage their own preferences (SELECT, INSERT, UPDATE, DELETE)
-- This is app-specific data not managed by Clerk
-- Performance: SELECT wrapper ensures auth.jwt() evaluated once per query, not per row
CREATE POLICY "user_prefs_all_own" ON user_preferences
    FOR ALL
    USING (
        user_id IN (
            SELECT id FROM users
            WHERE clerk_id = ((select auth.jwt())->>'sub')::text
        )
    );

-- Service role has full access
-- Performance: SELECT wrapper ensures auth.role() evaluated once per query, not per row
CREATE POLICY "user_prefs_service_all" ON user_preferences
    FOR ALL
    USING ((select auth.role()) = 'service_role');

-- ----------------------------------------------------------------------------
-- POLICY DOCUMENTATION
-- ----------------------------------------------------------------------------

COMMENT ON POLICY "users_select_own" ON users IS
    'Users can view their own profile using Clerk JWT sub claim';

COMMENT ON POLICY "users_update_own" ON users IS
    'Users can update their own profile. Application logic restricts modifiable fields.';

COMMENT ON POLICY "users_service_all" ON users IS
    'Service role (webhooks, admin) has unrestricted access to all user records';

COMMENT ON POLICY "org_memberships_select_own" ON organization_memberships IS
    'Users can view organizations they belong to';

COMMENT ON POLICY "org_memberships_select_org_admin" ON organization_memberships IS
    'Organization admins can view all members in their organizations';

COMMENT ON POLICY "org_memberships_service_all" ON organization_memberships IS
    'Service role has unrestricted access to all organization memberships';

COMMENT ON POLICY "user_prefs_all_own" ON user_preferences IS
    'Users have full CRUD access to their own preferences';

COMMENT ON POLICY "user_prefs_service_all" ON user_preferences IS
    'Service role has unrestricted access to all user preferences';

-- ----------------------------------------------------------------------------
-- VERIFICATION
-- ----------------------------------------------------------------------------

DO $$
DECLARE
    v_users_policies INTEGER;
    v_org_policies INTEGER;
    v_prefs_policies INTEGER;
    v_rls_enabled_count INTEGER;
BEGIN
    -- Count policies per table
    SELECT COUNT(*) INTO v_users_policies
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users';

    SELECT COUNT(*) INTO v_org_policies
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'organization_memberships';

    SELECT COUNT(*) INTO v_prefs_policies
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_preferences';

    -- Check RLS enabled
    SELECT COUNT(*) INTO v_rls_enabled_count
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('users', 'organization_memberships', 'user_preferences')
    AND rowsecurity = true;

    -- Report results
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 002 completed successfully!';
    RAISE NOTICE 'Row Level Security configured:';
    RAISE NOTICE '  - RLS enabled on % of 3 tables', v_rls_enabled_count;
    RAISE NOTICE '  - users: % policies (expected 3)', v_users_policies;
    RAISE NOTICE '  - organization_memberships: % policies (expected 3)', v_org_policies;
    RAISE NOTICE '  - user_preferences: % policies (expected 2)', v_prefs_policies;
    RAISE NOTICE '  - Total policies: %', v_users_policies + v_org_policies + v_prefs_policies;
    RAISE NOTICE '';
    RAISE NOTICE 'Security model:';
    RAISE NOTICE '  - Users can only access their own data';
    RAISE NOTICE '  - Org admins can view org members';
    RAISE NOTICE '  - Service role has full access';
    RAISE NOTICE '========================================';

    -- Warnings
    IF v_rls_enabled_count < 3 THEN
        RAISE WARNING 'RLS not enabled on all tables!';
    END IF;

    IF v_users_policies <> 3 OR v_org_policies <> 3 OR v_prefs_policies <> 2 THEN
        RAISE WARNING 'Unexpected policy count!';
    END IF;
END$$;

COMMIT;
