import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'

/**
 * Provider selection in the database abstraction layer. Supabase is the only provider,
 * so `getDatabase()` either returns it or fails with a message naming the keys to set.
 *
 * `env-config` memoises the environment on first import, so each case stubs the env and
 * re-imports through `vi.resetModules()`.
 */
async function loadDatabaseWithEnv(vars: Record<string, string>) {
  for (const [key, value] of Object.entries(vars)) {
    vi.stubEnv(key, value)
  }

  vi.resetModules()
  return import('#libs/database')
}

describe('getDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('returns the Supabase provider when Supabase is configured', async () => {
    const { getDatabase, getDatabaseStatus } = await loadDatabaseWithEnv({
      SUPABASE_URL: 'https://abcdefgh.supabase.co',
      SUPABASE_ANON_KEY: 'real-anon-key',
    })

    expect(getDatabase().getProviderName()).toBe('supabase')
    expect(getDatabaseStatus()).toMatchObject({ current: 'supabase', is_configured: true })
  })

  it('throws, pointing at the Supabase keys, when Supabase is not configured', async () => {
    const { getDatabase, getDatabaseStatus } = await loadDatabaseWithEnv({
      SUPABASE_URL: '',
      SUPABASE_ANON_KEY: '',
    })

    expect(() => getDatabase()).toThrow(/SUPABASE_URL/)
    expect(getDatabaseStatus()).toMatchObject({ current: null, is_configured: false })
  })
})
