import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Integration tests for the user sync endpoints with email validation
 * Tests that the actual endpoint handlers correctly validate email addresses
 */

/**
 * Creates a mock Clerk user object with configurable email addresses
 * @param emailAddresses - Array of email addresses (empty array for no emails)
 * @returns Mock user object matching Clerk's user interface
 */
function createMockClerkUser(emailAddresses: { id: string; emailAddress: string }[] = []) {
  return {
    id: 'user_123',
    emailAddresses,
    primaryEmailAddressId: emailAddresses.length > 0 ? emailAddresses[0].id : null,
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    imageUrl: 'https://example.com/avatar.jpg',
    publicMetadata: {},
    lastSignInAt: Date.now(),
  } as any
}

// Mock the Clerk client and Supabase dependencies
vi.mock('@clerk/astro/server', () => ({
  clerkClient: {
    users: {
      getUser: vi.fn(),
    },
  },
}))

vi.mock('#libs/supabase-native', () => ({
  getSupabaseServiceRole: vi.fn(() => ({
    from: vi.fn(() => ({
      upsert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { clerk_id: 'user_123' }, error: null })),
        })),
      })),
    })),
  })),
  isSupabaseConfigured: vi.fn(() => true),
}))

describe('User Sync Endpoints Email Validation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('User sync endpoint (/api/user/sync)', () => {
    it('should return error when user has no email addresses', async () => {
      const { clerkClient } = await import('@clerk/astro/server')

      // Mock user with empty email addresses
      vi.mocked(clerkClient.users.getUser).mockResolvedValue(
        createMockClerkUser([]) // No email addresses
      )

      const { POST } = await import('#pages/api/user/sync')

      const mockLocals = { userId: 'user_123' }
      const response = await POST({ locals: mockLocals } as any)

      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData).toEqual({
        error: 'No valid email address found',
        message: 'User sync requires at least one email address',
      })
    })

    it('should succeed when user has valid email addresses', async () => {
      const { clerkClient } = await import('@clerk/astro/server')

      // Mock user with valid email addresses
      vi.mocked(clerkClient.users.getUser).mockResolvedValue(
        createMockClerkUser([{ id: 'email_1', emailAddress: 'test@example.com' }])
      )

      const { POST } = await import('#pages/api/user/sync')

      const mockLocals = { userId: 'user_123' }
      const response = await POST({ locals: mockLocals } as any)

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.message).toBe('User synced successfully')
    })
  })

  describe('Test sync endpoint (/api/test/sync-user)', () => {
    it('should return error when user has no email addresses', async () => {
      const { clerkClient } = await import('@clerk/astro/server')

      // Mock user with empty email addresses
      vi.mocked(clerkClient.users.getUser).mockResolvedValue(
        createMockClerkUser([]) // No email addresses
      )

      const { POST } = await import('#pages/api/test/sync-user')

      const mockRequest = {
        json: vi.fn().mockResolvedValue({ userId: 'user_123' }),
      }
      const response = await POST({ request: mockRequest } as any)

      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData).toEqual({
        error: 'No valid email address found',
        message: 'User sync requires at least one email address',
      })
    })

    it('should succeed when user has valid email addresses', async () => {
      const { clerkClient } = await import('@clerk/astro/server')

      // Mock user with valid email addresses
      vi.mocked(clerkClient.users.getUser).mockResolvedValue(
        createMockClerkUser([{ id: 'email_1', emailAddress: 'test@example.com' }])
      )

      const { POST } = await import('#pages/api/test/sync-user')

      const mockRequest = {
        json: vi.fn().mockResolvedValue({ userId: 'user_123' }),
      }
      const response = await POST({ request: mockRequest } as any)

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.message).toBe('User synced successfully')
    })
  })
})
