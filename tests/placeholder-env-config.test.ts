import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'

/**
 * Regression cover for the `.env.example` placeholder outage.
 *
 * `SUPABASE_URL=YOUR_SUPABASE_URL` is truthy but unparseable. It used to pass the
 * `!supabaseUrl` guard and reach `createClient`, which throws - and because the throw
 * happened while `supabase-native` was still loading, middleware never initialised and
 * every route 500'd. An unusable URL must read as "not configured" so the site degrades
 * to Supabase-off instead of going down.
 *
 * `env-config` memoises the environment in a module-level cache on first import, so each
 * case stubs the env and then re-imports through `vi.resetModules()`. Without the reset
 * the cache holds the empty test environment and every assertion passes vacuously.
 */
async function loadConfigWithEnv(vars: Record<string, string>) {
  for (const [key, value] of Object.entries(vars)) {
    vi.stubEnv(key, value)
  }

  vi.resetModules()
  const { getEnvironmentConfig } = await import('#utils/env-config')
  return getEnvironmentConfig()
}

describe('Supabase configuration with placeholder values', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('treats the .env.example placeholders as unconfigured', async () => {
    const config = await loadConfigWithEnv({
      SUPABASE_URL: 'YOUR_SUPABASE_URL',
      SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
      SUPABASE_SERVICE_ROLE_KEY: 'YOUR_SUPABASE_SERVICE_ROLE_KEY',
    })

    expect(config.getSupabaseUrl()).toBeNull()
    expect(config.getSupabaseAnonKey()).toBeNull()
    expect(config.getSupabaseServiceRoleKey()).toBeNull()
    expect(config.isSupabaseConfigured()).toBe(false)
  })

  it('rejects any unparseable URL, not just the known placeholder', async () => {
    const config = await loadConfigWithEnv({ SUPABASE_URL: 'not-a-url' })

    expect(config.getSupabaseUrl()).toBeNull()
  })

  it.each(['ftp://example.com', 'javascript:alert(1)', 'libsql://wrong-provider.turso.io'])(
    'rejects the parseable but non-HTTP URL %s',
    async url => {
      // `URL.canParse` accepts these; Supabase only accepts HTTP(S) and would throw.
      const config = await loadConfigWithEnv({ SUPABASE_URL: url })

      expect(config.getSupabaseUrl()).toBeNull()
    }
  )

  it('accepts a plain http URL, for local Supabase instances', async () => {
    const config = await loadConfigWithEnv({ SUPABASE_URL: 'http://localhost:54321' })

    expect(config.getSupabaseUrl()).toBe('http://localhost:54321')
  })

  it('passes a real project URL and keys through untouched', async () => {
    const config = await loadConfigWithEnv({
      SUPABASE_URL: 'https://abcdefgh.supabase.co',
      SUPABASE_ANON_KEY: 'real-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'real-service-key',
    })

    expect(config.getSupabaseUrl()).toBe('https://abcdefgh.supabase.co')
    expect(config.getSupabaseAnonKey()).toBe('real-anon-key')
    expect(config.getSupabaseServiceRoleKey()).toBe('real-service-key')
    expect(config.isSupabaseConfigured()).toBe(true)
  })

  it('imports supabase-native without throwing when the env holds placeholders', async () => {
    // The outage itself: this import threw, so middleware never initialised.
    vi.stubEnv('SUPABASE_URL', 'YOUR_SUPABASE_URL')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'YOUR_SUPABASE_SERVICE_ROLE_KEY')
    vi.resetModules()

    const supabase = await import('#libs/supabase-native')

    expect(supabase.isSupabaseConfigured()).toBe(false)
    expect(supabase.getSupabaseServiceRole()).toBeNull()
  })
})

/**
 * The same defect in the database config. Left unfixed, `cp .env.example .env` makes
 * Turso look configured, so provider auto-detection selects it and the placeholder URL
 * reaches `createClient` on the first database operation.
 */
describe('Turso configuration with placeholder values', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('treats the .env.example placeholders as unconfigured', async () => {
    const config = await loadConfigWithEnv({
      TURSO_DATABASE_URL: 'YOUR_TURSO_DATABASE_URL',
      TURSO_AUTH_TOKEN: 'YOUR_TURSO_AUTH_TOKEN',
    })

    expect(config.getTursoDatabaseUrl()).toBeNull()
    expect(config.getTursoAuthToken()).toBeNull()
    expect(config.isTursoConfigured()).toBe(false)
  })

  it('passes a real libsql URL and token through untouched', async () => {
    // No HTTP(S) scheme check here - unlike Supabase, Turso URLs are libsql://.
    const config = await loadConfigWithEnv({
      TURSO_DATABASE_URL: 'libsql://my-db.turso.io',
      TURSO_AUTH_TOKEN: 'real-auth-token',
    })

    expect(config.getTursoDatabaseUrl()).toBe('libsql://my-db.turso.io')
    expect(config.getTursoAuthToken()).toBe('real-auth-token')
    expect(config.isTursoConfigured()).toBe(true)
  })
})

/**
 * The same defect in the logging config. `.env.example` pairs a placeholder token with a
 * real-looking `AXIOM_DATASET=astro-basics`, so the logger considered itself configured
 * and shipped every request's logs to an endpoint that answers `forbidden`. This one only
 * ever produced console noise - the failure is async and already caught - but a fresh
 * clone should log to the console and stay quiet.
 */
describe('Axiom configuration with placeholder values', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('treats the .env.example token placeholder as unconfigured', async () => {
    const config = await loadConfigWithEnv({
      AXIOM_TOKEN: 'YOUR_AXIOM_API_TOKEN',
      AXIOM_DATASET: 'astro-basics',
    })

    expect(config.getAxiomToken()).toBeNull()
    expect(config.isAxiomConfigured()).toBe(false)
  })

  it('stays unconfigured when the token is empty', async () => {
    const config = await loadConfigWithEnv({
      AXIOM_TOKEN: '',
      AXIOM_DATASET: 'astro-basics',
    })

    expect(config.isAxiomConfigured()).toBe(false)
  })

  it('passes a real token and dataset through untouched', async () => {
    const config = await loadConfigWithEnv({
      AXIOM_TOKEN: 'xaat-real-token',
      AXIOM_DATASET: 'astro-basics',
    })

    expect(config.getAxiomToken()).toBe('xaat-real-token')
    expect(config.getAxiomDataset()).toBe('astro-basics')
    expect(config.isAxiomConfigured()).toBe(true)
  })
})
