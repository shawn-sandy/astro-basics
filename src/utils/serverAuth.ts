import type { APIContext } from 'astro'
import type {
  AuthState,
  UserProfile,
  UserSession,
  SessionResult,
  OrganizationProfile,
} from '#types'

/**
 * Get authentication state from Astro context (server-side)
 * Note: This is a simplified version since Clerk integration varies by setup
 */
export const getAuthState = async (context: APIContext): Promise<SessionResult<AuthState>> => {
  try {
    // Note: This would need to be adapted based on your specific Clerk integration
    // The exact structure of context.locals depends on your middleware setup
    const _userId = context.url.searchParams.get('userId') // Placeholder

    if (!_userId) {
      return {
        ok: true,
        value: {
          isLoaded: true,
          isSignedIn: false,
          user: null,
          session: null,
          orgId: null,
          orgRole: null,
          orgSlug: null,
          organization: null,
        },
      }
    }

    // In a real implementation, you would fetch user data from Clerk here
    // This is a placeholder showing the structure
    return {
      ok: true,
      value: {
        isLoaded: true,
        isSignedIn: true,
        user: null, // Would fetch from Clerk API
        session: null, // Would fetch from Clerk API
        orgId: null,
        orgRole: null,
        orgSlug: null,
        organization: null,
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: error as Error,
    }
  }
}

/**
 * Get user profile from Astro context (server-side)
 */
export const getUserProfile = async (context: APIContext): Promise<SessionResult<UserProfile>> => {
  const authResult = await getAuthState(context)
  
  if (!authResult.ok) {
    return authResult
  }

  if (!authResult.value.isSignedIn || !authResult.value.user) {
    return {
      ok: false,
      error: new Error('User is not authenticated'),
    }
  }

  return {
    ok: true,
    value: authResult.value.user,
  }
}

/**
 * Get session data from Astro context (server-side)
 */
export const getSessionData = async (context: APIContext): Promise<SessionResult<UserSession>> => {
  const authResult = await getAuthState(context)
  
  if (!authResult.ok) {
    return authResult
  }

  if (!authResult.value.isSignedIn || !authResult.value.session) {
    return {
      ok: false,
      error: new Error('No active session found'),
    }
  }

  return {
    ok: true,
    value: authResult.value.session,
  }
}

/**
 * Check if user has specific permissions (server-side)
 */
export const checkUserPermissions = async (
  context: APIContext,
  _requiredPermissions: ReadonlyArray<string>
): Promise<SessionResult<boolean>> => {
  const authResult = await getAuthState(context)
  
  if (!authResult.ok) {
    return authResult
  }

  if (!authResult.value.isSignedIn) {
    return {
      ok: true,
      value: false,
    }
  }

  // Placeholder permission check - would implement with actual Clerk permissions
  return {
    ok: true,
    value: false,
  }
}

/**
 * Get organization membership data (server-side)
 */
export const getOrganizationMembership = async (
  context: APIContext
): Promise<SessionResult<OrganizationProfile>> => {
  const authResult = await getAuthState(context)
  
  if (!authResult.ok) {
    return authResult
  }

  if (!authResult.value.organization) {
    return {
      ok: false,
      error: new Error('User is not part of an organization'),
    }
  }

  return {
    ok: true,
    value: authResult.value.organization,
  }
}

/**
 * Utility to protect API routes (server-side)
 */
export const requireAuth = async (context: APIContext): Promise<SessionResult<AuthState>> => {
  const authResult = await getAuthState(context)
  
  if (!authResult.ok) {
    return authResult
  }

  if (!authResult.value.isSignedIn) {
    return {
      ok: false,
      error: new Error('Authentication required'),
    }
  }

  return authResult
}

/**
 * Utility to protect API routes with organization membership (server-side)
 */
export const requireOrganization = async (
  context: APIContext
): Promise<SessionResult<AuthState>> => {
  const authResult = await requireAuth(context)
  
  if (!authResult.ok) {
    return authResult
  }

  if (!authResult.value.organization) {
    return {
      ok: false,
      error: new Error('Organization membership required'),
    }
  }

  return authResult
}

/**
 * Helper to handle authentication errors in API routes
 */
export const handleAuthError = (error: Error): Response => {
  console.error('Authentication error:', error)
  
  if (error.message === 'Authentication required') {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (error.message === 'Organization membership required') {
    return new Response(JSON.stringify({ error: 'Organization membership required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'Internal server error' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  })
}