// @vitest-environment node
import type { AstroGlobal } from 'astro'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchUserWithRole = vi.fn()
vi.mock('#utils/user-sync', () => ({ fetchUserWithRole }))

const { fetchCurrentUserWithRole, getDashboardUser } = await import('#utils/dashboard-user')

/** A minimal `Astro` global: only `locals` is read, and it is the per-request cache key. */
function astroFor(userId: string | undefined): AstroGlobal {
  return { locals: { userId } } as unknown as AstroGlobal
}

/** A Clerk user with two addresses, the second of which is primary. */
const clerkUser = {
  fullName: 'Ada Lovelace',
  firstName: 'Ada',
  username: 'ada',
  primaryEmailAddressId: 'email_2',
  emailAddresses: [
    { id: 'email_1', emailAddress: 'old@example.com', verification: { status: 'unverified' } },
    { id: 'email_2', emailAddress: 'ada@example.com', verification: { status: 'verified' } },
  ],
  lastSignInAt: Date.UTC(2026, 8, 25, 14, 30),
  imageUrl: 'https://img.example.com/ada.png',
}

describe('getDashboardUser', () => {
  beforeEach(() => {
    fetchUserWithRole.mockReset()
  })

  it('returns null without calling Clerk when nobody is signed in', async () => {
    expect(await getDashboardUser(astroFor(undefined))).toBeNull()
    expect(fetchUserWithRole).not.toHaveBeenCalled()
  })

  it('shapes the Clerk user for display, using the primary email', async () => {
    fetchUserWithRole.mockResolvedValue({ user: clerkUser, userRole: 'admin' })

    const user = await getDashboardUser(astroFor('user_1'))

    expect(user).toMatchObject({
      name: 'Ada Lovelace',
      firstName: 'Ada',
      email: 'ada@example.com',
      emailVerified: true,
      role: 'admin',
      imageUrl: 'https://img.example.com/ada.png',
    })
    // Formatted in UTC and labelled, so it reads the same on any server and never passes off
    // server-local time as the visitor's.
    expect(user?.lastSignIn).toBe('Sep 25, 2026, 02:30 PM UTC')
  })

  it('falls back to the username and the member role', async () => {
    fetchUserWithRole.mockResolvedValue({
      user: { ...clerkUser, fullName: null, firstName: null },
      userRole: null,
    })

    const user = await getDashboardUser(astroFor('user_1'))

    expect(user?.name).toBe('ada')
    expect(user?.firstName).toBe('ada')
    expect(user?.role).toBe('member')
  })

  it('returns null when the lookup finds no user', async () => {
    fetchUserWithRole.mockResolvedValue({ user: null, userRole: null, error: 'Clerk down' })

    expect(await getDashboardUser(astroFor('user_1'))).toBeNull()
  })

  it('shares one Clerk call between the raw lookup and the display shape in a request', async () => {
    fetchUserWithRole.mockResolvedValue({ user: clerkUser, userRole: 'member' })
    const request = astroFor('user_1')

    // UserInfo reads the raw result and the dashboard layout reads the display shape.
    const raw = await fetchCurrentUserWithRole(request)
    const shaped = await getDashboardUser(request)

    expect(raw?.user).toBe(clerkUser)
    expect(shaped?.name).toBe('Ada Lovelace')
    expect(fetchUserWithRole).toHaveBeenCalledTimes(1)
  })

  it('makes one Clerk call per request however many components ask', async () => {
    fetchUserWithRole.mockResolvedValue({ user: clerkUser, userRole: 'member' })
    const request = astroFor('user_1')

    // The layout and the page share `Astro.locals`, so they share the lookup.
    const [fromLayout, fromPage] = await Promise.all([
      getDashboardUser(request),
      getDashboardUser(request),
    ])
    await getDashboardUser(astroFor('user_1'))

    expect(fromPage).toEqual(fromLayout)
    expect(fetchUserWithRole).toHaveBeenCalledTimes(2)
  })
})
