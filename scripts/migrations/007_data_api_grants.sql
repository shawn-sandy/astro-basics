-- Migration: 007_data_api_grants.sql
-- Created: 2026-09-25
-- Purpose: Grant the Data API roles the table privileges the app uses, so it
--          works on Supabase projects without automatic grants
--
-- Dependencies: 001_core_schema.sql, 002_security_policies.sql
-- Rollback: rollback_007_data_api_grants.sql
--
-- Supabase used to grant select/insert/update/delete on every new public table
-- to anon, authenticated and service_role. With "Automatically expose new tables
-- and functions" off (default for new projects from 2026-05-30, all projects from
-- 2026-10-30) nothing is granted, and every role gets 42501 "permission denied".
-- service_role too: it bypasses RLS, not table privileges. RLS (002) still
-- decides which rows a role sees; these grants decide whether it can reach the
-- table at all.
--
-- Grants follow what src/ does:
--   service_role  - Clerk webhook, user sync, role guard (getSupabaseServiceRole).
--                   Full DML; integration tests and scripts also delete users.
--   authenticated - /api/user/profile and /api/user/profile-with-org (Clerk JWT):
--                   read own profile with preferences and memberships, update
--                   profile fields and preferences. UPDATE is per column so a
--                   user cannot change their own role, clerk_id or email.
--   anon          - nothing. No code reads these tables without a Clerk JWT.
--
-- Everything is revoked first, so projects that still have automatic grants end
-- with the same privileges on these tables. Those grants include table-wide UPDATE on users, which lets
-- a signed-in user set their own role through the Data API.

BEGIN;

REVOKE ALL
    ON users, organization_memberships, user_preferences
    FROM anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
    ON users, organization_memberships, user_preferences
    TO service_role;

GRANT SELECT ON users, organization_memberships, user_preferences TO authenticated;

GRANT UPDATE (username, full_name, avatar_url, app_metadata) ON users TO authenticated;

GRANT UPDATE (theme, notifications_email, notifications_push, language, timezone)
    ON user_preferences
    TO authenticated;

-- Record this migration when tracking (005) is installed
DO $$
BEGIN
    IF to_regclass('public.schema_migrations') IS NOT NULL THEN
        INSERT INTO schema_migrations (version, name)
        VALUES ('007', 'data_api_grants')
        ON CONFLICT (version) DO NOTHING;
    END IF;
END $$;

COMMIT;
