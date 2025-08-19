// src/middleware.ts

import type { MiddlewareHandler } from 'astro'
import { sequence } from 'astro:middleware'

import { getSupabaseServiceRole, isSupabaseConfigured } from '#libs/supabase-native'
import {
  generateCsrfToken,
  parseCsrfTokenFromCookie,
  serializeCsrfTokenForCookie,
  createCsrfCookieOptions,
  CSRF_CONFIG,
} from '#utils/csrf'
import { logger } from '#utils/logger'
import { messageRateLimiter, getClientIP, createRateLimitResponse } from '#utils/rate-limiter'
import { isClerkEnabled } from '#utils/clerk-config'

// Import Clerk conditionally based on runtime availability
let clerkMiddleware: Function | null = null
let createRouteMatcher: Function | null = null

// Try to load Clerk modules if enabled
if (isClerkEnabled) {
  try {
    // Use synchronous require for compatibility with middleware loading
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const clerkModule = eval('require')('@clerk/astro/server')
    clerkMiddleware = clerkModule.clerkMiddleware
    createRouteMatcher = clerkModule.createRouteMatcher
    logger.info('Clerk middleware loaded successfully')
  } catch {
    logger.warn('Clerk middleware not available - this is expected when Clerk integration is disabled')
  }
}

// Define protected routes pattern
const protectedRoutePatterns = ['/dashboard(.*)', '/forum(.*)', '/organization(.*)']

// Create route matcher - either real Clerk one or fallback
const isProtectedRoute = isClerkEnabled && createRouteMatcher 
  ? createRouteMatcher(protectedRoutePatterns)
  : (request: Request) => {
      // Simple fallback route matcher when Clerk is disabled
      const url = new URL(request.url)
      return protectedRoutePatterns.some(pattern => 
        new RegExp(pattern).test(url.pathname)
      )
    }

/**
 * Sync user data from Clerk to Supabase by updating last_sign_in_at
 * Simple sync that just updates the last sign in timestamp
 */
async function updateUserLastSignIn(userId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    return
  }

  const supabase = getSupabaseServiceRole()
  if (!supabase) {
    return
  }

  try {
    // Simply update the last_sign_in_at timestamp for existing user
    const { error } = await supabase
      .from('users')
      .update({ last_sign_in_at: new Date().toISOString() })
      .eq('clerk_id', userId)

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found, which is ok for new users
      logger.warn('Failed to update last sign in', { userId, error: error.message })
    } else if (!error) {
      logger.debug('Last sign in updated for user', { userId })
    }
  } catch (error) {
    logger.warn('Failed to update user last sign in', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * CSRF middleware - generates and manages CSRF tokens
 */
const csrfMiddleware: MiddlewareHandler = async (context, next) => {
  const { cookies, url } = context
  const isGetRequest = context.request.method === 'GET'

  // Only generate tokens for GET requests to pages (not API endpoints or assets)
  if (isGetRequest && !url.pathname.startsWith('/api/') && !url.pathname.includes('.')) {
    try {
      // Check if we have a valid existing token
      const existingCookieValue = cookies.get(CSRF_CONFIG.COOKIE_NAME)?.value
      const existingTokenResult = parseCsrfTokenFromCookie(existingCookieValue)

      let shouldGenerateNewToken = true

      if (existingTokenResult.ok && existingTokenResult.value) {
        // Check if existing token is still valid
        const now = new Date()
        if (existingTokenResult.value.expiresAt > now) {
          shouldGenerateNewToken = false
        }
      }

      // Generate new token if needed
      if (shouldGenerateNewToken) {
        const tokenResult = await generateCsrfToken()
        if (tokenResult.ok) {
          const serializedToken = serializeCsrfTokenForCookie(tokenResult.value)
          const cookieOptions = createCsrfCookieOptions(tokenResult.value.expiresAt)

          // Set the CSRF token cookie
          cookies.set(CSRF_CONFIG.COOKIE_NAME, serializedToken, cookieOptions)

          // Make token available to the page context
          context.locals.csrfToken = tokenResult.value.token
        }
      } else if (existingTokenResult.ok && existingTokenResult.value) {
        // Use existing valid token
        context.locals.csrfToken = existingTokenResult.value.token
      }
    } catch (error) {
      // Silently handle CSRF middleware errors to not break the app
      logger.warn('CSRF middleware error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return next()
}

/**
 * Rate limiting middleware for API endpoints
 */
const rateLimitMiddleware: MiddlewareHandler = async (context, next) => {
  const { url, request } = context

  // Only apply rate limiting to the message-us POST endpoint
  if (request.method === 'POST' && url.pathname === '/api/message-us') {
    const clientIP = getClientIP(request)
    const rateLimitResult = messageRateLimiter.checkLimit(clientIP)

    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult)
    }
  }

  return next()
}

/**
 * Enhanced Clerk authentication middleware with Supabase token support
 */
const createAuthMiddleware = (): MiddlewareHandler => {
  if (!isClerkEnabled || !clerkMiddleware) {
    // Return a no-op middleware when Clerk is disabled
    return async (context, next) => {
      const { request } = context
      
      // Block access to protected routes when auth is disabled
      if (isProtectedRoute(request)) {
        logger.warn('Access denied to protected route - authentication disabled', { 
          path: new URL(request.url).pathname 
        })
        return new Response('Authentication required but not configured', { status: 503 })
      }
      
      return next()
    }
  }

  // Return the real Clerk middleware
  return clerkMiddleware(async (auth, context, next) => {
    const { locals } = context

    // If the current route is protected and the user is not authenticated, redirect to sign-in
    if (isProtectedRoute(context.request) && !auth().userId) {
      return auth().redirectToSignIn()
    }

    // Store auth data in locals for server components
    if (auth().userId) {
      locals.userId = auth().userId
      locals.userRole = auth().sessionClaims?.role as string

      // Get Clerk session token for Supabase native integration
      try {
        const token = await auth().getToken()
        locals.clerkToken = token
        logger.debug('Auth middleware - User authenticated', { userId: locals.userId })

        // Update last sign in timestamp (async, don't block request)
        // Only sync on protected routes to avoid unnecessary calls
        if (isProtectedRoute(context.request)) {
          updateUserLastSignIn(locals.userId).catch(error => {
            logger.warn('Background user sync failed', {
              userId: locals.userId,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          })
        }
      } catch (error) {
        logger.error('Failed to get Clerk token', {
          userId: locals.userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    } else {
      logger.debug('Auth middleware - No user ID found')
    }

    // Allow other requests to proceed
    return next()
  })
}

// Create auth middleware instance
const authMiddleware = createAuthMiddleware()

// Export middleware - always include rate limiting and CSRF, conditionally include auth
export const onRequest = sequence(rateLimitMiddleware, csrfMiddleware, authMiddleware)
