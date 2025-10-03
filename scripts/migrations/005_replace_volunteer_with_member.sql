-- Migration: Replace 'volunteer' role with 'member'
-- Purpose: Consolidate roles - use 'member' as the standard default role
-- Created: 2025-10-03
-- Depends on: 004_add_member_to_role_enum.sql (member must exist first)

-- Step 1: Update all users with 'volunteer' role to 'member'
UPDATE users
SET role = 'member'
WHERE role = 'volunteer';

-- Step 2: Remove 'volunteer' from the user_role ENUM
-- Note: PostgreSQL doesn't support DROP VALUE from ENUM directly
-- We need to use a workaround: create new ENUM, migrate, drop old one

-- Create new ENUM without 'volunteer'
CREATE TYPE user_role_new AS ENUM ('member', 'coordinator', 'admin', 'super_admin');

-- Alter the column to use the new ENUM type
ALTER TABLE users
  ALTER COLUMN role TYPE user_role_new
  USING role::text::user_role_new;

-- Drop the old ENUM type
DROP TYPE user_role;

-- Rename the new ENUM to the original name
ALTER TYPE user_role_new RENAME TO user_role;

-- Verify the migration
SELECT
  COUNT(*) as total_users,
  COUNT(CASE WHEN role = 'member' THEN 1 END) as member_count,
  COUNT(CASE WHEN role = 'coordinator' THEN 1 END) as coordinator_count,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
  COUNT(CASE WHEN role = 'super_admin' THEN 1 END) as super_admin_count
FROM users;

-- Show current allowed ENUM values
SELECT enumlabel as allowed_roles
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'user_role'
ORDER BY e.enumsortorder;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration complete: volunteer role replaced with member';
  RAISE NOTICE 'Allowed roles: member, coordinator, admin, super_admin';
END$$;
