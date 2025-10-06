-- Migration 006: Complete Migration to 'member' as Default Role
-- Purpose: Consolidate all required changes to fix default role system
-- Created: 2025-10-04
-- Depends on: Existing user_role ENUM with 'volunteer', 'coordinator', 'super_admin'
--
-- This migration combines:
-- - Migration 004: Add 'member' and 'admin' to ENUM
-- - Migration 005: Remove 'volunteer' from ENUM
-- - Set DEFAULT to 'member'
-- - Update existing users from 'volunteer' to 'member'
--
-- IMPORTANT: This migration must be run in a single transaction to ensure consistency

BEGIN;

-- =============================================================================
-- STEP 1: Add 'member' and 'admin' to existing user_role ENUM
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Step 1: Adding ''member'' to user_role ENUM...';

    -- Add 'member' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'user_role'
        AND e.enumlabel = 'member'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'member';
        RAISE NOTICE '  ✓ Added ''member'' to ENUM';
    ELSE
        RAISE NOTICE '  ✓ ''member'' already exists in ENUM';
    END IF;
END$$;

DO $$
BEGIN
    RAISE NOTICE 'Step 1: Adding ''admin'' to user_role ENUM...';

    -- Add 'admin' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'user_role'
        AND e.enumlabel = 'admin'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'admin';
        RAISE NOTICE '  ✓ Added ''admin'' to ENUM';
    ELSE
        RAISE NOTICE '  ✓ ''admin'' already exists in ENUM';
    END IF;
END$$;

-- =============================================================================
-- STEP 2: Update all users with 'volunteer' role to 'member'
-- =============================================================================

DO $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    RAISE NOTICE 'Step 2: Updating users from ''volunteer'' to ''member''...';

    UPDATE users
    SET role = 'member'
    WHERE role = 'volunteer';

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE '  ✓ Updated % user(s) from ''volunteer'' to ''member''', v_updated_count;
END$$;

-- Also update any NULL roles to 'member'
DO $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    UPDATE users
    SET role = 'member'
    WHERE role IS NULL;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    IF v_updated_count > 0 THEN
        RAISE NOTICE '  ✓ Updated % user(s) from NULL to ''member''', v_updated_count;
    END IF;
END$$;

-- =============================================================================
-- STEP 3: Remove 'volunteer' from user_role ENUM
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Step 3: Removing ''volunteer'' from ENUM...';

    -- Create new ENUM without 'volunteer'
    CREATE TYPE user_role_new AS ENUM ('member', 'coordinator', 'admin', 'super_admin');
    RAISE NOTICE '  ✓ Created user_role_new ENUM';

    -- Alter the column to use the new ENUM type
    ALTER TABLE users
      ALTER COLUMN role TYPE user_role_new
      USING role::text::user_role_new;
    RAISE NOTICE '  ✓ Converted users.role column to new ENUM';

    -- Drop the old ENUM type
    DROP TYPE user_role;
    RAISE NOTICE '  ✓ Dropped old user_role ENUM';

    -- Rename the new ENUM to the original name
    ALTER TYPE user_role_new RENAME TO user_role;
    RAISE NOTICE '  ✓ Renamed user_role_new to user_role';
END$$;

-- =============================================================================
-- STEP 4: Set DEFAULT to 'member'
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Step 4: Setting DEFAULT to ''member''...';

    ALTER TABLE users
      ALTER COLUMN role SET DEFAULT 'member'::user_role;

    RAISE NOTICE '  ✓ Set DEFAULT to ''member''::user_role';
END$$;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICATION RESULTS ===';
END$$;

-- Show ENUM values
DO $$
DECLARE
    v_enum_values TEXT;
BEGIN
    SELECT string_agg(enumlabel, ', ' ORDER BY enumsortorder)
    INTO v_enum_values
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role';

    RAISE NOTICE 'Allowed ENUM values: %', v_enum_values;
END$$;

-- Show column default
DO $$
DECLARE
    v_default TEXT;
BEGIN
    SELECT column_default
    INTO v_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'role';

    RAISE NOTICE 'Column DEFAULT: %', v_default;
END$$;

-- Show role distribution
DO $$
DECLARE
    v_role_stats TEXT;
BEGIN
    SELECT string_agg(role || ': ' || count, ', ' ORDER BY role)
    INTO v_role_stats
    FROM (
        SELECT role, COUNT(*)::TEXT as count
        FROM users
        GROUP BY role
        ORDER BY role
    ) stats;

    RAISE NOTICE 'Role distribution: %', COALESCE(v_role_stats, 'No users');
END$$;

-- Check for any remaining issues
DO $$
DECLARE
    v_volunteer_count INTEGER;
    v_null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_volunteer_count FROM users WHERE role = 'volunteer';
    SELECT COUNT(*) INTO v_null_count FROM users WHERE role IS NULL;

    IF v_volunteer_count > 0 THEN
        RAISE WARNING '⚠ Found % user(s) with ''volunteer'' role', v_volunteer_count;
    ELSE
        RAISE NOTICE '✓ No users with ''volunteer'' role';
    END IF;

    IF v_null_count > 0 THEN
        RAISE WARNING '⚠ Found % user(s) with NULL role', v_null_count;
    ELSE
        RAISE NOTICE '✓ No users with NULL role';
    END IF;
END$$;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== MIGRATION COMPLETE ===';
    RAISE NOTICE 'Default role system successfully updated to use ''member''';
    RAISE NOTICE '';
    RAISE NOTICE 'Summary of changes:';
    RAISE NOTICE '  1. Added ''member'' and ''admin'' to user_role ENUM';
    RAISE NOTICE '  2. Updated users from ''volunteer'' to ''member''';
    RAISE NOTICE '  3. Removed ''volunteer'' from user_role ENUM';
    RAISE NOTICE '  4. Set DEFAULT to ''member''::user_role';
    RAISE NOTICE '';
    RAISE NOTICE 'All new users will now automatically receive the ''member'' role';
END$$;

COMMIT;
