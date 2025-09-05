import { $authStore } from '@clerk/astro/client'
import { useStore } from '@nanostores/react'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useEffect, useState, useCallback, useRef } from 'react'

import type { Database } from '#libs/database.types'

export function useSupabase() {
  const { getToken, isLoaded, userId } = useStore($authStore)
  const [client, setClient] = useState<SupabaseClient<Database> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const tokenRef = useRef<string | null>(null)

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

      // Only try to get token if user is signed in
      if (userId) {
        try {
          token = await getToken({ template: 'supabase' })
          tokenRef.current = token
        } catch (err: any) {
          // Handle missing JWT template gracefully - check both error message and Clerk API error structure
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
  }, [getToken, userId])

  // Initialize client when auth state changes
  useEffect(() => {
    if (isLoaded) {
      initClient()
    }
  }, [isLoaded, userId, initClient])

  // Refresh token periodically for long-running sessions
  useEffect(() => {
    if (!userId || !client) return

    const refreshInterval = window.setInterval(
      async () => {
        try {
          const newToken = await getToken({ template: 'supabase' })

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
  }, [userId, client, getToken, initClient])

  return {
    client,
    loading: !isLoaded || loading,
    error,
    isAuthenticated: !!userId && !!tokenRef.current,
    refreshClient: initClient,
  }
}

// Hook for real-time subscriptions
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

        // Set up real-time subscription
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
                  prev.map((item: T & { id: string }) =>
                    item.id === payload.new.id ? (payload.new as T) : item
                  )
                )
              } else if (payload.eventType === 'DELETE') {
                setData(prev =>
                  prev.filter((item: T & { id: string }) => item.id !== payload.old.id)
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
