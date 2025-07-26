// Simple TypeScript compilation test for session types
import type {
  UserProfile,
  UserSession,
  AuthState,
  SessionResult,
} from '../src/types/session'

import {
  isAuthenticated,
  safeGetUser,
  safeGetSession,
} from '../src/types/session'

// Test type creation
const testUser: UserProfile = {
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
}

const testSession: UserSession = {
  id: 'session_123',
  status: 'active',
  expireAt: new Date(Date.now() + 86400000),
  abandonAt: new Date(Date.now() + 86400000 * 30),
  lastActiveAt: new Date(),
  lastActiveOrganizationId: null,
  factorVerificationAge: null,
  user: testUser,
}

const testAuth: AuthState = {
  isLoaded: true,
  isSignedIn: true,
  user: testUser,
  session: testSession,
  orgId: null,
  orgRole: null,
  orgSlug: null,
  organization: null,
}

// Test type guards
console.log('Testing type guards...')

const isAuth = isAuthenticated(testAuth)
console.log('Is authenticated:', isAuth)

if (isAuthenticated(testAuth)) {
  // TypeScript should know these are not null
  console.log('User ID:', testAuth.user.id)
  console.log('Session ID:', testAuth.session.id)
}

// Test safe accessors
const user = safeGetUser(testAuth)
const session = safeGetSession(testAuth)

console.log('Safe user:', user?.fullName)
console.log('Safe session:', session?.status)

// Test SessionResult type
const successResult: SessionResult<string> = {
  ok: true,
  value: 'test data',
}

const errorResult: SessionResult<string> = {
  ok: false,
  error: new Error('Test error'),
}

if (successResult.ok) {
  console.log('Success value:', successResult.value)
}

if (!errorResult.ok) {
  console.log('Error message:', errorResult.error.message)
}

console.log('All type tests passed! ✅')