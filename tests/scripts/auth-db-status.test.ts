// @vitest-environment node
/**
 * Tests for the auth-and-database-setup skill's status script.
 *
 * The script must agree with the app about what counts as "configured", and must
 * never echo a secret, since its output lands in an AI chat transcript. It runs under
 * Node, so the tests use Node's fetch primitives rather than happy-dom's.
 */
import { readFileSync } from 'node:fs'
import { ReadableStream } from 'node:stream/web'
import { parseEnv } from 'node:util'
import { describe, it, expect, vi } from 'vitest'
import { report } from '../../.claude/skills/auth-and-database-setup/scripts/status.mjs'

const template = parseEnv(readFileSync('.env.example', 'utf-8'))

const clerk = {
  PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_publishableSECRETish',
  CLERK_SECRET_KEY: 'sk_test_topSECRETvalue',
}
const turso = {
  TURSO_DATABASE_URL: 'libsql://my-db-hostname.turso.io',
  TURSO_AUTH_TOKEN: 'turso-token-SECRET',
}
const supabase = {
  SUPABASE_URL: 'https://projectref-hostname.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key-SECRET',
}

const neverCalled = vi.fn(() => {
  throw new Error('fetch should not be called')
})

describe('auth-and-database-setup status report', () => {
  it('reports everything OFF for an untouched copy of .env.example', async () => {
    const lines = await report(template, neverCalled)

    expect(lines).toContain('Login (Clerk): OFF')
    expect(lines).toContain('Database: Turso: OFF')
    expect(lines).toContain('Database: Supabase: OFF')
    expect(lines).toContain('Database used for messages: none')
    expect(neverCalled).not.toHaveBeenCalled()
  })

  it('turns login ON with real-looking keys and never prints them', async () => {
    const lines = await report({ ...template, ...clerk }, neverCalled)
    const output = lines.join('\n')

    expect(lines).toContain('Login (Clerk): ON')
    expect(output).not.toContain(clerk.PUBLIC_CLERK_PUBLISHABLE_KEY)
    expect(output).not.toContain(clerk.CLERK_SECRET_KEY)
  })

  it('agrees with the app on swapped Clerk keys, flagging the format instead', async () => {
    const lines = await report({
      ...template,
      PUBLIC_CLERK_PUBLISHABLE_KEY: clerk.CLERK_SECRET_KEY,
      CLERK_SECRET_KEY: clerk.PUBLIC_CLERK_PUBLISHABLE_KEY,
    })
    const output = lines.join('\n')

    // env-config.ts only rejects placeholders, so the app switches Clerk on here.
    expect(lines).toContain('Login (Clerk): ON')
    expect(lines.find(l => l.includes('PUBLIC_CLERK_PUBLISHABLE_KEY'))).toContain('expected pk_')
    expect(lines.find(l => l.includes(' CLERK_SECRET_KEY'))).toContain('expected sk_')
    expect(output).not.toContain(clerk.CLERK_SECRET_KEY)
    expect(output).not.toContain(clerk.PUBLIC_CLERK_PUBLISHABLE_KEY)
  })

  it('accepts every Turso URL scheme the libsql client does', async () => {
    const local = { TURSO_DATABASE_URL: 'http://127.0.0.1:8080', TURSO_AUTH_TOKEN: 'x' }
    const lines = await report(local, neverCalled)

    expect(lines).toContain('Database: Turso: ON')
    expect(lines).toContain('Database used for messages: turso')
    expect(lines.find(l => l.includes('TURSO_DATABASE_URL'))).toMatch(/ ok$/)

    const ok = async () => new Response('[]', { status: 200 })
    const both = { ...supabase, ...turso, TURSO_DATABASE_URL: 'wss://db.example.io' }
    expect(await report({ ...both, DATABASE_PROVIDER: 'turso' }, ok)).toContain(
      'Database used for messages: turso'
    )
  })

  it('ignores DATABASE_PROVIDER when it names a database that is not set up', async () => {
    expect(await report({ ...turso, DATABASE_PROVIDER: 'supabase' }, neverCalled)).toContain(
      'Database used for messages: turso'
    )
  })

  it('does not probe Supabase while it is OFF', async () => {
    const spy = vi.fn(async () => new Response('[]', { status: 200 }))
    const lines = await report({ ...supabase, SUPABASE_ANON_KEY: template.SUPABASE_ANON_KEY }, spy)

    expect(spy).not.toHaveBeenCalled()
    expect(lines.some(l => l.includes('users table'))).toBe(false)
  })

  it('reports a rejected Supabase key', async () => {
    const lines = await report(supabase, async () => new Response('{}', { status: 401 }))

    expect(lines.some(l => l.includes('users table') && l.includes('key rejected'))).toBe(true)
  })

  it('keeps a database OFF while any required value is still a placeholder', async () => {
    const lines = await report(
      { ...turso, TURSO_AUTH_TOKEN: template.TURSO_AUTH_TOKEN },
      neverCalled
    )

    expect(lines).toContain('Database: Turso: OFF')
    expect(lines).toContain('Database used for messages: none')
  })

  it('treats a non-URL SUPABASE_URL as not configured, like env-config does', async () => {
    const lines = await report({ ...supabase, SUPABASE_URL: 'projectref.supabase.co' }, neverCalled)

    expect(lines).toContain('Database: Supabase: OFF')
  })

  it('picks the messages database with the same precedence as the app', async () => {
    const both = { ...turso, ...supabase }
    const ok = vi.fn(async () => new Response('[]', { status: 200 }))

    expect(await report(both, ok)).toContain('Database used for messages: supabase')
    expect(await report({ ...both, DATABASE_PROVIDER: 'turso' }, ok)).toContain(
      'Database used for messages: turso'
    )
    expect(await report(turso, neverCalled)).toContain('Database used for messages: turso')
  })

  it('reports a missing Supabase schema when the users table 404s', async () => {
    const notFound = vi.fn(async () => new Response('{}', { status: 404 }))
    const lines = await report(supabase, notFound)

    expect(lines.some(l => l.includes('users table') && l.includes('MISSING'))).toBe(true)
    const [url, init] = notFound.mock.calls[0] as unknown as [
      { pathname: string },
      { headers: unknown },
    ]
    expect(url.pathname).toBe('/rest/v1/users')
    expect(init.headers).toEqual({ apikey: supabase.SUPABASE_ANON_KEY })
  })

  it('reports the schema as found when the users table answers', async () => {
    const lines = await report(supabase, async () => new Response('[]', { status: 200 }))

    expect(lines).toContain('Supabase users table: found')
  })

  it('does not leak the Supabase hostname when the network call fails', async () => {
    const offline = async () => {
      throw new TypeError('fetch failed', {
        cause: Object.assign(new Error(`getaddrinfo ENOTFOUND ${supabase.SUPABASE_URL}`), {
          code: 'ENOTFOUND',
        }),
      })
    }
    const output = (await report(supabase, offline)).join('\n')

    expect(output).toContain('ENOTFOUND')
    expect(output).not.toContain('projectref-hostname')
    expect(output).not.toContain(supabase.SUPABASE_ANON_KEY)
  })

  it('bounds the Supabase probe so a silent server cannot hang the report', async () => {
    const hang = vi.fn(async () => {
      throw Object.assign(new Error('The operation was aborted due to timeout'), {
        name: 'TimeoutError',
      })
    })
    const lines = await report(supabase, hang)

    const [, init] = hang.mock.calls[0] as unknown as [unknown, { signal?: unknown }]
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect(lines.some(l => l.includes('users table') && l.includes('timed out'))).toBe(true)
  })

  it('reports a timeout that fires while the error body is still arriving', async () => {
    const stalled = async () =>
      new Response(
        new ReadableStream({
          pull() {
            throw Object.assign(new Error('The operation was aborted due to timeout'), {
              name: 'TimeoutError',
            })
          },
        }),
        { status: 401 }
      )
    const line = (await report(supabase, stalled)).find(l => l.includes('users table'))

    expect(line).toContain('timed out')
    expect(line).not.toContain('key rejected')
  })

  it('still reads a 401 with a non-JSON body as a rejected key', async () => {
    const lines = await report(supabase, async () => new Response('not json', { status: 401 }))

    expect(lines.some(l => l.includes('users table') && l.includes('key rejected'))).toBe(true)
  })

  it('does not blame the key when the anon role lacks table access (42501)', async () => {
    // PostgREST answers 42501 with 401 for anonymous requests, even with a valid key.
    const denied = async () =>
      new Response(
        JSON.stringify({ code: '42501', message: 'permission denied for table users' }),
        {
          status: 401,
        }
      )
    const line = (await report(supabase, denied)).find(l => l.includes('users table'))

    expect(line).toContain('42501')
    expect(line).not.toContain('key rejected')
  })

  it('reports Clerk user sync as ready only with login ON and a service role key', async () => {
    const ok = async () => new Response('[]', { status: 200 })
    const serviceRole = 'service-role-SECRET'
    const syncLine = (lines: string[]) => lines.find(l => l.startsWith('Clerk user sync'))

    expect(syncLine(await report({ ...clerk, ...supabase }, ok))).toContain('not ready')
    expect(
      syncLine(
        await report(
          { ...clerk, ...supabase, SUPABASE_SERVICE_ROLE_KEY: template.SUPABASE_SERVICE_ROLE_KEY },
          ok
        )
      )
    ).toContain('not ready')
    expect(
      syncLine(await report({ ...supabase, SUPABASE_SERVICE_ROLE_KEY: serviceRole }, ok))
    ).toContain('not ready')

    const ready = await report(
      { ...clerk, ...supabase, SUPABASE_SERVICE_ROLE_KEY: serviceRole },
      ok
    )
    expect(ready).toContain('Clerk user sync: ready')
    expect(ready.join('\n')).not.toContain(serviceRole)
  })
})
