// src/middleware.ts

import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server'
import { validateEnvVars } from '#utils/env-config'

// Validate required environment variables
validateEnvVars('clerk')

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/forum(.*)', '/organization(.*)'])

export const onRequest = clerkMiddleware((auth, context, next) => {
  // If the current route is protected and the user is not authenticated, redirect to sign-in
  if (isProtectedRoute(context.request) && !auth().userId) {
    return auth().redirectToSignIn()
  }

  // Allow other requests to proceed
  return next()
})
