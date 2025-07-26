/**
 * Utility functions for user data handling
 */

/**
 * Safely extracts a display name from user object
 * Handles various user object formats (Clerk, Auth0, etc.)
 *
 * @param user - User object from authentication provider
 * @returns Safe display name string
 */
export function getDisplayName(user: any): string {
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
