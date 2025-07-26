import { useTypedAuth, useSafeUser, useUserProfile } from '#utils/useTypedAuth'
import { isAuthenticated } from '#types'

/**
 * Props for the UserProfileCard component
 */
export type UserProfileCardProps = {
  readonly showEmail?: boolean
  readonly showLoginTime?: boolean
  readonly className?: string
}

/**
 * Component that displays user profile information with proper TypeScript types
 */
export function UserProfileCard({ 
  showEmail = true, 
  showLoginTime = false,
  className = '' 
}: UserProfileCardProps) {
  const auth = useTypedAuth()
  const userResult = useUserProfile()

  // Loading state
  if (!auth.isLoaded) {
    return (
      <div className={`user-profile-card loading ${className}`}>
        <div className="loading-spinner">Loading...</div>
      </div>
    )
  }

  // Handle authentication failure
  if (!userResult.ok) {
    return (
      <div className={`user-profile-card error ${className}`}>
        <p>Please sign in to view profile</p>
      </div>
    )
  }

  const user = userResult.value

  return (
    <div className={`user-profile-card ${className}`}>
      <div className="user-avatar">
        {user.hasImage ? (
          <img 
            src={user.imageUrl} 
            alt={`${user.fullName || user.username || 'User'} avatar`}
            width={48}
            height={48}
          />
        ) : (
          <div className="avatar-placeholder">
            {(user.firstName?.[0] || user.username?.[0] || '?').toUpperCase()}
          </div>
        )}
      </div>
      
      <div className="user-info">
        <h3 className="user-name">
          {user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Anonymous User'}
        </h3>
        
        {user.username && user.fullName && (
          <p className="username">@{user.username}</p>
        )}
        
        {showEmail && user.primaryEmailAddress && (
          <p className="email">{user.primaryEmailAddress.emailAddress}</p>
        )}
        
        {showLoginTime && auth.session && (
          <p className="last-active">
            Last active: {auth.session.lastActiveAt.toLocaleDateString()}
          </p>
        )}
        
        {auth.orgRole && (
          <p className="organization-role">
            Role: {auth.orgRole}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Example component showing session management
 */
export function SessionStatus() {
  const auth = useTypedAuth()

  if (!auth.isLoaded) {
    return <div>Loading authentication...</div>
  }

  if (!isAuthenticated(auth)) {
    return (
      <div className="session-status unauthenticated">
        <p>No active session</p>
      </div>
    )
  }

  const { session, user } = auth

  return (
    <div className="session-status authenticated">
      <h4>Session Information</h4>
      <div className="session-details">
        <p><strong>Session ID:</strong> {session.id}</p>
        <p><strong>Status:</strong> {session.status}</p>
        <p><strong>User:</strong> {user.fullName || user.username}</p>
        <p><strong>Last Active:</strong> {session.lastActiveAt.toLocaleString()}</p>
        <p><strong>Expires:</strong> {session.expireAt.toLocaleString()}</p>
        
        {session.lastActiveOrganizationId && (
          <p><strong>Organization:</strong> {session.lastActiveOrganizationId}</p>
        )}
        
        {session.factorVerificationAge && (
          <p><strong>Factor Age:</strong> {session.factorVerificationAge.join(', ')} minutes</p>
        )}
      </div>
    </div>
  )
}

/**
 * Component that demonstrates conditional rendering based on user properties
 */
export function UserActions() {
  const { user, isAuthenticated: authenticated } = useSafeUser()

  if (!authenticated || !user) {
    return (
      <div className="user-actions">
        <button type="button">Sign In</button>
      </div>
    )
  }

  const hasCompleteProfile = user.firstName && user.lastName && user.primaryEmailAddress
  const isEmailVerified = user.emailAddresses.some(email => 
    email.verification.status === 'verified'
  )

  return (
    <div className="user-actions">
      <button type="button">View Dashboard</button>
      
      {!hasCompleteProfile && (
        <button type="button" className="warning">
          Complete Profile
        </button>
      )}
      
      {!isEmailVerified && (
        <button type="button" className="warning">
          Verify Email
        </button>
      )}
      
      {user.username && (
        <button type="button">
          View Public Profile
        </button>
      )}
    </div>
  )
}