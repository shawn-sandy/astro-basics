import { describe, it, expect } from 'vitest'
import type {
  UserProfile,
  AuthState,
  SessionResult,
} from '#types'
import {
  isAuthenticated,
  hasOrganization,
  safeGetUser,
  safeGetSession,
} from '#types'

describe('Session Types', () => {
  describe('Type Guards', () => {
    it('should correctly identify authenticated users', () => {
      const authenticatedState: AuthState = {
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          username: 'testuser',
          firstName: 'John',
          lastName: 'Doe',
          fullName: 'John Doe',
          imageUrl: 'https://example.com/avatar.jpg',
          hasImage: true,
          primaryEmailAddress: {
            emailAddress: 'john@example.com',
            id: 'email_123',
          },
          primaryPhoneNumber: null,
          emailAddresses: [
            {
              id: 'email_123',
              emailAddress: 'john@example.com',
              verification: {
                status: 'verified',
                strategy: 'email_code',
              },
            },
          ],
          externalId: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        session: {
          id: 'session_123',
          status: 'active',
          expireAt: new Date(Date.now() + 86400000),
          abandonAt: new Date(Date.now() + 86400000 * 30),
          lastActiveAt: new Date(),
          lastActiveOrganizationId: null,
          factorVerificationAge: null,
          user: {} as UserProfile, // Will be set properly in real usage
        },
        orgId: null,
        orgRole: null,
        orgSlug: null,
        organization: null,
      }

      // Set the user reference in session
      authenticatedState.session!.user = authenticatedState.user!

      expect(isAuthenticated(authenticatedState)).toBe(true)
      
      // Type narrowing should work
      if (isAuthenticated(authenticatedState)) {
        expect(authenticatedState.user.id).toBe('user_123')
        expect(authenticatedState.session.id).toBe('session_123')
      }
    })

    it('should correctly identify unauthenticated users', () => {
      const unauthenticatedState: AuthState = {
        isLoaded: true,
        isSignedIn: false,
        user: null,
        session: null,
        orgId: null,
        orgRole: null,
        orgSlug: null,
        organization: null,
      }

      expect(isAuthenticated(unauthenticatedState)).toBe(false)
    })

    it('should correctly identify users with organizations', () => {
      const orgState: AuthState = {
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          username: 'testuser',
          firstName: 'John',
          lastName: 'Doe',
          fullName: 'John Doe',
          imageUrl: 'https://example.com/avatar.jpg',
          hasImage: true,
          primaryEmailAddress: {
            emailAddress: 'john@example.com',
            id: 'email_123',
          },
          primaryPhoneNumber: null,
          emailAddresses: [],
          externalId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        session: null,
        orgId: 'org_123',
        orgRole: 'admin',
        orgSlug: 'test-org',
        organization: {
          id: 'org_123',
          name: 'Test Organization',
          slug: 'test-org',
          imageUrl: 'https://example.com/org.jpg',
          hasImage: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          publicMetadata: {},
          adminDeleteEnabled: true,
          maxAllowedMemberships: 100,
          membersCount: 5,
          pendingInvitationsCount: 2,
        },
      }

      expect(hasOrganization(orgState)).toBe(true)
    })
  })

  describe('Safe Accessors', () => {
    it('should safely return user data when authenticated', () => {
      const authState: AuthState = {
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          username: 'testuser',
          firstName: 'John',
          lastName: 'Doe',
          fullName: 'John Doe',
          imageUrl: 'https://example.com/avatar.jpg',
          hasImage: true,
          primaryEmailAddress: null,
          primaryPhoneNumber: null,
          emailAddresses: [],
          externalId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        session: {
          id: 'session_123',
          status: 'active',
          expireAt: new Date(),
          abandonAt: new Date(),
          lastActiveAt: new Date(),
          lastActiveOrganizationId: null,
          factorVerificationAge: null,
          user: {} as UserProfile,
        },
        orgId: null,
        orgRole: null,
        orgSlug: null,
        organization: null,
      }

      // Set user reference
      authState.session!.user = authState.user!

      const user = safeGetUser(authState)
      expect(user).toBeDefined()
      expect(user?.id).toBe('user_123')

      const session = safeGetSession(authState)
      expect(session).toBeDefined()
      expect(session?.id).toBe('session_123')
    })

    it('should return undefined for unauthenticated users', () => {
      const authState: AuthState = {
        isLoaded: true,
        isSignedIn: false,
        user: null,
        session: null,
        orgId: null,
        orgRole: null,
        orgSlug: null,
        organization: null,
      }

      expect(safeGetUser(authState)).toBeUndefined()
      expect(safeGetSession(authState)).toBeUndefined()
    })
  })

  describe('SessionResult Type', () => {
    it('should handle successful results', () => {
      const successResult: SessionResult<string> = {
        ok: true,
        value: 'test data',
      }

      expect(successResult.ok).toBe(true)
      if (successResult.ok) {
        expect(successResult.value).toBe('test data')
      }
    })

    it('should handle error results', () => {
      const errorResult: SessionResult<string> = {
        ok: false,
        error: new Error('Test error'),
      }

      expect(errorResult.ok).toBe(false)
      if (!errorResult.ok) {
        expect(errorResult.error.message).toBe('Test error')
      }
    })
  })

  describe('Type Definitions', () => {
    it('should enforce readonly properties', () => {
      const user: UserProfile = {
        id: 'user_123',
        username: 'testuser',
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
        imageUrl: 'https://example.com/avatar.jpg',
        hasImage: true,
        primaryEmailAddress: {
          emailAddress: 'john@example.com',
          id: 'email_123',
        },
        primaryPhoneNumber: null,
        emailAddresses: [],
        externalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // These should be readonly properties
      expect(user.id).toBe('user_123')
      expect(user.firstName).toBe('John')
      
      // TypeScript would prevent mutation at compile time
      // user.id = 'different'; // This would be a TypeScript error
    })

    it('should properly type email addresses array', () => {
      const emailAddresses: UserProfile['emailAddresses'] = [
        {
          id: 'email_1',
          emailAddress: 'test1@example.com',
          verification: {
            status: 'verified',
            strategy: 'email_code',
          },
        },
        {
          id: 'email_2',
          emailAddress: 'test2@example.com',
          verification: {
            status: 'unverified',
            strategy: 'email_link',
          },
        },
      ]

      expect(emailAddresses).toHaveLength(2)
      expect(emailAddresses[0]?.emailAddress).toBe('test1@example.com')
      expect(emailAddresses[0]?.verification.status).toBe('verified')
    })
  })
})