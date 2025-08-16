import React, { useCallback, useRef } from 'react'

export interface FetchOptions extends RequestInit {
  timeout?: number
  retries?: number
  retryDelay?: number
}

export interface FetchState<T = unknown> {
  data: T | null
  isLoading: boolean
  error: FetchError | null
  retryCount: number
}

export interface FetchError {
  type: 'network' | 'auth' | 'server' | 'validation' | 'timeout' | 'abort' | 'unknown'
  message: string
  status?: number | undefined
  retryable: boolean
  timestamp: number
}

export interface UseFetchReturn<T = unknown> {
  fetchWithTimeout: (url: string, options?: FetchOptions) => Promise<T>
  abortRequest: () => void
  isRequestInProgress: () => boolean
}

/**
 * Advanced fetch hook with timeout, retry logic, and proper error handling
 * Optimized for Astro + React environment with cross-platform compatibility
 */
export function useFetch<T = unknown>(): UseFetchReturn<T> {
  const abortControllerRef = useRef<AbortController | null>(null)
  const timeoutIdRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null)

  const cleanup = useCallback(() => {
    if (timeoutIdRef.current) {
      globalThis.clearTimeout(timeoutIdRef.current)
      timeoutIdRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  const createFetchError = useCallback(
    (error: unknown, status?: number, type?: FetchError['type']): FetchError => {
      let errorType: FetchError['type'] = type || 'unknown'
      let errorMessage = 'An unexpected error occurred'
      let retryable = false

      if (error instanceof Error) {
        errorMessage = error.message

        if (error.name === 'AbortError') {
          errorType = 'abort'
          errorMessage = 'Request was cancelled'
          retryable = false
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
          errorType = 'network'
          errorMessage = 'Network error: Unable to connect to server'
          retryable = true
        }
      }

      if (status) {
        switch (Math.floor(status / 100)) {
          case 4:
            errorType = status === 401 || status === 403 ? 'auth' : 'validation'
            retryable = status === 408 || status === 409 || status === 429
            break
          case 5:
            errorType = 'server'
            retryable = true
            break
          default:
            retryable = false
        }
      }

      return {
        type: errorType,
        message: errorMessage,
        status,
        retryable,
        timestamp: Date.now(),
      }
    },
    []
  )

  const fetchWithTimeout = useCallback(
    async (url: string, options: FetchOptions = {}): Promise<T> => {
      const { timeout = 10_000, retries = 3, retryDelay = 1000, ...fetchOptions } = options

      // Clean up any previous request
      cleanup()

      for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController()
        abortControllerRef.current = controller

        // Set up timeout
        const timeoutId: ReturnType<typeof globalThis.setTimeout> = globalThis.setTimeout(() => {
          controller.abort()
        }, timeout)
        timeoutIdRef.current = timeoutId

        try {
          const response = await globalThis.fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              ...fetchOptions.headers,
            },
          })

          // Clear timeout on successful fetch
          globalThis.clearTimeout(timeoutId)
          timeoutIdRef.current = null

          // Handle HTTP errors
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            const error = createFetchError(
              new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`),
              response.status
            )

            // Don't retry auth errors or client errors (except specific ones)
            if (!error.retryable || attempt === retries) {
              throw error
            }
          } else {
            // Successful response
            const data = await response.json()
            abortControllerRef.current = null
            return data as T
          }
        } catch (error) {
          globalThis.clearTimeout(timeoutId)
          timeoutIdRef.current = null

          const fetchError = createFetchError(error)

          // Handle specific error types
          if (fetchError.type === 'abort' && abortControllerRef.current?.signal.aborted) {
            fetchError.type = 'timeout'
            fetchError.message = 'Request timed out. Please check your connection.'
            fetchError.retryable = true
          }

          // Don't retry if it's the last attempt or error is not retryable
          if (attempt === retries || !fetchError.retryable) {
            abortControllerRef.current = null
            throw fetchError
          }

          // Exponential backoff for retries
          const delay = retryDelay * Math.pow(2, attempt)
          await new Promise(resolve => globalThis.setTimeout(resolve, delay))
        }
      }

      // This should never be reached, but TypeScript requires it
      throw createFetchError(new Error('Maximum retries exceeded'))
    },
    [cleanup, createFetchError]
  )

  const abortRequest = useCallback(() => {
    cleanup()
  }, [cleanup])

  const isRequestInProgress = useCallback((): boolean => {
    return abortControllerRef.current !== null && !abortControllerRef.current.signal.aborted
  }, [])

  return {
    fetchWithTimeout,
    abortRequest,
    isRequestInProgress,
  }
}

/**
 * Higher-order hook that combines useFetch with React state management
 * Provides a complete data fetching solution with loading states and error handling
 */
export function useFetchWithState<T = unknown>(url?: string, options?: FetchOptions) {
  const { fetchWithTimeout, abortRequest, isRequestInProgress } = useFetch<T>()

  const [state, setState] = React.useState<FetchState<T>>({
    data: null,
    isLoading: false,
    error: null,
    retryCount: 0,
  })

  const execute = useCallback(
    async (requestUrl: string = url || '', requestOptions: FetchOptions = options || {}) => {
      if (!requestUrl) {
        throw new Error('URL is required for fetch request')
      }

      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }))

      try {
        const data = await fetchWithTimeout(requestUrl, requestOptions)
        setState(prev => ({
          ...prev,
          data,
          isLoading: false,
          error: null,
          retryCount: 0,
        }))
        return data
      } catch (error) {
        const fetchError = error as FetchError
        setState(prev => ({
          ...prev,
          data: null,
          isLoading: false,
          error: fetchError,
          retryCount: prev.retryCount + 1,
        }))
        throw error
      }
    },
    [fetchWithTimeout, url, options]
  )

  const retry = useCallback(() => {
    if (url) {
      return execute(url, options)
    }
    throw new Error('Cannot retry without a URL')
  }, [execute, url, options])

  return {
    ...state,
    execute,
    retry,
    abort: abortRequest,
    isRequestInProgress,
  }
}
