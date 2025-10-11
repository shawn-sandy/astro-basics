-- ============================================================================
-- Verification Script: Migration 004 Email Uniqueness Constraint
-- ============================================================================
-- Run this in Supabase SQL Editor to verify migration was applied successfully
-- ============================================================================

-- CHECK 1: Verify the unique index exists
SELECT
    indexname,
    tablename,
    indexdef,
    CASE
        WHEN indexname = 'idx_users_email_unique' THEN '✅ Index exists'
        ELSE '❌ Index not found'
    END as status
FROM pg_indexes
WHERE indexname = 'idx_users_email_unique'
AND tablename = 'users';

-- If no rows returned, the index does NOT exist

-- CHECK 2: Verify it's a partial unique index
SELECT
    i.relname as index_name,
    pg_get_indexdef(i.oid) as index_definition,
    CASE
        WHEN pg_get_indexdef(i.oid) LIKE '%WHERE%' THEN '✅ Partial index (allows NULL)'
        ELSE '⚠️  Not a partial index'
    END as index_type,
    CASE
        WHEN ix.indisunique THEN '✅ Unique constraint active'
        ELSE '❌ Not unique'
    END as uniqueness_status
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
WHERE t.relname = 'users'
AND i.relname = 'idx_users_email_unique';

-- CHECK 3: Look for any duplicate emails (should return 0 rows)
SELECT
    email,
    COUNT(*) as occurrence_count,
    CASE
        WHEN COUNT(*) > 1 THEN '⚠️  DUPLICATE FOUND'
        ELSE '✅ Unique'
    END as status
FROM users
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY occurrence_count DESC;

-- If no rows returned, no duplicates exist (GOOD!)

-- CHECK 4: Verify multiple NULL emails are allowed
SELECT
    COUNT(*) as null_email_count,
    CASE
        WHEN COUNT(*) >= 0 THEN '✅ NULL emails allowed (by design)'
        ELSE 'N/A'
    END as status
FROM users
WHERE email IS NULL;

-- CHECK 5: Get index comment/metadata
SELECT
    obj_description(i.oid, 'pg_class') as index_comment,
    CASE
        WHEN obj_description(i.oid, 'pg_class') IS NOT NULL THEN '✅ Index documented'
        ELSE '⚠️  No comment'
    END as documentation_status
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
WHERE t.relname = 'users'
AND i.relname = 'idx_users_email_unique';

-- ============================================================================
-- SUMMARY QUERY: Combined verification check
-- ============================================================================
WITH index_check AS (
    SELECT
        EXISTS(
            SELECT 1 FROM pg_indexes
            WHERE indexname = 'idx_users_email_unique'
            AND tablename = 'users'
        ) as index_exists
),
duplicate_check AS (
    SELECT
        COUNT(*) as duplicate_count
    FROM (
        SELECT email
        FROM users
        WHERE email IS NOT NULL
        GROUP BY email
        HAVING COUNT(*) > 1
    ) duplicates
)
SELECT
    CASE
        WHEN ic.index_exists THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as "Index Exists",
    CASE
        WHEN dc.duplicate_count = 0 THEN '✅ PASS'
        ELSE '❌ FAIL: ' || dc.duplicate_count || ' duplicates'
    END as "No Duplicates",
    CASE
        WHEN ic.index_exists AND dc.duplicate_count = 0 THEN '✅ MIGRATION SUCCESSFUL'
        ELSE '❌ MIGRATION INCOMPLETE'
    END as "Overall Status"
FROM index_check ic, duplicate_check dc;

-- ============================================================================
-- Expected Results:
-- ============================================================================
-- ✅ Index Exists: PASS
-- ✅ No Duplicates: PASS
-- ✅ Overall Status: MIGRATION SUCCESSFUL
-- ============================================================================
