/**
 * Tests for the db:* npm scripts that report or touch database configuration.
 *
 * db:status and db:schema used to count the `YOUR_...` placeholders from .env.example as
 * real values; db:seed:messages must fail with a readable message rather than a stack trace.
 *
 * db:schema and `db:manage test` also used to answer from a stub that returned `[]` without
 * a request, so they reported success against credentials Supabase would reject. The cases
 * below run them against a stand-in for the Supabase REST API to check that they really
 * query it and that a rejected read fails the command.
 */
import { spawn, spawnSync } from 'node:child_process'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { describe, it, expect } from 'vitest'

const template = parseEnv(readFileSync('.env.example', 'utf-8'))

const DB_KEYS = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']

const placeholders = Object.fromEntries(DB_KEYS.map(key => [key, template[key]]))

/**
 * Runs a repo script with only the given env (plus PATH).
 *
 * `--import tsx` mirrors the npm scripts: db:schema and db:seed:messages import the
 * TypeScript database abstraction layer, which plain Node cannot load.
 */
const run = (script: string, env: Record<string, string | undefined>, args: string[] = []) =>
  spawnSync(process.execPath, ['--import', 'tsx', script, ...args], {
    env: { PATH: process.env.PATH, ...env },
    encoding: 'utf-8',
  })

const dbStatus = (env: Record<string, string | undefined>) =>
  run('scripts/database-status.js', env).stdout

/** One request the stand-in received. */
type StandInRequest = { method: string; url: string; body: string }

/** What the stand-in answers with. */
type StandInReply = { status: number; body: unknown }

type StandIn = {
  /** Value for SUPABASE_URL. */
  url: string
  requests: StandInRequest[]
  close: () => Promise<void>
}

/**
 * Starts a stand-in for the Supabase REST API on an ephemeral port.
 *
 * `reply` decides each response, so a case can reject the read the way Supabase rejects a
 * bad key. Every request is recorded, which is how these tests tell a real query from a stub.
 */
async function startStandIn(reply: (request: StandInRequest) => StandInReply): Promise<StandIn> {
  const requests: StandInRequest[] = []

  const server: Server = createServer((req, res) => {
    let body = ''
    req.on('data', chunk => (body += chunk))
    req.on('end', () => {
      const request = { method: req.method ?? '', url: req.url ?? '', body }
      requests.push(request)

      const { status, body: responseBody } = reply(request)
      res.statusCode = status
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(responseBody))
    })
  })

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    close: () => new Promise<void>(resolve => server.close(() => resolve())),
  }
}

/** Env pointing the scripts at a stand-in, with keys that pass the configuration check. */
const standInEnv = (standIn: StandIn) => ({
  SUPABASE_URL: standIn.url,
  SUPABASE_ANON_KEY: 'sb_publishable_standin',
  SUPABASE_SERVICE_ROLE_KEY: 'standin-service-key',
})

/**
 * Runs a repo script without blocking the event loop, so the stand-in in this process can
 * answer the script's requests. `spawnSync` cannot: it blocks until the child exits.
 */
const runAsync = (script: string, env: Record<string, string | undefined>, args: string[] = []) =>
  new Promise<{ status: number | null; stdout: string; stderr: string }>(resolve => {
    const child = spawn(process.execPath, ['--import', 'tsx', script, ...args], {
      env: { PATH: process.env.PATH, ...env },
    })

    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf-8').on('data', chunk => (stdout += chunk))
    child.stderr.setEncoding('utf-8').on('data', chunk => (stderr += chunk))
    child.on('close', status => resolve({ status, stdout, stderr }))
  })

/** A messages row carrying every column the abstraction layer reads. */
const standInRow = {
  id: 7,
  user_id: null,
  clerk_user_id: null,
  name: 'Stand-in Sarah',
  email: 'sarah@example.com',
  subject: 'Question about pricing',
  message: 'Hello from the stand-in',
  is_read: false,
  is_archived: false,
  ip_address: '192.168.1.100',
  user_agent: 'stand-in',
  created_at: '2026-09-01T12:00:00Z',
  updated_at: '2026-09-01T12:00:00Z',
}

const REJECTED = { status: 401, body: { message: 'Invalid API key', code: '401' } }

describe('db:status', () => {
  it('uses the .env.example placeholders under test', () => {
    for (const key of DB_KEYS) expect(template[key]).toMatch(/^YOUR_/)
  })

  it('reports real values as set', () => {
    const out = dbStatus(Object.fromEntries(DB_KEYS.map(key => [key, `real-${key}`])))
    expect(out.match(/✓ Set/g)).toHaveLength(DB_KEYS.length)
  })

  it('does not report YOUR_ placeholders as set', () => {
    const out = dbStatus(placeholders)
    expect(out.match(/✗ Not set/g)).toHaveLength(DB_KEYS.length)
    expect(out).not.toMatch(/✓ Set/)
    expect(out).toMatch(/Selected Provider: .*none/)
  })

  it('selects no provider without the service role key, as the app does', () => {
    const out = dbStatus({ SUPABASE_URL: 'real-url', SUPABASE_ANON_KEY: 'real-anon' })
    expect(out).toMatch(/Selected Provider: .*none/)
    expect(out).toContain('SUPABASE_SERVICE_ROLE_KEY')
  })
})

describe('db:schema', () => {
  it('does not validate YOUR_ placeholders as a configured database', () => {
    const { status, stdout } = run('scripts/schema-validator.js', placeholders)
    expect(status).toBe(1)
    expect(stdout).toMatch(/Supabase: .*Not configured/)
    expect(stdout).not.toMatch(/matches what the application reads/)
  })

  it('reports the service role key as missing, since every query needs it', () => {
    const { status, stdout } = run('scripts/schema-validator.js', {
      SUPABASE_URL: 'https://abcdefgh.supabase.co',
      SUPABASE_ANON_KEY: 'real-anon-key',
    })
    expect(status).toBe(1)
    expect(stdout).toContain('SUPABASE_SERVICE_ROLE_KEY')
  })

  it('reads the messages table and reports the schema when the row matches', async () => {
    const standIn = await startStandIn(() => ({ status: 200, body: [standInRow] }))

    try {
      const { status, stdout } = await runAsync('scripts/schema-validator.js', standInEnv(standIn))

      expect(standIn.requests).toHaveLength(1)
      expect(standIn.requests[0].method).toBe('GET')
      expect(standIn.requests[0].url).toContain('/rest/v1/messages')
      expect(stdout).toContain('matches what the application reads')
      expect(status).toBe(0)
    } finally {
      await standIn.close()
    }
  })

  it('fails when the read is rejected instead of reporting a valid schema', async () => {
    const standIn = await startStandIn(() => REJECTED)

    try {
      const { status, stdout, stderr } = await runAsync(
        'scripts/schema-validator.js',
        standInEnv(standIn)
      )

      expect(standIn.requests).toHaveLength(1)
      expect(stderr).toContain('Could not read the messages table')
      expect(stdout).not.toMatch(/matches what the application reads/)
      expect(status).toBe(1)
    } finally {
      await standIn.close()
    }
  })

  it('does not report the schema from an empty table, whose columns it cannot check', async () => {
    const standIn = await startStandIn(() => ({ status: 200, body: [] }))

    try {
      const { status, stdout } = await runAsync('scripts/schema-validator.js', standInEnv(standIn))

      expect(stdout).toContain('it is empty')
      expect(stdout).not.toMatch(/matches what the application reads/)
      expect(status).toBe(0)
    } finally {
      await standIn.close()
    }
  })

  it('reports a row that is missing a NOT NULL column the application reads', async () => {
    // A table without `is_read` - the column the dashboard filters on - returns rows that
    // carry no such field, which the abstraction layer passes through as undefined.
    const { is_read: _isRead, ...withoutIsRead } = standInRow
    const standIn = await startStandIn(() => ({ status: 200, body: [withoutIsRead] }))

    try {
      const { status, stderr } = await runAsync('scripts/schema-validator.js', standInEnv(standIn))

      expect(stderr).toContain('missing expected columns: is_read')
      expect(status).toBe(1)
    } finally {
      await standIn.close()
    }
  })
})

describe('db:manage test', () => {
  it('fails when the messages read is rejected, rather than reporting success', async () => {
    const standIn = await startStandIn(() => REJECTED)

    try {
      const { status, stdout, stderr } = await runAsync(
        'scripts/database-manager.js',
        standInEnv(standIn),
        ['test']
      )

      expect(standIn.requests).toHaveLength(1)
      expect(standIn.requests[0].url).toContain('/rest/v1/messages')
      expect(stderr).toContain('Connection test failed')
      expect(stdout).not.toMatch(/connection test passed/)
      expect(status).toBe(1)
    } finally {
      await standIn.close()
    }
  })

  it('passes on a successful read', async () => {
    const standIn = await startStandIn(() => ({ status: 200, body: [standInRow] }))

    try {
      const { status, stdout } = await runAsync(
        'scripts/database-manager.js',
        standInEnv(standIn),
        ['test']
      )

      expect(stdout).toContain('Read succeeded')
      expect(stdout).toContain('connection test passed')
      expect(status).toBe(0)
    } finally {
      await standIn.close()
    }
  })

  it('exits non-zero when the database is not configured', () => {
    const { status, stderr } = run('scripts/database-manager.js', placeholders, ['test'])
    expect(status).toBe(1)
    expect(stderr).toContain('SUPABASE_SERVICE_ROLE_KEY')
  })
})

describe('db:seed:messages', () => {
  it('reports YOUR_ placeholders as missing variables', () => {
    const { status, stderr } = run('scripts/seed-messages.js', placeholders)
    expect(status).toBe(1)
    expect(stderr).toContain('SUPABASE_SERVICE_ROLE_KEY')
  })

  it('reports a malformed URL through its own error handler, not an unhandled rejection', () => {
    const { status, stderr } = run('scripts/seed-messages.js', {
      SUPABASE_URL: 'not-a-url',
      SUPABASE_SERVICE_ROLE_KEY: 'real-service-key',
    })
    expect(status).toBe(1)
    expect(stderr).toContain('Error seeding messages')
  })

  it('writes every message in one insert, keeping its timestamps and flags', async () => {
    const standIn = await startStandIn(request =>
      request.method === 'POST'
        ? {
            status: 201,
            body: (JSON.parse(request.body) as unknown[]).map((_, index) => ({ id: index + 1 })),
          }
        : { status: 200, body: [standInRow] }
    )

    try {
      const { status, stdout } = await runAsync('scripts/seed-messages.js', standInEnv(standIn))

      const inserts = standIn.requests.filter(request => request.method === 'POST')
      expect(inserts).toHaveLength(1)

      const rows = JSON.parse(inserts[0].body) as Record<string, unknown>[]
      expect(rows.length).toBeGreaterThan(1)
      expect(rows.some(row => row.is_read === true)).toBe(true)
      expect(rows.some(row => row.is_archived === true)).toBe(true)
      for (const row of rows) {
        expect(row.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
        expect(row.updated_at).toBe(row.created_at)
      }

      expect(stdout).toContain(`Successfully seeded ${rows.length} messages`)
      expect(status).toBe(0)
    } finally {
      await standIn.close()
    }
  })

  it('fails when the insert is rejected', async () => {
    const standIn = await startStandIn(() => REJECTED)

    try {
      const { status, stderr } = await runAsync('scripts/seed-messages.js', standInEnv(standIn))

      expect(stderr).toContain('Error seeding messages')
      expect(status).toBe(1)
    } finally {
      await standIn.close()
    }
  })
})
