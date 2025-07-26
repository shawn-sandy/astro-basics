// Export all session and authentication types
export type {
  UserProfile,
  UserSession,
  AuthState,
  OrganizationProfile,
  OrganizationMembership,
  SessionClaims,
  SessionMetadata,
  EnhancedUserSession,
  SessionResult,
  AuthEvent,
  UserProfileKeys,
  UserProfileUpdate,
} from './session'

export {
  isAuthenticated,
  hasOrganization,
  safeGetUser,
  safeGetSession,
  transformClerkUser,
  transformClerkSession,
  transformClerkOrganization,
  transformClerkMembership,
} from './session'