import { $authStore } from '@clerk/astro/client'
import { useStore } from '@nanostores/react'
import React from 'react'

interface UserPreferences {
  theme?: string
  notifications?: boolean
  [key: string]: unknown
}

interface UserData {
  user: {
    clerk_id?: string
    email?: string
    username?: string
    full_name?: string
    avatar_url?: string
    created_at?: string
    user_preferences?: UserPreferences[]
  } | null
  message?: string
}

export function UserProfile() {
  const { userId } = useStore($authStore)
  const [userData, setUserData] = React.useState<UserData | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchUser() {
      if (!userId) {
        setIsLoading(false)
        return
      }

      try {
        // Fetch user data from our API endpoint
        const response = await window.fetch('/api/user/profile')
        const data = await response.json()

        if (response.ok) {
          setUserData(data)
        } else {
          console.log('User profile response:', data)
          // If no profile synced yet, show basic info
          setUserData({
            user: {
              clerk_id: userId,
              email: 'Not synced',
              username: 'Not synced',
              full_name: 'Not synced',
              created_at: new Date().toISOString(),
            },
          })
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error)
        // Show basic userId even if fetch fails
        setUserData({
          user: {
            clerk_id: userId,
            email: 'Unable to fetch',
            username: 'Unable to fetch',
            full_name: 'Unable to fetch',
            created_at: new Date().toISOString(),
          },
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [userId])

  if (isLoading) {
    return (
      <div className="user-profile user-profile--loading">
        <div className="user-profile__skeleton">
          <div className="skeleton-avatar" />
          <div className="skeleton-text" />
          <div className="skeleton-text" />
        </div>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="user-profile user-profile--signed-out">
        <p>Please sign in to view your profile</p>
      </div>
    )
  }

  const user = userData?.user

  return (
    <div className="user-profile">
      <div className="user-profile__header">
        {user?.avatar_url && (
          <img
            src={user.avatar_url}
            alt={`${user.full_name || user.username || 'User'} avatar`}
            className="user-profile__avatar"
          />
        )}
        <div className="user-profile__info">
          <h2 className="user-profile__name">{user?.full_name || user?.username || 'User'}</h2>
          {user?.username && <p className="user-profile__username">@{user.username}</p>}
        </div>
      </div>

      <div className="user-profile__details">
        <div className="user-profile__detail">
          <span className="user-profile__label">Email:</span>
          <span className="user-profile__value">{user?.email || 'No email'}</span>
        </div>

        <div className="user-profile__detail">
          <span className="user-profile__label">Clerk ID:</span>
          <span className="user-profile__value user-profile__value--mono">
            {user?.clerk_id || userId}
          </span>
        </div>

        {user?.created_at && (
          <div className="user-profile__detail">
            <span className="user-profile__label">Profile Created:</span>
            <span className="user-profile__value">
              {new Date(user.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        )}

        {userData?.message && (
          <div className="user-profile__detail">
            <span className="user-profile__label">Status:</span>
            <span className="user-profile__value">{userData.message}</span>
          </div>
        )}

        {!user && userId && (
          <div className="user-profile__detail">
            <p className="user-profile__sync-message">
              User profile not synced with database.
              <button
                onClick={() => window.location.reload()}
                className="user-profile__sync-button"
              >
                Refresh
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default UserProfile
