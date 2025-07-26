import { useAuth } from '@clerk/astro/react'
import type {
  AuthState,
  UserProfile,
  UserSession,
  SessionResult,
} from '#types'
import {
  isAuthenticated,
  safeGetUser,
  safeGetSession,
} from '#types'

/**
 * Custom hook that provides typed authentication state
 * Note: This is a simplified version since we only have access to useAuth() from Clerk
 */
export const useTypedAuth = (): AuthState => {
  const { isLoaded, isSignedIn, orgId, orgRole, orgSlug } = useAuth()

  // Note: Without access to useUser hook, we create a minimal auth state
  // In practice, you would fetch user data separately or use server-side data
  return {
    isLoaded: Boolean(isLoaded),
    isSignedIn: Boolean(isSignedIn),
    user: null, // Would need to fetch user data separately
    session: null, // Would need to fetch session data separately
    orgId: orgId || null,
    orgRole: orgRole || null,
    orgSlug: orgSlug || null,
    organization: null,
  }
}

/**
 * Hook to safely get user data with type guards
 * Note: Returns undefined until user data is fetched separately
 */
export const useSafeUser = (): {
  readonly user: UserProfile | undefined
  readonly isAuthenticated: boolean
} => {
  const auth = useTypedAuth()
  
  return {
    user: safeGetUser(auth),
    isAuthenticated: isAuthenticated(auth),
  }
}

/**
 * Hook to safely get session data with type guards
 * Note: Returns undefined until session data is fetched separately
 */
export const useSafeSession = (): {
  readonly session: UserSession | undefined
  readonly isAuthenticated: boolean
} => {
  const auth = useTypedAuth()
  
  return {
    session: safeGetSession(auth),
    isAuthenticated: isAuthenticated(auth),
  }
}

/**
 * Hook to get user profile with error handling
 * Note: Will return error until user data is available
 */
export const useUserProfile = (): SessionResult<UserProfile> => {
  const { user, isAuthenticated: authenticated } = useSafeUser()
  
  if (!authenticated || !user) {
    return {
      ok: false,
      error: new Error('User data not available - fetch from server'),
    }
  }
  
  return {
    ok: true,
    value: user,
  }
}

/**
 * Hook to get session data with error handling
 * Note: Will return error until session data is available
 */
export const useSessionData = (): SessionResult<UserSession> => {
  const { session, isAuthenticated: authenticated } = useSafeSession()
  
  if (!authenticated || !session) {
    return {
      ok: false,
      error: new Error('Session data not available - fetch from server'),
    }
  }
  
  return {
    ok: true,
    value: session,
  }
}