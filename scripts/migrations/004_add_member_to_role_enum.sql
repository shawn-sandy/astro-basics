-- Migration: Add 'member' and 'admin' to user_role ENUM
-- Purpose: Allow 'member' as the default role and 'admin' for administrators
-- Created: 2025-10-03
-- Depends on: Existing user_role ENUM type

-- Add 'member' value to user_role ENUM (if not exists)
-- PostgreSQL doesn't have IF NOT EXISTS for ENUM values, so we use DO block
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'user_role'
        AND e.enumlabel = 'member'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'member';
    END IF;
END$$;

-- Add 'admin' value to user_role ENUM (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'user_role'
        AND e.enumlabel = 'admin'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'admin';
    END IF;
END$$;

-- Update any NULL roles to 'member' (default role)
UPDATE users
SET role = 'member'
WHERE role IS NULL;

-- Verify the ENUM values
SELECT enumlabel as role_value
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'user_role'
ORDER BY e.enumsortorder;
