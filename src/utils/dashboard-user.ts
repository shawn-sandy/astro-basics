import type { AstroGlobal } from 'astro'

import { fetchUserWithRole, type UserWithRoleResult } from '#utils/user-sync'

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
  /** Last sign-in in UTC, labelled with the zone. */
  lastSignIn: string | undefined
  /** Avatar URL. */
  imageUrl: string | undefined
}

/**
 * One Clerk lookup per request. The dashboard layout (for the sidebar), the
 * page (for the greeting and account panel) and `UserInfo` all ask; keying on
 * `Astro.locals`, which Astro creates per request and shares with every
 * component in that render, makes every later ask reuse the first call.
 */
const requestCache = new WeakMap<object, Promise<UserWithRoleResult | null>>()

/**
 * `fetchUserWithRole` for the signed-in user, at most once per request.
 *
 * Resolves to `null` without calling Clerk when there is no signed-in user.
 * `Astro.locals.userId` is unset whenever the Clerk keys are not configured,
 * because the middleware then skips auth.
 *
 * @param astro - The page or component's `Astro` global.
 * @returns The raw result, including its `error` and `roleError`, or `null`.
 * @example
 * ```astro
 * ---
 * const result = await fetchCurrentUserWithRole(Astro)
 * ---
 * {result?.user && <p>{result.user.fullName}</p>}
 * ```
 */
export function fetchCurrentUserWithRole(astro: AstroGlobal): Promise<UserWithRoleResult | null> {
  const cached = requestCache.get(astro.locals)
  if (cached) return cached

  const { userId } = astro.locals
  const pending = userId ? fetchUserWithRole(userId, astro) : Promise.resolve(null)
  requestCache.set(astro.locals, pending)
  return pending
}

/**
 * Returns the signed-in user for dashboard display, or `null` when there is no
 * signed-in user or the lookup fails. Shares the request's single Clerk call
 * through `fetchCurrentUserWithRole`.
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
export async function getDashboardUser(astro: AstroGlobal): Promise<DashboardUser | null> {
  try {
    const result = await fetchCurrentUserWithRole(astro)
    const user = result?.user
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
      role: result.userRole ?? 'member',
      // The server cannot know the visitor's zone, so the time is pinned to UTC and
      // says so, instead of passing the server's local time off as theirs.
      lastSignIn: user.lastSignInAt
        ? new Date(user.lastSignInAt).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC',
            timeZoneName: 'short',
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
