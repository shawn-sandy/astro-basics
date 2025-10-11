-- ============================================================================
-- Migration 004: Clerk Email Uniqueness Protection
-- ============================================================================
-- Purpose: Add database-level email uniqueness constraint as defense-in-depth
--          Clerk enforces uniqueness at auth layer; this prevents DB bypasses
-- Created: 2025-10-11
-- Dependencies: Migration 001 (users table exists)
-- OpenSpec: verify-clerk-email-settings
-- Version: 1.0
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- PART 1: PRE-MIGRATION VALIDATION
-- ----------------------------------------------------------------------------

-- Check for existing duplicate emails before applying constraint
-- If duplicates exist, migration will fail and must be resolved manually
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT email, COUNT(*) as count
        FROM users
        WHERE email IS NOT NULL
        GROUP BY email
        HAVING COUNT(*) > 1
    ) duplicates;

    IF duplicate_count > 0 THEN
        RAISE EXCEPTION 'Cannot apply email uniqueness constraint: % duplicate email(s) found. Run pre-migration query to identify duplicates: SELECT email, COUNT(*) FROM users WHERE email IS NOT NULL GROUP BY email HAVING COUNT(*) > 1;', duplicate_count;
    ELSE
        RAISE NOTICE 'Pre-migration check passed: No duplicate emails found';
    END IF;
END$$;

-- ----------------------------------------------------------------------------
-- PART 2: CREATE UNIQUE INDEX
-- ----------------------------------------------------------------------------

-- Create partial unique index on email column
-- WHY PARTIAL: Allows multiple NULL email values (users without email)
-- WHY UNIQUE: Prevents duplicate email addresses at database level
-- CONSTRAINT NAME: idx_users_email_unique (referenced in webhook error handling)
DO $$
BEGIN
    -- Check if index already exists (idempotent migration)
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_users_email_unique'
    ) THEN
        CREATE UNIQUE INDEX idx_users_email_unique
        ON users(email)
        WHERE email IS NOT NULL;

        RAISE NOTICE 'Created unique index: idx_users_email_unique';
    ELSE
        RAISE NOTICE 'Unique index already exists: idx_users_email_unique';
    END IF;
END$$;

-- ----------------------------------------------------------------------------
-- PART 3: POST-MIGRATION VERIFICATION
-- ----------------------------------------------------------------------------

-- Verify constraint was created successfully
DO $$
DECLARE
    index_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_users_email_unique'
        AND tablename = 'users'
    ) INTO index_exists;

    IF index_exists THEN
        RAISE NOTICE '✅ Migration 004 completed successfully';
        RAISE NOTICE '   - Email uniqueness constraint active';
        RAISE NOTICE '   - Webhook handler should catch PostgreSQL error code 23505';
        RAISE NOTICE '   - Multiple NULL emails are allowed (by design)';
    ELSE
        RAISE EXCEPTION 'Migration verification failed: idx_users_email_unique not found';
    END IF;
END$$;

-- ----------------------------------------------------------------------------
-- METADATA
-- ----------------------------------------------------------------------------

COMMENT ON INDEX idx_users_email_unique IS 'Partial unique index enforcing email uniqueness for non-NULL values. Defense-in-depth measure alongside Clerk authentication-layer enforcement. Created by migration 004_clerk_email_verification.sql';

COMMIT;

-- ============================================================================
-- POST-MIGRATION NOTES
-- ============================================================================
-- 1. Clerk remains the source of truth for email uniqueness
-- 2. This constraint prevents database-level bypasses (direct SQL, race conditions)
-- 3. Webhook handler must catch error code 23505 and return 409 Conflict
-- 4. Multiple NULL emails are allowed (users can exist without email)
-- 5. Rollback available: rollback_004_clerk_email_verification.sql
-- ============================================================================
