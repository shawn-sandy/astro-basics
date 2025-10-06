-- ============================================================================
-- Migration 001: Core Schema - Users, Organizations, Preferences
-- ============================================================================
-- Purpose: Comprehensive user management with role-based access control
-- Created: 2025-10-06
-- Dependencies: Clerk authentication configured
-- Version: 1.0
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- PART 1: TYPES AND ENUMS
-- ----------------------------------------------------------------------------

-- Create user role ENUM (definitive role system)
-- Three-tier hierarchy: member (default) → admin → super_admin
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM (
            'member',       -- Default role for all users
            'admin',        -- Organization administrators
            'super_admin'   -- System administrators
        );
        RAISE NOTICE 'Created user_role ENUM type';
    ELSE
        RAISE NOTICE 'user_role ENUM type already exists';
    END IF;
END$$;

-- ----------------------------------------------------------------------------
-- PART 2: CORE TABLES
-- ----------------------------------------------------------------------------

-- Users table (lightweight Clerk sync)
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id text UNIQUE NOT NULL,

    -- Cached from Clerk for performance
    email text,
    username text,
    full_name text,
    avatar_url text,

    -- Role-based access control
    role user_role NOT NULL DEFAULT 'member',

    -- App-specific metadata
    app_metadata jsonb DEFAULT '{}',
    last_sign_in_at timestamptz,

    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Organization memberships (Clerk organizations sync)
CREATE TABLE IF NOT EXISTS organization_memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,

    -- Clerk organization data
    clerk_org_id text NOT NULL,
    clerk_org_role text NOT NULL,

    -- Cached organization data
    org_name text,
    org_slug text,

    -- Timestamps
    joined_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    UNIQUE(user_id, clerk_org_id)
);

-- User preferences (app-specific settings)
CREATE TABLE IF NOT EXISTS user_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE UNIQUE,

    -- Preference settings
    theme text DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    notifications_email boolean DEFAULT true,
    notifications_push boolean DEFAULT true,
    language text DEFAULT 'en',
    timezone text DEFAULT 'UTC',

    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- PART 3: INDEXES
-- ----------------------------------------------------------------------------

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Organization memberships indexes
CREATE INDEX IF NOT EXISTS idx_org_memberships_user ON organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org ON organization_memberships(clerk_org_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_role ON organization_memberships(clerk_org_role);

-- ----------------------------------------------------------------------------
-- PART 4: TRIGGERS AND FUNCTIONS
-- ----------------------------------------------------------------------------

-- Updated_at trigger function (idempotent)
-- Security: SET search_path prevents search_path injection attacks
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers (idempotency)
DROP TRIGGER IF EXISTS users_updated_at ON users;
DROP TRIGGER IF EXISTS org_memberships_updated_at ON organization_memberships;
DROP TRIGGER IF EXISTS user_preferences_updated_at ON user_preferences;

-- Create triggers
CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER org_memberships_updated_at
    BEFORE UPDATE ON organization_memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------------------------
-- PART 5: DOCUMENTATION
-- ----------------------------------------------------------------------------

COMMENT ON TABLE users IS
    'User profiles synced from Clerk via webhooks. Stores cached user data for performance.';

COMMENT ON TABLE organization_memberships IS
    'Organization membership tracking synced from Clerk. Enables multi-tenant RLS policies.';

COMMENT ON TABLE user_preferences IS
    'App-specific user preferences not managed by Clerk.';

COMMENT ON COLUMN users.clerk_id IS
    'Clerk user ID - primary identifier for auth integration';

COMMENT ON COLUMN users.role IS
    'User role for permission management. Synced from Clerk publicMetadata.role. Default: member. Valid values: member, admin, super_admin';

COMMENT ON COLUMN users.app_metadata IS
    'Application-specific metadata not stored in Clerk';

COMMENT ON COLUMN organization_memberships.clerk_org_role IS
    'Clerk organization role: org:admin or org:member';

COMMENT ON TYPE user_role IS
    'User role enumeration for RBAC. Three-tier system: member (default), admin (org admins), super_admin (system admins)';

-- ----------------------------------------------------------------------------
-- VERIFICATION
-- ----------------------------------------------------------------------------

DO $$
DECLARE
    v_enum_values TEXT;
    v_table_count INTEGER;
BEGIN
    -- Verify ENUM values
    SELECT string_agg(enumlabel, ', ' ORDER BY enumsortorder)
    INTO v_enum_values
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role';

    RAISE NOTICE 'user_role ENUM values: %', v_enum_values;

    -- Verify tables exist
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('users', 'organization_memberships', 'user_preferences');

    RAISE NOTICE 'Tables created: % of 3', v_table_count;

    -- Success message
    IF v_table_count = 3 THEN
        RAISE NOTICE '';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'Migration 001 completed successfully!';
        RAISE NOTICE 'Core schema created:';
        RAISE NOTICE '  - users table with 3-tier role system';
        RAISE NOTICE '  - organization_memberships table';
        RAISE NOTICE '  - user_preferences table';
        RAISE NOTICE '  - 6 indexes for performance';
        RAISE NOTICE '  - 3 triggers for updated_at automation';
        RAISE NOTICE '========================================';
    ELSE
        RAISE WARNING 'Expected 3 tables but found %', v_table_count;
    END IF;
END$$;

COMMIT;
