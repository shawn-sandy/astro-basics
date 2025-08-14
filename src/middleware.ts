// src/middleware.ts

import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server'
import type { MiddlewareHandler } from 'astro'
import { sequence } from 'astro:middleware'

import {
  generateCsrfToken,
  parseCsrfTokenFromCookie,
  serializeCsrfTokenForCookie,
  createCsrfCookieOptions,
  CSRF_CONFIG,
} from '#utils/csrf'
import { messageRateLimiter, getClientIP, createRateLimitResponse } from '#utils/rate-limiter'

// Validate required environment variables - but allow dummy values in development
const hasValidClerkKeys =
  import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY &&
  import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY !== 'YOUR_CLERK_PUBLISHABLE_KEY' &&
  import.meta.env.CLERK_SECRET_KEY &&
  import.meta.env.CLERK_SECRET_KEY !== 'YOUR_CLERK_SECRET_KEY'

if (!hasValidClerkKeys) {
  console.warn('Using dummy Clerk keys - authentication will not work properly in development')
}

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/forum(.*)', '/organization(.*)'])

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
      console.warn('CSRF middleware error:', error)
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
const authMiddleware = clerkMiddleware(async (auth, context, next) => {
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
      console.log('✅ Auth middleware - User authenticated:', locals.userId)
    } catch (error) {
      console.error('❌ Failed to get Clerk token:', error)
    }
  } else {
    console.log('❌ Auth middleware - No user ID found')
  }

  // Allow other requests to proceed
  return next()
})

// Export middleware - include rate limiting before auth/CSRF
export const onRequest = hasValidClerkKeys
  ? sequence(rateLimitMiddleware, csrfMiddleware, authMiddleware)
  : sequence(rateLimitMiddleware, csrfMiddleware)
