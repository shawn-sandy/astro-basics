import { $authStore } from '@clerk/astro/client'
import { useStore } from '@nanostores/react'
import React from 'react'

import { useFetchWithState } from '#hooks/useFetch'
import type { UserProfileApiResponse } from '#types/clerk'

export function UserProfile() {
  const { userId } = useStore($authStore)
  const { data, isLoading, error, retryCount, execute, retry } =
    useFetchWithState<UserProfileApiResponse>()

  const fetchUser = React.useCallback(async () => {
    if (!userId) return

    try {
      await execute('/api/user/profile', {
        headers: {
          'Cache-Control': 'no-cache',
        },
        timeout: 10_000,
        retries: 3,
      })
    } catch (error) {
      // Error is already handled by the hook
      console.error('Failed to fetch user profile:', error)
    }
  }, [userId, execute])

  const handleRetry = React.useCallback(() => {
    if (retryCount < 3) {
      retry()
    }
  }, [retry, retryCount])

  React.useEffect(() => {
    fetchUser()
  }, [fetchUser])

  // Loading state
  if (isLoading) {
    return (
      <div className="user-profile user-profile--loading">
        <div className="user-profile__skeleton" role="status" aria-label="Loading profile">
          <div className="skeleton-avatar" />
          <div className="skeleton-text" />
          <div className="skeleton-text" />
        </div>
      </div>
    )
  }

  // Not signed in
  if (!userId) {
    return (
      <div className="user-profile user-profile--signed-out">
        <p>Please sign in to view your profile</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="user-profile user-profile--error">
        <div className="error-content">
          <h3>Unable to Load Profile</h3>
          <p>{error.message}</p>
          {error.retryable && retryCount < 3 && (
            <button onClick={handleRetry} className="retry-button" type="button">
              Try Again ({3 - retryCount} attempts left)
            </button>
          )}
          {error.type === 'auth' && (
            <a href="/sign-in" className="auth-link">
              Sign In Again
            </a>
          )}
        </div>
      </div>
    )
  }

  const user = data?.user

  return (
    <div className="user-profile">
      <div className="user-profile__header">
        {user?.avatar_url && (
          <img
            src={user.avatar_url}
            alt={`${user.full_name || user.username || 'User'} profile `}
            className="user-profile__avatar"
            loading="lazy"
            onError={e => {
              // Handle broken image
              e.currentTarget.style.display = 'none'
            }}
          />
        )}
        <div className="user-profile__info">
          <h2 className="user-profile__name" id="user-profile-name">
            {user?.full_name || user?.username || 'User'}
          </h2>
          {user?.username && (
            <p className="user-profile__username" aria-describedby="user-profile-name">
              @{user.username}
            </p>
          )}
        </div>
      </div>

      <div className="user-profile__details">
        <div className="user-profile__detail">
          <span className="user-profile__label">Email:</span>
          <span className="user-profile__value">{user?.email || 'No email'}</span>
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

        {data?.message && (
          <div className="user-profile__detail">
            <span className="user-profile__label">Status:</span>
            <span className="user-profile__value">{data.message}</span>
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
