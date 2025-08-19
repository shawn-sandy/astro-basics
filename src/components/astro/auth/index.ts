/**
 * Optional Authentication Components
 * 
 * These components provide a graceful fallback when Clerk authentication
 * is disabled, allowing the application to build and run without auth.
 */

export { default as OptionalSignInButton } from './OptionalSignInButton.astro'
export { default as OptionalUserButton } from './OptionalUserButton.astro'
export { default as OptionalSignedIn } from './OptionalSignedIn.astro'
export { default as OptionalSignedOut } from './OptionalSignedOut.astro'
export { default as AuthStatusBanner } from './AuthStatusBanner.astro'