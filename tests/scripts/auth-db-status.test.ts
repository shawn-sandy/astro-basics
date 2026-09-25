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
const supabase = {
  SUPABASE_URL: 'https://projectref-hostname.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key-SECRET',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-SECRET',
}

const neverCalled = vi.fn(() => {
  throw new Error('fetch should not be called')
})

describe('auth-and-database-setup status report', () => {
  it('reports everything OFF for an untouched copy of .env.example', async () => {
    const lines = await report(template, neverCalled)

    expect(lines).toContain('Login (Clerk): OFF')
    expect(lines).toContain('Database: Supabase: OFF')
    expect(neverCalled).not.toHaveBeenCalled()
    const settings = lines.filter(l => /^ {2}[A-Z_]+ /.test(l))
    expect(settings).toHaveLength(8)
    for (const line of settings) expect(line).toMatch(/ placeholder( |$)/)
  })

  it('counts a half-edited YOUR_ value as set, as the app does, but flags it', async () => {
    // env-config.ts rejects only the exact placeholder, so the app counts Supabase as on here.
    const lines = await report(
      { ...supabase, SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY_EXTRA' },
      async () => new Response('[]', { status: 200 })
    )

    expect(lines).toContain('Database: Supabase: ON')
    expect(lines.find(l => l.includes(' SUPABASE_ANON_KEY'))).toContain('still starts with YOUR_')
    expect(lines.join('\n')).not.toContain('_EXTRA')
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

  it('keeps the database OFF while any required value is still a placeholder', async () => {
    const lines = await report({ ...supabase, SUPABASE_URL: template.SUPABASE_URL }, neverCalled)

    expect(lines).toContain('Database: Supabase: OFF')
  })

  it('treats a non-URL SUPABASE_URL as not configured, like env-config does', async () => {
    const lines = await report({ ...supabase, SUPABASE_URL: 'projectref.supabase.co' }, neverCalled)

    expect(lines).toContain('Database: Supabase: OFF')
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

  it('probes the same path supabase-js requests, keeping any base path', async () => {
    const paths: string[] = []
    const record = async (url: { pathname: string }) => {
      paths.push(url.pathname)
      return new Response('[]', { status: 200 })
    }
    for (const SUPABASE_URL of [
      'https://ref.supabase.co',
      'https://ref.supabase.co/',
      'https://self-hosted.example/supabase',
    ]) {
      await report({ ...supabase, SUPABASE_URL }, record as unknown as typeof fetch)
    }

    // supabase-js: new URL('rest/v1', ensureTrailingSlash(url)) + '/users'
    expect(paths).toEqual(['/rest/v1/users', '/rest/v1/users', '/supabase/rest/v1/users'])
  })

  it('flags a SUPABASE_URL pasted with /rest/v1 instead of reporting the table found', async () => {
    const ok = vi.fn(async () => new Response('[]', { status: 200 }))

    for (const suffix of ['/rest/v1', '/rest/v1/']) {
      const lines = await report(
        {
          ...supabase,
          SUPABASE_URL: `${supabase.SUPABASE_URL}${suffix}`,
          PUBLIC_SUPABASE_URL: `${supabase.SUPABASE_URL}${suffix}`,
        },
        ok
      )

      // env-config.ts accepts any http(s) URL, so the app still counts Supabase as configured.
      expect(lines).toContain('Database: Supabase: ON')
      expect(lines.find(l => l.includes(' SUPABASE_URL'))).toContain('without /rest/v1')
      expect(lines.find(l => l.includes('PUBLIC_SUPABASE_URL'))).toContain('without /rest/v1')
      const probe = lines.find(l => l.includes('users table'))
      expect(probe).not.toContain('found')
      expect(probe).toContain('remove /rest/v1')
      expect(lines.join('\n')).not.toContain('projectref-hostname')
    }
    expect(ok).not.toHaveBeenCalled()
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

  it('keeps the database OFF without the service role key, which every query uses', async () => {
    const { SUPABASE_SERVICE_ROLE_KEY: _omit, ...noServiceRole } = supabase
    const lines = await report(noServiceRole, neverCalled)

    expect(lines).toContain('Database: Supabase: OFF')
    expect(lines.find(l => l.includes('SUPABASE_SERVICE_ROLE_KEY'))).toContain('missing')
    expect(neverCalled).not.toHaveBeenCalled()
  })

  it('reports Clerk user sync as ready only with login ON', async () => {
    const ok = async () => new Response('[]', { status: 200 })
    const syncLine = (lines: string[]) => lines.find(l => l.startsWith('Clerk user sync'))

    expect(syncLine(await report(supabase, ok))).toContain('not ready')

    const ready = await report({ ...clerk, ...supabase }, ok)
    expect(ready).toContain('Clerk user sync: ready')
    expect(ready.join('\n')).not.toContain(supabase.SUPABASE_SERVICE_ROLE_KEY)
  })
})
