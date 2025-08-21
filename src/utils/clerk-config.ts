// Environment variables - no assertion, might be undefined
const publicClerkKey = import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY
const clerkSecretKey = import.meta.env.CLERK_SECRET_KEY
const clerkWebhookSecret = import.meta.env.CLERK_WEBHOOK_SECRET

/**
 * Configuration status for individual Clerk environment variables
 */
export type ClerkConfigStatus = {
  publishableKey: {
    exists: boolean
    isValid: boolean
    value?: string
  }
  secretKey: {
    exists: boolean
    isValid: boolean
    value?: string
  }
  webhookSecret: {
    exists: boolean
    isValid: boolean
    value?: string
  }
  isFullyConfigured: boolean
  hasBasicConfig: boolean
}

/**
 * Check if Clerk is configured with basic authentication keys
 * Similar to isSupabaseConfigured() pattern
 */
export function isClerkConfigured(): boolean {
  return !!(
    publicClerkKey &&
    publicClerkKey !== 'YOUR_CLERK_PUBLISHABLE_KEY' &&
    clerkSecretKey &&
    clerkSecretKey !== 'YOUR_CLERK_SECRET_KEY'
  )
}

/**
 * Check if Clerk webhook is configured
 */
export function hasValidClerkWebhook(): boolean {
  return !!(clerkWebhookSecret && clerkWebhookSecret !== 'YOUR_CLERK_WEBHOOK_SECRET')
}

/**
 * Get detailed configuration status for all Clerk environment variables
 */
export function getClerkConfigStatus(): ClerkConfigStatus {
  const publishableKeyExists = !!publicClerkKey
  const publishableKeyValid =
    publishableKeyExists && publicClerkKey !== 'YOUR_CLERK_PUBLISHABLE_KEY'

  const secretKeyExists = !!clerkSecretKey
  const secretKeyValid = secretKeyExists && clerkSecretKey !== 'YOUR_CLERK_SECRET_KEY'

  const webhookSecretExists = !!clerkWebhookSecret
  const webhookSecretValid =
    webhookSecretExists && clerkWebhookSecret !== 'YOUR_CLERK_WEBHOOK_SECRET'

  return {
    publishableKey: {
      exists: publishableKeyExists,
      isValid: publishableKeyValid,
      ...(publishableKeyExists && { value: publishableKeyValid ? publicClerkKey : 'PLACEHOLDER' }),
    },
    secretKey: {
      exists: secretKeyExists,
      isValid: secretKeyValid,
      ...(secretKeyExists && { value: secretKeyValid ? '***REDACTED***' : 'PLACEHOLDER' }),
    },
    webhookSecret: {
      exists: webhookSecretExists,
      isValid: webhookSecretValid,
      ...(webhookSecretExists && { value: webhookSecretValid ? '***REDACTED***' : 'PLACEHOLDER' }),
    },
    hasBasicConfig: publishableKeyValid && secretKeyValid,
    isFullyConfigured: publishableKeyValid && secretKeyValid && webhookSecretValid,
  }
}
