-- Migration: Create users table with organization support
-- Purpose: Lightweight user sync from Clerk with role-based access control
-- Created: 2025-10-03
-- Depends on: Clerk integration configured

-- Main users table (lightweight sync from Clerk)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id text UNIQUE NOT NULL,

  -- Cached from Clerk for performance (updated via webhooks)
  email text,
  username text,
  full_name text,
  avatar_url text,

  -- App-specific metadata
  app_metadata jsonb DEFAULT '{}',
  last_sign_in_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Organization memberships (synced from Clerk organizations)
CREATE TABLE IF NOT EXISTS organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,

  clerk_org_id text NOT NULL,
  clerk_org_role text NOT NULL, -- 'org:admin' or 'org:member'

  -- Cached organization data
  org_name text,
  org_slug text,

  joined_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id, clerk_org_id)
);

-- User preferences (app-specific, not in Clerk)
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE UNIQUE,

  theme text DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  notifications_email boolean DEFAULT true,
  notifications_push boolean DEFAULT true,
  language text DEFAULT 'en',
  timezone text DEFAULT 'UTC',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_org_memberships_user ON organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org ON organization_memberships(clerk_org_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_role ON organization_memberships(clerk_org_role);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist (for idempotency)
DROP TRIGGER IF EXISTS users_updated_at ON users;
DROP TRIGGER IF EXISTS org_memberships_updated_at ON organization_memberships;
DROP TRIGGER IF EXISTS user_preferences_updated_at ON user_preferences;

-- Create triggers
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER org_memberships_updated_at BEFORE UPDATE ON organization_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add helpful comments
COMMENT ON TABLE users IS 'User profiles synced from Clerk via webhooks. Stores cached user data for performance.';
COMMENT ON TABLE organization_memberships IS 'Organization membership tracking synced from Clerk. Enables multi-tenant RLS policies.';
COMMENT ON TABLE user_preferences IS 'App-specific user preferences not managed by Clerk.';
COMMENT ON COLUMN users.clerk_id IS 'Clerk user ID - primary identifier for auth integration';
COMMENT ON COLUMN users.app_metadata IS 'Application-specific metadata not stored in Clerk';
COMMENT ON COLUMN organization_memberships.clerk_org_role IS 'Clerk organization role: org:admin or org:member';
