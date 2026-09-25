import type { AstroGlobal } from 'astro'

import { fetchUserWithRole } from '#utils/user-sync'

/** The signed-in user's details, shaped for display in the dashboard. */
export type DashboardUser = {
  /** Full name, else username. */
  name: string | undefined
  /** First name for the greeting, else `name`. */
  firstName: string | undefined
  /** Primary email address, else the first one on the account. */
  email: string | undefined
  /** Whether that email is verified. */
  emailVerified: boolean
  /** Role key; `member` when none is stored, as in `UserInfo`. */
  role: string
  /** Last sign-in, formatted for display. */
  lastSignIn: string | undefined
  /** Avatar URL. */
  imageUrl: string | undefined
}

/**
 * One lookup per request. The layout (for the sidebar) and the page (for the
 * greeting and account panel) both ask; keying on `Astro.locals`, which is
 * shared by every component in a render, makes the second ask reuse the first
 * Clerk call instead of repeating it.
 */
const requestCache = new WeakMap<object, Promise<DashboardUser | null>>()

/**
 * Returns the signed-in user for dashboard display, or `null` when there is no
 * signed-in user or the lookup fails.
 *
 * `Astro.locals.userId` is unset whenever the Clerk keys are not configured,
 * because the middleware then skips auth; this returns `null` in that case
 * rather than calling Clerk.
 *
 * @param astro - The page or component's `Astro` global.
 * @returns The user's display details, or `null`.
 * @example
 * ```astro
 * ---
 * const user = await getDashboardUser(Astro)
 * ---
 * <h1>{user?.firstName ? `Welcome back, ${user.firstName}` : 'Welcome back'}</h1>
 * ```
 */
export function getDashboardUser(astro: AstroGlobal): Promise<DashboardUser | null> {
  const cached = requestCache.get(astro.locals)
  if (cached) return cached

  const pending = loadDashboardUser(astro)
  requestCache.set(astro.locals, pending)
  return pending
}

async function loadDashboardUser(astro: AstroGlobal): Promise<DashboardUser | null> {
  const { userId } = astro.locals
  if (!userId) return null

  try {
    const { user, userRole } = await fetchUserWithRole(userId, astro)
    if (!user) return null

    const primaryEmail =
      user.emailAddresses.find(email => email.id === user.primaryEmailAddressId) ??
      user.emailAddresses[0]
    const name = user.fullName || user.username || undefined

    return {
      name,
      firstName: user.firstName || name,
      email: primaryEmail?.emailAddress,
      emailVerified: primaryEmail?.verification?.status === 'verified',
      role: userRole ?? 'member',
      lastSignIn: user.lastSignInAt
        ? new Date(user.lastSignInAt).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : undefined,
      imageUrl: user.imageUrl || undefined,
    }
  } catch (error) {
    // `fetchUserWithRole` reports failures in its result; this guards anything it lets escape.
    console.error('Failed to load the dashboard user:', error)
    return null
  }
}
