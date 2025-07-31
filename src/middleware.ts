// src/middleware.ts

import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server'

// Validate required environment variables
if (!import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing required environment variable: PUBLIC_CLERK_PUBLISHABLE_KEY. Please check your .env file.'
  )
}
if (!import.meta.env.CLERK_SECRET_KEY) {
  throw new Error(
    'Missing required environment variable: CLERK_SECRET_KEY. Please check your .env file.'
  )
}

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/forum(.*)', '/organization(.*)'])

export const onRequest = clerkMiddleware((auth, context, next) => {
  // If the current route is protected and the user is not authenticated, redirect to sign-in
  if (isProtectedRoute(context.request) && !auth().userId) {
    return auth().redirectToSignIn()
  }

  // Allow other requests to proceed
  return next()
})
