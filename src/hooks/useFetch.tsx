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

  /**
   * Cleans up active timeout and abort controller to prevent memory leaks.
   * Aborts any in-progress fetch request and clears timeout timers.
   *
   * @returns {void}
   * @example
   * ```tsx
   * cleanup() // Cancels ongoing request and clears timers
   * ```
   */
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

  /**
   * Creates a standardized FetchError object from various error sources.
   * Analyzes the error type and HTTP status to determine if the error is retryable.
   *
   * @param {unknown} error - The original error object or message
   * @param {number} [status] - HTTP status code from the response
   * @param {FetchError['type']} [type] - Optional explicit error type override
   * @returns {FetchError} Standardized error object with type classification and retry information
   * @example
   * ```tsx
   * const fetchError = createFetchError(new Error('Network failed'), 500)
   * // Returns: { type: 'server', message: 'Network failed', status: 500, retryable: true, timestamp: 1642291200000 }
   * ```
   */
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

  /**
   * Executes a fetch request with timeout, retry logic, and comprehensive error handling.
   * Implements exponential backoff for retries and proper cleanup of resources.
   *
   * @async
   * @param {string} url - The URL to fetch from
   * @param {FetchOptions} [options={}] - Fetch configuration including timeout, retries, and standard fetch options
   * @param {number} [options.timeout=10000] - Request timeout in milliseconds
   * @param {number} [options.retries=3] - Maximum number of retry attempts
   * @param {number} [options.retryDelay=1000] - Base delay between retries in milliseconds (uses exponential backoff)
   * @returns {Promise<T>} Promise that resolves to the parsed JSON response data
   * @throws {FetchError} Standardized error object with retry information and error classification
   * @example
   * ```tsx
   * const data = await fetchWithTimeout('/api/users', {
   *   timeout: 5000,
   *   retries: 2,
   *   method: 'POST',
   *   body: JSON.stringify({ name: 'John' })
   * })
   * ```
   */
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

  /**
   * Aborts the current fetch request and performs cleanup.
   * Cancels any ongoing request and clears associated timers.
   *
   * @returns {void}
   * @example
   * ```tsx
   * const { abortRequest } = useFetch()
   * // Later, if you need to cancel the request:
   * abortRequest()
   * ```
   */
  const abortRequest = useCallback(() => {
    cleanup()
  }, [cleanup])

  /**
   * Checks if a fetch request is currently in progress.
   * Returns true if there's an active AbortController that hasn't been aborted.
   *
   * @returns {boolean} True if a request is currently in progress, false otherwise
   * @example
   * ```tsx
   * const { isRequestInProgress } = useFetch()
   * if (isRequestInProgress()) {
   *   console.log('Request is still loading...')
   * }
   * ```
   */
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

  /**
   * Executes a fetch request with automatic state management.
   * Updates loading, data, and error states throughout the request lifecycle.
   *
   * @async
   * @param {string} [requestUrl] - The URL to fetch from (defaults to hook's url parameter)
   * @param {FetchOptions} [requestOptions] - Fetch options (defaults to hook's options parameter)
   * @returns {Promise<T>} Promise that resolves to the response data
   * @throws {FetchError} Re-throws the error after updating component state
   * @example
   * ```tsx
   * const { execute, isLoading, data, error } = useFetchWithState()
   * try {
   *   const result = await execute('/api/users', { method: 'GET' })
   *   // Component state automatically updated with result
   * } catch (error) {
   *   // Error state automatically updated
   * }
   * ```
   */
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

  /**
   * Retries the last fetch request using the original URL and options.
   * Can only be used when the hook was initialized with a URL parameter.
   *
   * @returns {Promise<T>} Promise that resolves to the response data
   * @throws {Error} Throws error if no URL was provided during hook initialization
   * @example
   * ```tsx
   * const { retry, error } = useFetchWithState('/api/users')
   * if (error && error.retryable) {
   *   await retry() // Retries the original request to '/api/users'
   * }
   * ```
   */
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
