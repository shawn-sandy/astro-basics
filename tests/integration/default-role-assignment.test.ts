/**
 * Integration Test: Default Role Assignment
 *
 * Verifies that the database correctly assigns 'member' as the default role
 * for new users when no explicit role is provided.
 *
 * This test validates migration 006's changes:
 * - DEFAULT constraint is set to 'member'::user_role
 * - ENUM contains 'member' and excludes 'volunteer'
 * - New users without explicit role get 'member'
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#libs/database.types'

describe('Default Role Assignment - Post Migration 006', () => {
  let supabase: SupabaseClient<Database>
  const testUserIds: string[] = []

  beforeAll(() => {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not configured')
    }

    supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  })

  afterAll(async () => {
    // Cleanup all test users created during tests
    if (testUserIds.length > 0) {
      await supabase.from('users').delete().in('clerk_id', testUserIds)
    }
  })

  describe('DEFAULT constraint behavior', () => {
    it('should assign "member" role when role is not specified', async () => {
      const testClerkId = `test_default_${Date.now()}`
      testUserIds.push(testClerkId)

      const { data, error } = await supabase
        .from('users')
        .insert({
          clerk_id: testClerkId,
          email: `test_default_${Date.now()}@example.com`,
          username: `testuser_${Date.now()}`,
          full_name: 'Test Default User',
          // Intentionally omit 'role' to test DEFAULT constraint
        })
        .select('role')
        .single()

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data?.role).toBe('member')
    })

    it('should assign "member" role when role is explicitly null', async () => {
      const testClerkId = `test_null_${Date.now()}`
      testUserIds.push(testClerkId)

      const { data, error } = await supabase
        .from('users')
        .insert({
          clerk_id: testClerkId,
          email: `test_null_${Date.now()}@example.com`,
          username: `testuser_${Date.now()}`,
          full_name: 'Test Null User',
          role: null as any, // Explicitly set to null
        })
        .select('role')
        .single()

      // Should either use DEFAULT or reject null depending on column constraint
      // After migration 006, column should have DEFAULT so null converts to 'member'
      if (error) {
        // If column is NOT NULL, this will fail - that's also acceptable
        expect(error.message).toContain('null value')
      } else {
        expect(data?.role).toBe('member')
      }
    })
  })

  describe('Explicit role assignment', () => {
    it('should allow explicit "member" role assignment', async () => {
      const testClerkId = `test_explicit_member_${Date.now()}`
      testUserIds.push(testClerkId)

      const { data, error } = await supabase
        .from('users')
        .insert({
          clerk_id: testClerkId,
          email: `test_member_${Date.now()}@example.com`,
          username: `testuser_${Date.now()}`,
          full_name: 'Test Member User',
          role: 'member',
        })
        .select('role')
        .single()

      expect(error).toBeNull()
      expect(data?.role).toBe('member')
    })

    it('should allow "coordinator" role assignment', async () => {
      const testClerkId = `test_coordinator_${Date.now()}`
      testUserIds.push(testClerkId)

      const { data, error } = await supabase
        .from('users')
        .insert({
          clerk_id: testClerkId,
          email: `test_coordinator_${Date.now()}@example.com`,
          username: `testuser_${Date.now()}`,
          full_name: 'Test Coordinator User',
          role: 'coordinator',
        })
        .select('role')
        .single()

      expect(error).toBeNull()
      expect(data?.role).toBe('coordinator')
    })

    it('should allow "admin" role assignment', async () => {
      const testClerkId = `test_admin_${Date.now()}`
      testUserIds.push(testClerkId)

      const { data, error } = await supabase
        .from('users')
        .insert({
          clerk_id: testClerkId,
          email: `test_admin_${Date.now()}@example.com`,
          username: `testuser_${Date.now()}`,
          full_name: 'Test Admin User',
          role: 'admin',
        })
        .select('role')
        .single()

      expect(error).toBeNull()
      expect(data?.role).toBe('admin')
    })

    it('should allow "super_admin" role assignment', async () => {
      const testClerkId = `test_super_admin_${Date.now()}`
      testUserIds.push(testClerkId)

      const { data, error } = await supabase
        .from('users')
        .insert({
          clerk_id: testClerkId,
          email: `test_super_admin_${Date.now()}@example.com`,
          username: `testuser_${Date.now()}`,
          full_name: 'Test Super Admin User',
          role: 'super_admin',
        })
        .select('role')
        .single()

      expect(error).toBeNull()
      expect(data?.role).toBe('super_admin')
    })
  })

  describe('ENUM constraint validation', () => {
    it('should reject "volunteer" role (removed by migration 006)', async () => {
      const testClerkId = `test_volunteer_${Date.now()}`
      // Don't add to cleanup array - this insert should fail

      const { data, error } = await supabase
        .from('users')
        .insert({
          clerk_id: testClerkId,
          email: `test_volunteer_${Date.now()}@example.com`,
          username: `testuser_${Date.now()}`,
          full_name: 'Test Volunteer User',
          role: 'volunteer' as any, // Should be invalid after migration 006
        })
        .select('role')
        .single()

      expect(error).not.toBeNull()
      expect(error?.message).toContain('invalid input value for enum user_role')
      expect(error?.message).toContain('volunteer')
      expect(data).toBeNull()
    })

    it('should reject invalid role values', async () => {
      const testClerkId = `test_invalid_${Date.now()}`

      const { data, error } = await supabase
        .from('users')
        .insert({
          clerk_id: testClerkId,
          email: `test_invalid_${Date.now()}@example.com`,
          username: `testuser_${Date.now()}`,
          full_name: 'Test Invalid User',
          role: 'invalid_role' as any,
        })
        .select('role')
        .single()

      expect(error).not.toBeNull()
      expect(error?.message).toContain('invalid input value for enum user_role')
      expect(data).toBeNull()
    })
  })

  describe('Webhook simulation - buildUserData pattern', () => {
    /**
     * Simulates the webhook handler pattern from src/pages/api/webhooks/clerk.ts
     * where role is extracted from public_metadata with 'member' fallback
     */
    it('should handle webhook pattern with missing role metadata', async () => {
      const testClerkId = `test_webhook_no_role_${Date.now()}`
      testUserIds.push(testClerkId)

      // Simulate: const role = (public_metadata?.role as string) || 'member'
      const publicMetadata = {} // No role in metadata
      const role = (publicMetadata?.role as string) || 'member'

      const { data, error } = await supabase
        .from('users')
        .insert({
          clerk_id: testClerkId,
          email: `test_webhook_${Date.now()}@example.com`,
          username: `testuser_${Date.now()}`,
          full_name: 'Test Webhook User',
          role, // Should be 'member' from fallback
          app_metadata: publicMetadata,
        })
        .select('role')
        .single()

      expect(error).toBeNull()
      expect(data?.role).toBe('member')
    })

    it('should handle webhook pattern with explicit role metadata', async () => {
      const testClerkId = `test_webhook_admin_${Date.now()}`
      testUserIds.push(testClerkId)

      // Simulate: const role = (public_metadata?.role as string) || 'member'
      const publicMetadata = { role: 'admin' }
      const role = (publicMetadata?.role as string) || 'member'

      const { data, error } = await supabase
        .from('users')
        .insert({
          clerk_id: testClerkId,
          email: `test_webhook_admin_${Date.now()}@example.com`,
          username: `testuser_${Date.now()}`,
          full_name: 'Test Webhook Admin',
          role, // Should be 'admin' from metadata
          app_metadata: publicMetadata,
        })
        .select('role')
        .single()

      expect(error).toBeNull()
      expect(data?.role).toBe('admin')
    })
  })

  describe('Role update operations', () => {
    it('should allow updating role from member to admin', async () => {
      const testClerkId = `test_update_${Date.now()}`
      testUserIds.push(testClerkId)

      // Create user with default role
      const { data: user } = await supabase
        .from('users')
        .insert({
          clerk_id: testClerkId,
          email: `test_update_${Date.now()}@example.com`,
          username: `testuser_${Date.now()}`,
          full_name: 'Test Update User',
        })
        .select('role')
        .single()

      expect(user?.role).toBe('member')

      // Update role to admin
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({ role: 'admin' })
        .eq('clerk_id', testClerkId)
        .select('role')
        .single()

      expect(error).toBeNull()
      expect(updatedUser?.role).toBe('admin')
    })

    it('should reject updating role to invalid value', async () => {
      const testClerkId = `test_update_invalid_${Date.now()}`
      testUserIds.push(testClerkId)

      // Create user
      await supabase.from('users').insert({
        clerk_id: testClerkId,
        email: `test_update_invalid_${Date.now()}@example.com`,
        username: `testuser_${Date.now()}`,
        full_name: 'Test Update Invalid User',
      })

      // Try to update to invalid role
      const { error } = await supabase
        .from('users')
        .update({ role: 'volunteer' as any })
        .eq('clerk_id', testClerkId)

      expect(error).not.toBeNull()
      expect(error?.message).toContain('invalid input value for enum user_role')
    })
  })

  describe('Migration 006 verification', () => {
    it('should confirm no users have volunteer role', async () => {
      const { data: volunteerUsers, error } = await supabase
        .from('users')
        .select('clerk_id, email')
        .eq('role', 'volunteer' as any)

      // If migration 006 was applied, this query should return empty or error
      if (error) {
        // Error is acceptable - means 'volunteer' not in ENUM
        expect(error.message).toContain('invalid input value for enum user_role')
      } else {
        // If no error, should have zero results
        expect(volunteerUsers).toEqual([])
      }
    })

    it('should confirm all users have valid roles', async () => {
      const { data: users, error } = await supabase.from('users').select('role')

      expect(error).toBeNull()
      expect(users).not.toBeNull()

      const validRoles = ['member', 'coordinator', 'admin', 'super_admin']
      const invalidUsers = users?.filter(user => !validRoles.includes(user.role))

      expect(invalidUsers).toEqual([])
    })
  })
})
