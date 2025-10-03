-- Migration: Add role column to users table
-- Purpose: Sync user-level roles from Clerk publicMetadata.role
-- Created: 2025-10-03
-- Depends on: 001_create_users_with_roles.sql

-- Add role column to users table with default value 'member'
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role text DEFAULT 'member' NOT NULL;

-- Add check constraint for common role values (can be extended)
ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('member', 'volunteer', 'coordinator', 'admin', 'super_admin'));

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Add helpful comment
COMMENT ON COLUMN users.role IS 'User-level role synced from Clerk publicMetadata.role. Defaults to "member" for new users.';

-- Backfill existing users with default role 'member'
UPDATE users
SET role = 'member'
WHERE role IS NULL;

-- Note: After running this migration, update Clerk session claims to include:
-- "role": "{{user.public_metadata.role}}"
-- This enables the role to be available in session tokens for RLS policies.
