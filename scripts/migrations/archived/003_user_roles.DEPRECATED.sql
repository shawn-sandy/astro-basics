-- Migration 003: User Roles ENUM
-- Generated: 2025-10-10T12:07:49.605Z
-- Source: config/roles.config.ts
-- Database: PostgreSQL (Supabase)

BEGIN;

-- Create user_role ENUM type if it doesn't exist
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
  'member'  -- Level 1: Member,
  'admin'  -- Level 2: Administrator,
  'super_admin'  -- Level 3: Super Administrator
  );
EXCEPTION
  WHEN duplicate_object THEN
    -- Type already exists, check if we need to add values
    NULL;
END $$;

-- Add any new role values to existing ENUM (if type already exists)
-- Note: PostgreSQL ENUMs can only be extended, not modified
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'member'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'member';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'admin'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'admin';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'super_admin'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'super_admin';
  END IF;
END $$;

-- Verify the user_role type exists and has the correct values
DO $$
DECLARE
  enum_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO enum_count
  FROM pg_enum e
  JOIN pg_type t ON e.enumtypid = t.oid
  WHERE t.typname = 'user_role';

  IF enum_count < 3 THEN
    RAISE EXCEPTION 'user_role ENUM does not have all expected values';
  END IF;

  RAISE NOTICE 'user_role ENUM successfully created/updated with % values', enum_count;
END $$;

COMMIT;
