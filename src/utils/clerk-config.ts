/**
 * Clerk Configuration Utility
 * 
 * Centralized configuration and helpers for optional Clerk authentication.
 * This module handles the detection of valid Clerk environment variables
 * and provides safe access to Clerk functionality.
 */

import { logger } from '#utils/logger'

/**
 * List of dummy/placeholder values that indicate Clerk is not properly configured
 */
const DUMMY_VALUES = [
  'YOUR_CLERK_PUBLISHABLE_KEY',
  'YOUR_CLERK_SECRET_KEY',
  '',
  undefined,
  null,
] as const

/**
 * Validates if a Clerk environment variable has a real value (not a dummy/placeholder)
 */
function isValidClerkValue(value: string | undefined): boolean {
  if (!value) return false
  
  // Check against dummy values
  if (DUMMY_VALUES.some(dummy => 
    dummy && (value === dummy || value.startsWith(dummy))
  )) {
    return false
  }
  
  // Check minimum length for realistic keys
  if (value.length < 10) return false
  
  return true
}

/**
 * Validates if Clerk publishable key is properly configured
 */
export function hasValidPublishableKey(): boolean {
  const key = import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY
  return isValidClerkValue(key)
}

/**
 * Validates if Clerk secret key is properly configured
 */
export function hasValidSecretKey(): boolean {
  const key = import.meta.env.CLERK_SECRET_KEY
  return isValidClerkValue(key)
}

/**
 * Validates if both required Clerk keys are properly configured
 */
export function hasValidClerkKeys(): boolean {
  return hasValidPublishableKey() && hasValidSecretKey()
}

/**
 * Determines if Clerk authentication is enabled and properly configured
 */
export const isClerkEnabled = hasValidClerkKeys()

/**
 * Gets the Clerk publishable key if available
 */
export function getClerkPublishableKey(): string | undefined {
  return hasValidPublishableKey() ? import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY : undefined
}

/**
 * Gets the Clerk secret key if available (server-side only)
 */
export function getClerkSecretKey(): string | undefined {
  return hasValidSecretKey() ? import.meta.env.CLERK_SECRET_KEY : undefined
}

/**
 * Logs the current Clerk configuration status
 */
export function logClerkStatus(): void {
  if (isClerkEnabled) {
    logger.info('Clerk authentication is enabled and configured')
    return
  }
  
  logger.warn('Clerk authentication is disabled - missing or invalid environment variables')
  
  if (!hasValidPublishableKey()) {
    logger.warn('Missing valid PUBLIC_CLERK_PUBLISHABLE_KEY')
  }
  
  if (!hasValidSecretKey()) {
    logger.warn('Missing valid CLERK_SECRET_KEY')
  }
}

/**
 * Configuration object for Clerk integration
 */
export const clerkConfig = {
  enabled: isClerkEnabled,
  publishableKey: getClerkPublishableKey(),
  secretKey: getClerkSecretKey(),
  hasValidKeys: hasValidClerkKeys(),
  hasPublishableKey: hasValidPublishableKey(),
  hasSecretKey: hasValidSecretKey(),
} as const

// Log status on module load (only in development)
if (import.meta.env.DEV) {
  logClerkStatus()
}