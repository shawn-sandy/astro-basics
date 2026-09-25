-- Rollback: rollback_007_data_api_grants.sql
-- Created: 2026-09-25
-- Purpose: Rollback migration 007_data_api_grants.sql
--
-- WARNING: Afterwards anon, authenticated and service_role have no privileges on
--          these tables, and the app gets 42501 "permission denied". Automatic
--          grants that 007 replaced are not restored: restoring them means
--          GRANT ALL, which lets users set their own role again. No data is touched.

BEGIN;

-- Also removes the column-level UPDATE grants
REVOKE ALL
    ON users, organization_memberships, user_preferences
    FROM anon, authenticated, service_role;

DO $$
BEGIN
    IF to_regclass('public.schema_migrations') IS NOT NULL THEN
        DELETE FROM schema_migrations WHERE version = '007';
    END IF;
END $$;

COMMIT;
