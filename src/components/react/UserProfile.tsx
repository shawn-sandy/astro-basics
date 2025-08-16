import { $authStore } from '@clerk/astro/client'
import { useStore } from '@nanostores/react'
import React from 'react'
import type { UserProfileApiResponse, ApiError } from '#types/clerk'

interface UserProfileState {
  data: UserProfileApiResponse | null
  isLoading: boolean
  error: ApiError | null
  retryCount: number
}

export function UserProfile() {
  const { userId } = useStore($authStore)
  const [state, setState] = React.useState<UserProfileState>({
    data: null,
    isLoading: true,
    error: null,
    retryCount: 0
  })

  const fetchUser = React.useCallback(async (retryAttempt = 0) => {
    if (!userId) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: null
      }))
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

      const response = await fetch('/api/user/profile', {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      })

      clearTimeout(timeoutId)

      let data: UserProfileApiResponse
      try {
        data = await response.json()
      } catch (parseError) {
        throw new Error(`Invalid JSON response: ${response.status}`)
      }

      if (response.ok) {
        setState(prev => ({
          ...prev,
          data,
          isLoading: false,
          error: null,
          retryCount: 0
        }))
      } else {
        // Handle different HTTP error codes
        let errorType: ApiError['type'] = 'server'
        let errorMessage = data.error || `HTTP ${response.status}`
        let retryable = false

        switch (response.status) {
          case 401:
            errorType = 'auth'
            errorMessage = 'Authentication required. Please sign in again.'
            retryable = false
            break
          case 403:
            errorType = 'auth'
            errorMessage = 'Access denied. Insufficient permissions.'
            retryable = false
            break
          case 404:
            errorType = 'server'
            errorMessage = 'Profile service not found.'
            retryable = true
            break
          case 429:
            errorType = 'network'
            errorMessage = 'Too many requests. Please try again later.'
            retryable = true
            break
          case 500:
          case 502:
          case 503:
          case 504:
            errorType = 'server'
            errorMessage = 'Server error. Please try again.'
            retryable = true
            break
          default:
            errorType = 'unknown'
            retryable = response.status < 500
        }

        setState(prev => ({
          ...prev,
          data: null,
          isLoading: false,
          error: { 
            type: errorType, 
            message: errorMessage, 
            retryable,
            timestamp: Date.now()
          },
          retryCount: retryAttempt
        }))
      }
    } catch (error) {
      let errorType: ApiError['type'] = 'network'
      let errorMessage = 'Network error occurred'
      let retryable = true

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. Please check your connection.'
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Unable to connect to server. Please check your internet connection.'
        } else {
          errorMessage = error.message
          errorType = 'unknown'
        }
      }

      setState(prev => ({
        ...prev,
        data: null,
        isLoading: false,
        error: { 
          type: errorType, 
          message: errorMessage, 
          retryable,
          timestamp: Date.now()
        },
        retryCount: retryAttempt
      }))
    }
  }, [userId])

  const handleRetry = React.useCallback(() => {
    if (state.retryCount < 3) { // Max 3 retries
      fetchUser(state.retryCount + 1)
    }
  }, [fetchUser, state.retryCount])

  React.useEffect(() => {
    fetchUser()
  }, [fetchUser])

  // Loading state
  if (state.isLoading) {
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
  if (state.error) {
    return (
      <div className="user-profile user-profile--error">
        <div className="error-content">
          <h3>Unable to Load Profile</h3>
          <p>{state.error.message}</p>
          {state.error.retryable && state.retryCount < 3 && (
            <button 
              onClick={handleRetry}
              className="retry-button"
              type="button"
            >
              Try Again ({3 - state.retryCount} attempts left)
            </button>
          )}
          {state.error.type === 'auth' && (
            <a href="/sign-in" className="auth-link">
              Sign In Again
            </a>
          )}
        </div>
      </div>
    )
  }

  const user = state.data?.user

  return (
    <div className="user-profile">
      <div className="user-profile__header">
        {user?.avatar_url && (
          <img
            src={user.avatar_url}
            alt={`${user.full_name || user.username || 'User'} profile picture`}
            className="user-profile__avatar"
            loading="lazy"
            onError={(e) => {
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
