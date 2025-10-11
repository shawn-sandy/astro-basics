-- ============================================================================
-- Rollback Migration 004: Remove Clerk Email Uniqueness Protection
-- ============================================================================
-- Purpose: Safely remove email uniqueness constraint
-- Created: 2025-10-11
-- Rollback For: 004_clerk_email_verification.sql
-- OpenSpec: verify-clerk-email-settings
-- Version: 1.0
-- ============================================================================
-- WARNING: After running this rollback, duplicate emails can be inserted
--          directly into the database (bypassing Clerk's protection)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- PART 1: DROP UNIQUE INDEX
-- ----------------------------------------------------------------------------

-- Drop the partial unique index on email column
DO $$
BEGIN
    -- Check if index exists before dropping (idempotent rollback)
    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_users_email_unique'
    ) THEN
        DROP INDEX IF EXISTS idx_users_email_unique;
        RAISE NOTICE 'Dropped unique index: idx_users_email_unique';
    ELSE
        RAISE NOTICE 'Unique index does not exist: idx_users_email_unique (already removed)';
    END IF;
END$$;

-- ----------------------------------------------------------------------------
-- PART 2: POST-ROLLBACK VERIFICATION
-- ----------------------------------------------------------------------------

-- Verify constraint was removed successfully
DO $$
DECLARE
    index_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_users_email_unique'
    ) INTO index_exists;

    IF NOT index_exists THEN
        RAISE NOTICE '✅ Rollback 004 completed successfully';
        RAISE NOTICE '   - Email uniqueness constraint removed';
        RAISE NOTICE '   - Duplicate emails can now be inserted (NOT RECOMMENDED)';
        RAISE NOTICE '   - Clerk still prevents duplicates at auth layer';
    ELSE
        RAISE EXCEPTION 'Rollback verification failed: idx_users_email_unique still exists';
    END IF;
END$$;

COMMIT;

-- ============================================================================
-- POST-ROLLBACK NOTES
-- ============================================================================
-- 1. Database-level email uniqueness protection is now DISABLED
-- 2. Clerk continues to prevent duplicate emails at authentication layer
-- 3. Direct database operations can now create duplicate emails
-- 4. Webhook handler will no longer receive 23505 errors for email conflicts
-- 5. To re-apply protection: Run 004_clerk_email_verification.sql
-- ============================================================================
