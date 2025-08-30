/**
 * Utility functions for user data handling
 */

import type { User as ClerkUser } from '@clerk/astro/server'

/**
 * Type definition for user object from authentication providers
 */
export interface User {
  firstName?: string
  lastName?: string
  fullName?: string
  name?: string
  displayName?: string
  username?: string
  email?: string
  emailAddresses?: { emailAddress: string }[]
}

/**
 * Safely extracts a display name from user object
 * Handles various user object formats (Clerk, Auth0, etc.)
 *
 * @param user - User object from authentication provider
 * @returns Safe display name string
 */
export function getDisplayName(user: User): string {
  if (!user) {
    return 'Guest'
  }

  // Try different common name fields
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`.trim()
  }

  if (user.fullName) {
    return String(user.fullName)
  }

  if (user.name) {
    return String(user.name)
  }

  if (user.displayName) {
    return String(user.displayName)
  }

  if (user.username) {
    return String(user.username)
  }

  // Fallback to email username part
  if (user.email) {
    const emailUsername = String(user.email).split('@')[0]
    return emailUsername || 'User'
  }

  if (user.emailAddresses && Array.isArray(user.emailAddresses) && user.emailAddresses[0]) {
    const emailUsername = String(user.emailAddresses[0].emailAddress || '').split('@')[0]
    return emailUsername || 'User'
  }

  return 'User'
}

/**
 * Extracts the primary email address from a Clerk user object
 * Falls back to first available email if primary is not found
 * 
 * @param user - Clerk user object
 * @returns Primary email address string or null if no valid email found
 */
export function extractPrimaryEmail(user: ClerkUser): string | null {
  if (!user.emailAddresses || user.emailAddresses.length === 0) {
    return null
  }

  // Find primary email by matching the primary email address ID
  const primaryEmail = user.emailAddresses.find(
    email => email.id === user.primaryEmailAddressId
  )

  // Return primary email if found, otherwise fall back to first available email
  return primaryEmail?.emailAddress || 
         (user.emailAddresses.length > 0 && user.emailAddresses[0]?.emailAddress) || 
         null
}

/**
 * Builds user data object for database storage from Clerk user
 * 
 * @param user - Clerk user object
 * @param email - Primary email address (from extractPrimaryEmail)
 * @returns User data object ready for database insertion
 */
export function buildUserData(user: ClerkUser, email: string) {
  return {
    clerk_id: user.id,
    email,
    username: user.username,
    full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
    avatar_url: user.imageUrl,
    metadata: user.publicMetadata || {},
    last_sign_in_at: user.lastSignInAt ? new Date(user.lastSignInAt).toISOString() : null,
  }
}
