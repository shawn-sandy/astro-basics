import type { User as ClerkUser } from '@clerk/astro/server'
import { describe, it, expect } from 'vitest'

import { buildUserData } from '#utils/user'

/**
 * `buildUserData()` builds the payload that `/api/user/sync` upserts into `users`.
 *
 * It used to emit a `metadata` key. The column in `scripts/migrations/001_core_schema.sql`
 * is `app_metadata`, so PostgREST rejected the whole upsert with "column users.metadata
 * does not exist" - the typed Supabase client could not catch it, because
 * `src/libs/database.types.ts` was missing the `Relationships` key every table needs and
 * every `from()` call therefore resolved to `never`.
 *
 * It also passed Clerk's `undefined` straight through for the nullable columns. PostgREST
 * writes what it is given, so those must be `null`.
 */

/** Minimal Clerk user; only the fields buildUserData reads are set. */
const clerkUser = (overrides: Partial<ClerkUser> = {}) =>
  ({
    id: 'user_2abc',
    username: 'ada',
    firstName: 'Ada',
    lastName: 'Lovelace',
    imageUrl: 'https://img.clerk.com/ada',
    publicMetadata: {},
    lastSignInAt: null,
    ...overrides,
  }) as ClerkUser

describe('buildUserData', () => {
  it('writes app_metadata, the column the users table actually has', () => {
    const data = buildUserData(clerkUser({ publicMetadata: { role: 'admin' } }), 'ada@example.com')

    expect(data).toHaveProperty('app_metadata', { role: 'admin' })
    expect(data).not.toHaveProperty('metadata')
  })

  it('only emits columns that exist on users', () => {
    const columns = [
      'clerk_id',
      'email',
      'username',
      'full_name',
      'avatar_url',
      'role',
      'app_metadata',
      'last_sign_in_at',
    ]

    expect(Object.keys(buildUserData(clerkUser(), 'ada@example.com')).sort()).toEqual(
      [...columns].sort()
    )
  })

  it('sends null, never undefined, for the nullable columns', () => {
    const data = buildUserData(
      clerkUser({ username: null, firstName: null, lastName: null, imageUrl: '' }),
      'ada@example.com'
    )

    expect(data.username).toBeNull()
    expect(data.full_name).toBeNull()
    expect(data.avatar_url).toBeNull()
    expect(data.last_sign_in_at).toBeNull()
    for (const value of Object.values(data)) expect(value).not.toBeUndefined()
  })

  it('defaults the role to member when Clerk carries none', () => {
    expect(buildUserData(clerkUser(), 'ada@example.com').role).toBe('member')
  })

  it('keeps the role from Clerk public metadata', () => {
    const data = buildUserData(clerkUser({ publicMetadata: { role: 'super_admin' } }), 'x@y.com')

    expect(data.role).toBe('super_admin')
  })
})
