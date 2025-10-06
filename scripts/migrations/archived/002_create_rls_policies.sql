-- Migration: Create Row Level Security policies
-- Purpose: Multi-tier access control for users, organizations, and preferences
-- Created: 2025-10-03
-- Depends on: 001_create_users_with_roles.sql

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_service_all" ON users;

-- Users can view their own profile
-- Uses Clerk JWT 'sub' claim to match clerk_id
CREATE POLICY "users_select_own" ON users
  FOR SELECT
  USING ((auth.jwt()->>'sub')::text = clerk_id);

-- Users can update their own profile (limited fields enforced by application logic)
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING ((auth.jwt()->>'sub')::text = clerk_id)
  WITH CHECK ((auth.jwt()->>'sub')::text = clerk_id);

-- Service role full access (for webhooks and admin operations)
CREATE POLICY "users_service_all" ON users
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- ORGANIZATION MEMBERSHIPS POLICIES
-- ============================================

DROP POLICY IF EXISTS "org_memberships_select_own" ON organization_memberships;
DROP POLICY IF EXISTS "org_memberships_select_org_admin" ON organization_memberships;
DROP POLICY IF EXISTS "org_memberships_service_all" ON organization_memberships;

-- Users can view their own organization memberships
CREATE POLICY "org_memberships_select_own" ON organization_memberships
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users
      WHERE clerk_id = (auth.jwt()->>'sub')::text
    )
  );

-- Admins can view all members in their organizations
-- This enables organization member directory features
CREATE POLICY "org_memberships_select_org_admin" ON organization_memberships
  FOR SELECT
  USING (
    clerk_org_id IN (
      SELECT clerk_org_id FROM organization_memberships
      WHERE user_id IN (
        SELECT id FROM users WHERE clerk_id = (auth.jwt()->>'sub')::text
      )
      AND clerk_org_role = 'org:admin'
    )
  );

-- Service role full access
CREATE POLICY "org_memberships_service_all" ON organization_memberships
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- USER PREFERENCES POLICIES
-- ============================================

DROP POLICY IF EXISTS "user_prefs_all_own" ON user_preferences;
DROP POLICY IF EXISTS "user_prefs_service_all" ON user_preferences;

-- Users can fully manage their own preferences (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "user_prefs_all_own" ON user_preferences
  FOR ALL
  USING (
    user_id IN (
      SELECT id FROM users
      WHERE clerk_id = (auth.jwt()->>'sub')::text
    )
  );

-- Service role full access
CREATE POLICY "user_prefs_service_all" ON user_preferences
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- POLICY DOCUMENTATION
-- ============================================

COMMENT ON POLICY "users_select_own" ON users IS
  'Users can view their own profile using Clerk JWT sub claim';

COMMENT ON POLICY "users_update_own" ON users IS
  'Users can update their own profile. Application logic restricts which fields can be modified.';

COMMENT ON POLICY "users_service_all" ON users IS
  'Service role (webhooks, admin) has unrestricted access to all user records';

COMMENT ON POLICY "org_memberships_select_own" ON organization_memberships IS
  'Users can view organizations they belong to';

COMMENT ON POLICY "org_memberships_select_org_admin" ON organization_memberships IS
  'Organization admins can view all members in their organizations';

COMMENT ON POLICY "user_prefs_all_own" ON user_preferences IS
  'Users have full CRUD access to their own preferences';
