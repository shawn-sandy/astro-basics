import type {
  UserResource,
  SessionResource,
  OrganizationMembershipResource,
  OrganizationResource,
} from '@clerk/types'

/**
 * User profile data from Clerk authentication
 */
export interface UserProfile {
  readonly id: string
  readonly username: string | null
  readonly firstName: string | null
  readonly lastName: string | null
  readonly fullName: string | null
  readonly imageUrl: string
  readonly hasImage: boolean
  readonly primaryEmailAddress: {
    readonly emailAddress: string
    readonly id: string
  } | null
  readonly primaryPhoneNumber: {
    readonly phoneNumber: string
    readonly id: string
  } | null
  readonly emailAddresses: ReadonlyArray<{
    readonly id: string
    readonly emailAddress: string
    readonly verification: {
      readonly status: string
      readonly strategy: string
    }
  }>
  readonly externalId: string | null
  readonly createdAt: Date
  readonly updatedAt: Date
}

/**
 * Session data structure from Clerk
 */
export interface UserSession {
  readonly id: string
  readonly status: 'active' | 'expired' | 'abandoned' | 'ended' | 'removed' | 'replaced' | 'revoked'
  readonly expireAt: Date
  readonly abandonAt: Date
  readonly lastActiveAt: Date
  readonly lastActiveOrganizationId: string | null
  readonly factorVerificationAge: readonly [number, number] | null
  readonly user: UserProfile
}

/**
 * Authentication state interface
 */
export interface AuthState {
  readonly isLoaded: boolean
  readonly isSignedIn: boolean
  readonly user: UserProfile | null
  readonly session: UserSession | null
  readonly orgId: string | null
  readonly orgRole: string | null
  readonly orgSlug: string | null
  readonly organization: OrganizationProfile | null
}

/**
 * Organization profile data
 */
export interface OrganizationProfile {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly imageUrl: string
  readonly hasImage: boolean
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly publicMetadata: Record<string, unknown>
  readonly adminDeleteEnabled: boolean
  readonly maxAllowedMemberships: number
  readonly membersCount: number
  readonly pendingInvitationsCount: number
}

/**
 * Organization membership data
 */
export interface OrganizationMembership {
  readonly id: string
  readonly role: string
  readonly permissions: ReadonlyArray<string>
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly organization: OrganizationProfile
  readonly publicUserData: {
    readonly userId: string
    readonly firstName: string | null
    readonly lastName: string | null
    readonly imageUrl: string
    readonly hasImage: boolean
  }
}

/**
 * Session token claims interface
 */
export interface SessionClaims {
  readonly aud: string
  readonly azp: string
  readonly exp: number
  readonly iat: number
  readonly iss: string
  readonly nbf: number
  readonly sid: string
  readonly sub: string
  readonly org_id?: string
  readonly org_role?: string
  readonly org_slug?: string
  readonly org_permissions?: ReadonlyArray<string>
}

/**
 * Custom session metadata interface
 */
export interface SessionMetadata {
  readonly lastLoginAt: Date
  readonly deviceInfo?: {
    readonly userAgent: string
    readonly ipAddress: string
    readonly location?: string
  }
  readonly preferences?: {
    readonly theme: 'light' | 'dark' | 'auto'
    readonly language: string
    readonly timezone: string
  }
}

/**
 * Enhanced session with custom metadata
 */
export interface EnhancedUserSession extends UserSession {
  readonly metadata: SessionMetadata
  readonly permissions: ReadonlyArray<string>
  readonly roles: ReadonlyArray<string>
}

/**
 * Result type for session operations
 */
export type SessionResult<T, E extends Error = Error> = 
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

/**
 * Authentication event types
 */
export type AuthEvent = 
  | { readonly type: 'session:created'; readonly session: UserSession }
  | { readonly type: 'session:ended'; readonly sessionId: string }
  | { readonly type: 'user:updated'; readonly user: UserProfile }
  | { readonly type: 'organization:switched'; readonly orgId: string | null }

/**
 * Utility type for extracting user properties
 */
export type UserProfileKeys = keyof UserProfile

/**
 * Utility type for optional user profile updates
 */
export type UserProfileUpdate = Partial<Pick<UserProfile, 'firstName' | 'lastName' | 'username'>>

/**
 * Type guard to check if user is authenticated
 */
export const isAuthenticated = (auth: AuthState): auth is AuthState & { 
  readonly isSignedIn: true
  readonly user: UserProfile
  readonly session: UserSession
} => {
  return auth.isLoaded && auth.isSignedIn && auth.user !== null && auth.session !== null
}

/**
 * Type guard to check if user has organization
 */
export const hasOrganization = (auth: AuthState): auth is AuthState & {
  readonly organization: OrganizationProfile
  readonly orgId: string
} => {
  return auth.organization !== null && auth.orgId !== null
}

/**
 * Helper to safely access user data
 */
export const safeGetUser = (auth: AuthState): UserProfile | undefined => {
  return isAuthenticated(auth) ? auth.user : undefined
}

/**
 * Helper to safely access session data
 */
export const safeGetSession = (auth: AuthState): UserSession | undefined => {
  return isAuthenticated(auth) ? auth.session : undefined
}

/**
 * Transform Clerk UserResource to UserProfile
 */
export const transformClerkUser = (clerkUser: UserResource): UserProfile => ({
  id: clerkUser.id,
  username: clerkUser.username,
  firstName: clerkUser.firstName,
  lastName: clerkUser.lastName,
  fullName: clerkUser.fullName,
  imageUrl: clerkUser.imageUrl,
  hasImage: clerkUser.hasImage,
  primaryEmailAddress: clerkUser.primaryEmailAddress ? {
    emailAddress: clerkUser.primaryEmailAddress.emailAddress,
    id: clerkUser.primaryEmailAddress.id,
  } : null,
  primaryPhoneNumber: clerkUser.primaryPhoneNumber ? {
    phoneNumber: clerkUser.primaryPhoneNumber.phoneNumber,
    id: clerkUser.primaryPhoneNumber.id,
  } : null,
  emailAddresses: clerkUser.emailAddresses.map(email => ({
    id: email.id,
    emailAddress: email.emailAddress,
    verification: {
      status: email.verification?.status || 'unverified',
      strategy: email.verification?.strategy || 'email_code',
    },
  })),
  externalId: clerkUser.externalId,
  createdAt: clerkUser.createdAt || new Date(),
  updatedAt: clerkUser.updatedAt || new Date(),
})

/**
 * Transform Clerk SessionResource to UserSession
 */
export const transformClerkSession = (
  clerkSession: SessionResource,
  user: UserProfile
): UserSession => ({
  id: clerkSession.id,
  status: clerkSession.status as UserSession['status'],
  expireAt: clerkSession.expireAt,
  abandonAt: clerkSession.abandonAt,
  lastActiveAt: clerkSession.lastActiveAt,
  lastActiveOrganizationId: clerkSession.lastActiveOrganizationId,
  factorVerificationAge: clerkSession.factorVerificationAge,
  user,
})

/**
 * Transform Clerk OrganizationResource to OrganizationProfile
 */
export const transformClerkOrganization = (clerkOrg: OrganizationResource): OrganizationProfile => ({
  id: clerkOrg.id,
  name: clerkOrg.name,
  slug: clerkOrg.slug || '',
  imageUrl: clerkOrg.imageUrl,
  hasImage: clerkOrg.hasImage,
  createdAt: clerkOrg.createdAt,
  updatedAt: clerkOrg.updatedAt,
  publicMetadata: clerkOrg.publicMetadata || {},
  adminDeleteEnabled: clerkOrg.adminDeleteEnabled,
  maxAllowedMemberships: clerkOrg.maxAllowedMemberships,
  membersCount: clerkOrg.membersCount || 0,
  pendingInvitationsCount: clerkOrg.pendingInvitationsCount || 0,
})

/**
 * Transform Clerk OrganizationMembershipResource to OrganizationMembership
 */
export const transformClerkMembership = (
  clerkMembership: OrganizationMembershipResource
): OrganizationMembership => ({
  id: clerkMembership.id,
  role: clerkMembership.role,
  permissions: clerkMembership.permissions || [],
  createdAt: clerkMembership.createdAt,
  updatedAt: clerkMembership.updatedAt,
  organization: transformClerkOrganization(clerkMembership.organization),
  publicUserData: clerkMembership.publicUserData ? {
    userId: clerkMembership.publicUserData.userId || '',
    firstName: clerkMembership.publicUserData.firstName,
    lastName: clerkMembership.publicUserData.lastName,
    imageUrl: clerkMembership.publicUserData.imageUrl,
    hasImage: clerkMembership.publicUserData.hasImage,
  } : {
    userId: '',
    firstName: null,
    lastName: null,
    imageUrl: '',
    hasImage: false,
  },
})