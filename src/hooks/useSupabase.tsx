import { $authStore, $sessionStore, $isLoadedStore } from '@clerk/astro/client'
import { useStore } from '@nanostores/react'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useEffect, useState, useCallback, useRef } from 'react'

import type { Database } from '#libs/database.types'

/**
 * Custom React hook for managing authenticated Supabase client with Clerk integration.
 *
 * This hook bridges Clerk authentication with Supabase by obtaining JWT tokens from Clerk
 * and injecting them into Supabase client headers. It handles graceful degradation when
 * the 'supabase' JWT template isn't configured in Clerk, falling back to anonymous access.
 *
 * The implementation uses a token caching strategy with periodic refresh (5-minute intervals)
 * to maintain fresh credentials for long-running sessions without unnecessary client recreation.
 *
 * @returns {Object} Supabase client state and utilities
 * @returns {SupabaseClient<Database> | null} client - Typed Supabase client instance, null during initialization
 * @returns {boolean} loading - True during initial auth load or client initialization
 * @returns {string | null} error - Error message if client initialization fails, null on success
 * @returns {boolean} isAuthenticated - True when user has valid Clerk session AND Supabase token
 * @returns {Function} refreshClient - Manual client refresh function for forced token updates
 *
 * @example
 * // Basic usage in React component
 * function MyComponent() {
 *   const { client, loading, error, isAuthenticated } = useSupabase();
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *
 *   // Use client for authenticated queries
 *   const fetchUserData = async () => {
 *     if (!client) return;
 *     const { data } = await client.from('users').select('*');
 *   };
 * }
 *
 * @example
 * // Force token refresh after permission changes
 * const { client, refreshClient } = useSupabase();
 * await updateUserPermissions(userId);
 * await refreshClient(); // Ensure new permissions are reflected
 *
 * @throws {Error} Logs initialization errors but doesn't throw - sets error state instead
 *
 * @see {@link https://clerk.com/docs/integrations/databases/supabase} Clerk Supabase integration guide
 * @see {@link Database} for typed database schema
 * @since 1.0.0
 */
export function useSupabase() {
  const { userId } = useStore($authStore)
  const session = useStore($sessionStore)
  const isLoaded = useStore($isLoadedStore)
  const [client, setClient] = useState<SupabaseClient<Database> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const tokenRef = useRef<string | null>(null)

  /**
   * Initializes or reinitializes the Supabase client with current authentication state.
   *
   * This callback handles the complex token acquisition flow from Clerk, including
   * detection of missing JWT templates (common during initial setup). The function
   * intentionally continues with anonymous access when JWT templates are unavailable
   * rather than blocking the entire application, enabling gradual authentication rollout.
   *
   * Authentication configuration (`persistSession: false`, `autoRefreshToken: false`)
   * is disabled because token lifecycle is managed entirely by Clerk, not Supabase's
   * built-in auth system. This prevents conflicts between the two auth providers.
   *
   * @async
   * @returns {Promise<void>} Completes when client initialization finishes or fails
   *
   * @see {@link https://clerk.com/docs/backend-requests/resources/jwt-templates} JWT template configuration
   * @since 1.0.0
   */
  const initClient = useCallback(async () => {
    // Check for required environment variables
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      setError('Supabase configuration missing')
      setLoading(false)
      return
    }

    try {
      let token: string | null = null

      // Only try to get token if user is signed in and session exists
      if (userId && session) {
        try {
          token = await session.getToken({ template: 'supabase' })
          tokenRef.current = token
        } catch (err: any) {
          /**
           * Dual error detection pattern for Clerk JWT template availability.
           *
           * Clerk returns errors in two formats depending on context:
           * 1. Standard Error instances with descriptive messages (development/local)
           * 2. Structured API error objects with clerkError flag (production/API calls)
           *
           * This dual check ensures reliable detection across all Clerk SDK versions
           * and deployment environments, preventing false negatives during error handling.
           */
          const isJwtTemplateError =
            (err instanceof Error && err.message.includes('No JWT template exists with name')) ||
            (err?.clerkError &&
              err?.errors?.[0]?.code === 'resource_not_found' &&
              err?.errors?.[0]?.longMessage?.includes('No JWT template exists with name'))

          if (isJwtTemplateError) {
            console.warn(
              'Clerk JWT template "supabase" not configured. Using anonymous access.',
              'To enable authenticated operations, create a JWT template named "supabase" in your Clerk Dashboard.',
              'See docs/jwt-implementation-guide.md for setup instructions.'
            )
          } else {
            console.warn('Failed to get Supabase token from Clerk:', err)
          }
          // Continue without token - will use anon key
        }
      }

      /**
       * Supabase client configuration for Clerk-managed authentication.
       *
       * Key design decisions:
       * - `persistSession: false` - Session persistence disabled because Clerk owns the session
       * - `autoRefreshToken: false` - Token refresh handled by our 5-minute interval, not Supabase
       * - Conditional Authorization header - Only inject JWT when available to support graceful degradation
       *
       * This configuration prevents Supabase from attempting its own auth management,
       * which would conflict with Clerk's token lifecycle and potentially cause race conditions
       * in token refresh scenarios.
       */
      const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })

      setClient(supabaseClient)
      setError(null)
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err)
      setError(err instanceof Error ? err.message : 'Failed to initialize Supabase')
    } finally {
      setLoading(false)
    }
  }, [session, userId])

  // Initialize client when auth state changes
  useEffect(() => {
    if (isLoaded) {
      initClient()
    }
  }, [isLoaded, userId, initClient])

  /**
   * Periodic token refresh effect for maintaining fresh authentication state.
   *
   * This effect implements a 5-minute refresh interval chosen to balance two concerns:
   * 1. Token freshness - Most JWT tokens expire in 60 minutes, refreshing at 5-minute
   *    intervals ensures we catch token changes well before expiration
   * 2. Performance - Frequent refresh would cause unnecessary client recreation overhead
   *
   * The token comparison (`newToken !== tokenRef.current`) prevents wasteful client
   * recreation when tokens haven't actually changed, which is common in stable sessions.
   * This optimization significantly reduces React re-renders in long-lived components.
   *
   * Silent JWT template error handling prevents console spam in scenarios where the
   * template hasn't been configured yet, improving developer experience during setup.
   *
   * @performance Triggers client recreation only when token changes, not on every interval
   * @since 1.0.0
   */
  useEffect(() => {
    if (!userId || !client || !session) return

    const refreshInterval = window.setInterval(
      async () => {
        try {
          const newToken = await session.getToken({ template: 'supabase' })

          // Only recreate client if token changed
          if (newToken !== tokenRef.current) {
            tokenRef.current = newToken
            await initClient()
          }
        } catch (err: any) {
          // Silently handle JWT template errors to avoid spamming logs
          const isJwtTemplateError =
            (err instanceof Error && err.message.includes('No JWT template exists with name')) ||
            (err?.clerkError &&
              err?.errors?.[0]?.code === 'resource_not_found' &&
              err?.errors?.[0]?.longMessage?.includes('No JWT template exists with name'))

          if (!isJwtTemplateError) {
            console.error('Failed to refresh Supabase token:', err)
          }
        }
      },
      5 * 60 * 1000
    ) // Refresh every 5 minutes

    return () => window.clearInterval(refreshInterval)
  }, [userId, client, session, initClient])

  return {
    client,
    loading: !isLoaded || loading,
    error,
    isAuthenticated: !!userId && !!tokenRef.current,
    refreshClient: initClient,
  }
}

/**
 * Custom React hook for managing real-time Supabase subscriptions with authentication awareness.
 *
 * This hook provides a declarative interface for subscribing to PostgreSQL table changes via
 * Supabase's real-time engine. It automatically handles the complete lifecycle: initial data
 * fetch, subscription setup, state updates, and cleanup.
 *
 * The implementation uses authentication-aware filtering where filters are only applied when
 * the user is authenticated. This enables Row Level Security (RLS) policies to work correctly
 * while still allowing anonymous users to subscribe to public data without filters.
 *
 * State updates use optimistic patterns (INSERT prepends to array) to provide immediate
 * feedback before server confirmation, improving perceived performance for real-time interactions.
 *
 * @template T - The TypeScript type for table records, defaults to unknown for maximum flexibility
 * @param {string} tableName - PostgreSQL table name to subscribe to (must exist in Database schema)
 * @param {string} [filter] - Optional Supabase filter string (e.g., "user_id.eq.abc123")
 * @param {boolean} [enabled=true] - Whether subscription is active, useful for conditional subscriptions
 *
 * @returns {Object} Subscription state and data
 * @returns {T[]} data - Array of table records matching subscription criteria
 * @returns {boolean} loading - True during initial fetch, false once subscription is established
 * @returns {string | null} error - Error message if subscription setup fails, null on success
 *
 * @example
 * // Subscribe to all posts (public access)
 * const { data: posts, loading, error } = useSupabaseSubscription('posts');
 *
 * @example
 * // Subscribe to user's own comments only when authenticated
 * const { isAuthenticated, userId } = useSupabase();
 * const { data: myComments } = useSupabaseSubscription(
 *   'comments',
 *   `user_id.eq.${userId}`,
 *   isAuthenticated // Only subscribe when authenticated
 * );
 *
 * @example
 * // Conditional subscription based on UI state
 * const [showLiveUpdates, setShowLiveUpdates] = useState(false);
 * const { data } = useSupabaseSubscription(
 *   'notifications',
 *   undefined,
 *   showLiveUpdates // User controls whether real-time updates are active
 * );
 *
 * @see {@link https://supabase.com/docs/guides/realtime} Supabase Realtime documentation
 * @see {@link useSupabase} for authenticated client access
 * @since 1.0.0
 */
export function useSupabaseSubscription<T = unknown>(
  tableName: string,
  filter?: string,
  enabled = true
) {
  const { client, isAuthenticated } = useSupabase()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!client || !enabled) {
      setLoading(false)
      return
    }

    let subscription: ReturnType<typeof client.channel> | undefined

    /**
     * Establishes real-time subscription with initial data hydration.
     *
     * This async function implements a two-phase setup pattern:
     * 1. Initial fetch - Populates state immediately to avoid empty UI flicker
     * 2. Subscription setup - Begins listening for subsequent changes
     *
     * Authentication-aware filtering is applied conditionally to both phases,
     * ensuring consistent behavior between initial fetch and real-time updates.
     * This prevents security gaps where initial data might bypass RLS policies
     * that real-time updates respect.
     *
     * The `event: '*'` wildcard captures INSERT, UPDATE, and DELETE operations,
     * providing complete CRUD coverage for comprehensive real-time state management.
     *
     * @async
     * @throws {Error} Thrown errors are caught and stored in error state, not propagated
     */
    const setupSubscription = async () => {
      try {
        // Initial data fetch
        let query = client.from(tableName).select('*')

        if (filter && isAuthenticated) {
          query = query.or(filter)
        }

        const { data: initialData, error: fetchError } = await query

        if (fetchError) throw fetchError

        setData(initialData || [])
        setError(null)

        /**
         * Real-time subscription configuration with optimistic state updates.
         *
         * Event handling strategy per operation type:
         * - INSERT: Prepends new record to array start for immediate visibility (common UX pattern)
         * - UPDATE: Immutably replaces matching record to trigger React re-render
         * - DELETE: Filters out removed record, maintains immutability for React optimization
         *
         * All state updates use functional setState patterns to avoid stale closure issues
         * when multiple rapid updates occur within the same render cycle.
         */
        const channel = client.channel(`${tableName}-changes`)

        subscription = channel
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: tableName,
              ...(filter && isAuthenticated ? { filter } : {}),
            },
            payload => {
              if (payload.eventType === 'INSERT') {
                setData(prev => [payload.new as T, ...prev])
              } else if (payload.eventType === 'UPDATE') {
                setData(prev =>
                  prev.map(item => {
                    const record = item as T & { id?: string }
                    return record.id === payload.new.id ? (payload.new as T) : item
                  })
                )
              } else if (payload.eventType === 'DELETE') {
                setData(prev =>
                  prev.filter(item => {
                    const record = item as T & { id?: string }
                    return record.id !== payload.old.id
                  })
                )
              }
            }
          )
          .subscribe()
      } catch (err) {
        console.error(`Failed to setup subscription for ${tableName}:`, err)
        setError(err instanceof Error ? err.message : 'Subscription failed')
      } finally {
        setLoading(false)
      }
    }

    setupSubscription()

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [client, tableName, filter, enabled, isAuthenticated])

  return { data, loading, error }
}
