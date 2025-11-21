-- Rollback Migration 003: User Roles ENUM
-- Generated: 2025-10-10T12:07:49.605Z
-- Database: PostgreSQL (Supabase)
--
-- WARNING: This will drop the user_role ENUM type!
-- Make sure to migrate any data that depends on this type before running this rollback.

BEGIN;

-- Drop user_role ENUM type if it exists
DROP TYPE IF EXISTS user_role CASCADE;

COMMIT;
