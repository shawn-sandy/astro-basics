import { getEnvironmentConfig } from './env-config'

// Use environment configuration abstraction
const envConfig = getEnvironmentConfig()
const publicClerkKey = envConfig.getClerkPublishableKey()
const clerkSecretKey = envConfig.getClerkSecretKey()
const clerkWebhookSecret = envConfig.getClerkWebhookSecret()

/**
 * Configuration status for individual Clerk environment variables
 */
export type ClerkConfigStatus = {
  publishableKey: {
    exists: boolean
    isValid: boolean
    value?: string | undefined
  }
  secretKey: {
    exists: boolean
    isValid: boolean
    value?: string | undefined
  }
  webhookSecret: {
    exists: boolean
    isValid: boolean
    value?: string | undefined
  }
  isFullyConfigured: boolean
  hasBasicConfig: boolean
}

/**
 * Check if Clerk is configured with basic authentication keys
 * Similar to isSupabaseConfigured() pattern
 */
export function isClerkConfigured(): boolean {
  return envConfig.isClerkConfigured()
}

/**
 * Check if Clerk webhook is configured
 */
export function hasValidClerkWebhook(): boolean {
  return !!clerkWebhookSecret
}

/**
 * Get detailed configuration status for all Clerk environment variables
 */
export function getClerkConfigStatus(): ClerkConfigStatus {
  const publishableKeyExists = !!publicClerkKey
  const publishableKeyValid = publishableKeyExists

  const secretKeyExists = !!clerkSecretKey
  const secretKeyValid = secretKeyExists

  const webhookSecretExists = !!clerkWebhookSecret
  const webhookSecretValid = webhookSecretExists

  return {
    publishableKey: {
      exists: publishableKeyExists,
      isValid: publishableKeyValid,
      value: publishableKeyExists ? publicClerkKey : undefined,
    },
    secretKey: {
      exists: secretKeyExists,
      isValid: secretKeyValid,
      value: secretKeyExists ? '***REDACTED***' : undefined,
    },
    webhookSecret: {
      exists: webhookSecretExists,
      isValid: webhookSecretValid,
      value: webhookSecretExists ? '***REDACTED***' : undefined,
    },
    hasBasicConfig: publishableKeyValid && secretKeyValid,
    isFullyConfigured: publishableKeyValid && secretKeyValid && webhookSecretValid,
  }
}
