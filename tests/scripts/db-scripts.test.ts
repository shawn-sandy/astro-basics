/**
 * Tests for the db:* npm scripts that report or touch database configuration.
 *
 * db:status and db:schema used to count the `YOUR_...` placeholders from .env.example as
 * real values; db:seed:messages must fail with a readable message rather than a stack trace.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { describe, it, expect } from 'vitest'

const template = parseEnv(readFileSync('.env.example', 'utf-8'))

const DB_KEYS = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']

const placeholders = Object.fromEntries(DB_KEYS.map(key => [key, template[key]]))

/** Runs a repo script with only the given env (plus PATH). */
const run = (script: string, env: Record<string, string | undefined>) =>
  spawnSync(process.execPath, [script], {
    env: { PATH: process.env.PATH, ...env },
    encoding: 'utf-8',
  })

const dbStatus = (env: Record<string, string | undefined>) =>
  run('scripts/database-status.js', env).stdout

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
    // SUPABASE_SERVICE_ROLE_KEY is optional, so it is reported as a warning, not ✗
    expect(out.match(/✗ Not set/g)).toHaveLength(2)
    expect(out).not.toMatch(/✓ Set/)
    expect(out).toMatch(/Selected Provider: .*none/)
  })
})

describe('db:schema', () => {
  it('does not validate YOUR_ placeholders as a configured database', () => {
    const { stdout } = run('scripts/schema-validator.js', placeholders)
    expect(stdout).toMatch(/Supabase: .*Not configured/)
    expect(stdout).not.toMatch(/schemas are valid/)
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
})
