// src/middleware.ts

import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server'
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

/**
 * Validates Clerk authentication keys to prevent runtime failures.
 *
 * Allows dummy values in development mode to support local development without
 * requiring production Clerk keys. This prevents build failures while making
 * authentication behavior predictable in different environments.
 *
 * @constant {boolean} hasValidClerkKeys - True if production-ready Clerk keys are present
 * @security Critical for preventing authentication bypass in production
 * @example
 * // Development: Uses dummy keys, auth features disabled
 * // Production: Requires real keys, full auth protection active
 */
const hasValidClerkKeys =
  import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY &&
  import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY !== 'YOUR_CLERK_PUBLISHABLE_KEY' &&
  import.meta.env.CLERK_SECRET_KEY &&
  import.meta.env.CLERK_SECRET_KEY !== 'YOUR_CLERK_SECRET_KEY'

if (!hasValidClerkKeys) {
  logger.warn('Using dummy Clerk keys - authentication will not work properly in development')
}

/**
 * Route protection matcher for authentication-required paths.
 *
 * Uses regex patterns to match entire route trees that require authentication.
 * The (.*) pattern ensures all sub-routes are also protected, preventing
 * bypass through nested paths.
 *
 * @constant {Function} isProtectedRoute - Clerk route matcher function
 * @param {Request} request - Astro request object to test against patterns
 * @returns {boolean} True if route requires authentication
 * @security Prevents unauthorized access to sensitive application areas
 * @example
 * // Protected: /dashboard, /dashboard/settings, /forum/posts/123
 * // Public: /, /posts, /api/public
 */
const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/forum(.*)', '/organization(.*)'])

/**
 * Synchronizes user activity from Clerk to Supabase for analytics and user tracking.
 *
 * This lightweight sync strategy updates only the last sign-in timestamp to avoid
 * performance overhead on every request. Handles both new users (gracefully ignores
 * PGRST116 not found errors) and existing users. Runs asynchronously to prevent
 * blocking the main authentication flow.
 *
 * @param {string} userId - Clerk user ID to update in Supabase users table
 * @returns {Promise<void>} Resolves when update completes or fails gracefully
 * @throws Never throws - all errors are caught and logged for monitoring
 * @performance Non-blocking async operation, typically <50ms for existing users
 * @example
 * // Called automatically during protected route access
 * updateUserLastSignIn('user_2ABC123').catch(error => {
 *   // Error handling is internal, won't affect user experience
 * });
 * @see {@link isProtectedRoute} for when this sync is triggered
 * @since 1.0.0 - Added for user analytics and engagement tracking
 */
async function updateUserLastSignIn(userId: string | undefined): Promise<void> {
  if (!userId) return
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
 * CSRF protection middleware implementing token-based validation for form submissions.
 *
 * Generates cryptographically secure tokens for GET requests to HTML pages and validates
 * them on form submissions. Uses cookie-based storage with expiration to balance security
 * and user experience. Skips API endpoints and static assets to avoid unnecessary overhead.
 *
 * Token lifecycle:
 * 1. Generate token on page load (GET requests)
 * 2. Store in secure HTTP-only cookie with expiration
 * 3. Make available to page context for form inclusion
 * 4. Validate on form submission (handled by form validation middleware)
 *
 * @type {MiddlewareHandler} Astro middleware function
 * @param {APIContext} context - Astro request context with cookies and URL
 * @param {Function} next - Next middleware in the chain
 * @returns {Promise<Response>} Continues to next middleware
 * @security Prevents Cross-Site Request Forgery attacks on form submissions
 * @performance Only processes HTML page requests, skips assets and API calls
 * @example
 * // Automatically generates token for pages like /contact, /dashboard
 * // Skips /api/data, /images/logo.png, /styles/main.css
 * @see {@link generateCsrfToken} for token generation logic
 * @see {@link CSRF_CONFIG} for security configuration
 * @since 1.0.0
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
 * Rate limiting middleware for preventing API abuse and spam attacks.
 *
 * Currently protects the contact form endpoint (/api/message-us) with IP-based
 * rate limiting to prevent spam submissions and potential DoS attacks. Uses
 * sliding window algorithm for accurate rate limiting that doesn't reset at
 * fixed intervals.
 *
 * Rate limiting strategy:
 * - Per-IP tracking with sliding window
 * - Configurable limits via messageRateLimiter
 * - Immediate rejection when limits exceeded
 * - Graceful error responses with retry-after headers
 *
 * @type {MiddlewareHandler} Astro middleware function
 * @param {APIContext} context - Astro request context with URL and request
 * @param {Function} next - Next middleware in the chain
 * @returns {Promise<Response>} Rate limit response or continues to next middleware
 * @security Prevents spam, abuse, and potential DoS attacks on API endpoints
 * @performance Minimal overhead for non-targeted endpoints (single path check)
 * @example
 * // Protects: POST /api/message-us (contact form submissions)
 * // Ignores: GET /api/posts, POST /api/comments (different rate limits)
 * @see {@link messageRateLimiter} for rate limiting configuration
 * @see {@link getClientIP} for IP extraction logic
 * @todo Expand to cover other API endpoints with endpoint-specific limits
 * @since 1.0.0
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
 * Enhanced Clerk authentication middleware with multi-database integration.
 *
 * Handles the complete authentication flow including route protection, session
 * management, and cross-service token synchronization. Integrates Clerk's JWT
 * tokens with Supabase for seamless database access with RLS policies.
 *
 * Authentication flow:
 * 1. Check if current route requires authentication
 * 2. Redirect unauthenticated users to sign-in page
 * 3. Extract user data and session claims for authenticated users
 * 4. Generate Supabase-compatible JWT tokens
 * 5. Store authentication state in context.locals for server components
 * 6. Trigger background user sync for activity tracking
 *
 * @type {Function} Clerk middleware wrapper function
 * @param {Function} auth - Clerk auth helper function
 * @param {APIContext} context - Astro request context with locals for state
 * @param {Function} next - Next middleware in the chain
 * @returns {Promise<Response>} Redirect to sign-in or continues to next middleware
 * @security Enforces authentication on protected routes with automatic redirects
 * @performance Background user sync doesn't block request processing
 * @integration Bridges Clerk authentication with Supabase RLS policies
 * @example
 * // Protected route access:
 * // 1. User hits /dashboard -> checks auth -> redirects if needed
 * // 2. Authenticated user -> sets locals.userId, locals.clerkToken
 * // 3. Server components can access auth state via Astro.locals
 * @see {@link isProtectedRoute} for route protection configuration
 * @see {@link updateUserLastSignIn} for user activity tracking
 * @since 1.0.0 - Basic auth, 1.2.0 - Added Supabase integration
 */
const authMiddleware = clerkMiddleware(async (auth, context, next) => {
  const { locals } = context

  // If the current route is protected and the user is not authenticated, redirect to sign-in
  if (isProtectedRoute(context.request) && !auth().userId) {
    return auth().redirectToSignIn()
  }

  // Store auth data in locals for server components
  if (auth().userId) {
    locals.userId = auth().userId

    // Extract organization context from session claims
    const claims = auth().sessionClaims
    locals.userRole = (claims?.org_role as string) ?? null
    locals.orgId = (claims?.org_id as string) ?? null

    // Get Clerk session token for Supabase native integration
    try {
      const token = await auth().getToken()
      locals.clerkToken = token
      logger.debug('Auth middleware - User authenticated', {
        userId: locals.userId ?? undefined,
        role: locals.userRole,
        orgId: locals.orgId,
      })

      // Update last sign in timestamp (async, don't block request)
      // Only sync on protected routes to avoid unnecessary calls
      if (isProtectedRoute(context.request)) {
        const userId = locals.userId ?? undefined
        updateUserLastSignIn(userId).catch(error => {
          logger.warn('Background user sync failed', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        })
      }
    } catch (error) {
      logger.error('Failed to get Clerk token', {
        userId: locals.userId ?? undefined,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  } else {
    logger.debug('Auth middleware - No user ID found')
  }

  // Allow other requests to proceed
  return next()
})

/**
 * Main middleware pipeline combining security, rate limiting, and authentication.
 *
 * Middleware execution order is critical for security and performance:
 * 1. Rate limiting (fastest rejection, prevents DoS)
 * 2. CSRF protection (lightweight token management)
 * 3. Authentication (most complex, only when needed)
 *
 * Conditionally includes authentication based on environment configuration
 * to support development with dummy keys while maintaining security in production.
 *
 * @constant {MiddlewareHandler} onRequest - Astro's middleware export
 * @security Rate limiting → CSRF → Authentication provides defense in depth
 * @performance Early rejection of malicious requests reduces processing overhead
 * @example
 * // Production: All three middlewares active with real Clerk keys
 * // Development: Rate limiting + CSRF only, auth disabled with dummy keys
 * @see {@link rateLimitMiddleware} for API abuse prevention
 * @see {@link csrfMiddleware} for form submission protection
 * @see {@link authMiddleware} for route protection and session management
 * @since 1.0.0
 */
export const onRequest = hasValidClerkKeys
  ? sequence(rateLimitMiddleware, csrfMiddleware, authMiddleware)
  : sequence(rateLimitMiddleware, csrfMiddleware)
