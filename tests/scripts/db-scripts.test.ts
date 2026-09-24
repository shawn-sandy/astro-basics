/**
 * Tests for the db:* npm scripts that report database configuration.
 *
 * Both used to misreport: the migrate scripts never loaded .env, and db:status
 * counted the `YOUR_...` placeholders from .env.example as real values.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { describe, it, expect } from 'vitest'

const { scripts } = JSON.parse(readFileSync('package.json', 'utf-8'))
const template = parseEnv(readFileSync('.env.example', 'utf-8'))

const DB_KEYS = [
  'TURSO_DATABASE_URL',
  'TURSO_AUTH_TOKEN',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]

/** Runs a repo script with only the given env (plus PATH). */
const run = (script: string, args: string[], env: Record<string, string | undefined>) =>
  spawnSync(process.execPath, [script, ...args], {
    env: { PATH: process.env.PATH, ...env },
    encoding: 'utf-8',
  })

const dbStatus = (env: Record<string, string | undefined>) =>
  run('scripts/database-status.js', [], env).stdout

describe('db:migrate scripts', () => {
  const migrate = Object.keys(scripts).filter(name => name.startsWith('db:migrate'))

  it('covers every migrate script', () => {
    expect(migrate).toEqual(
      expect.arrayContaining([
        'db:migrate',
        'db:migrate:status',
        'db:migrate:create',
        'db:migrate:rollback',
      ])
    )
  })

  // `node <file>` ignores the flag in migrate.js's shebang, so it must be on the command.
  it.each(migrate)('%s loads .env', name => {
    expect(scripts[name]).toMatch(/^node --env-file=\.env scripts\/migrate\.js/)
  })

  // Loading .env exposes the placeholders, which libsql rejects with a stack trace.
  it('reports YOUR_ placeholders as missing variables', () => {
    const { status, stderr } = run('scripts/migrate.js', ['--status'], {
      TURSO_DATABASE_URL: template.TURSO_DATABASE_URL,
      TURSO_AUTH_TOKEN: template.TURSO_AUTH_TOKEN,
    })
    expect(status).toBe(1)
    expect(stderr).toContain('TURSO_DATABASE_URL')
    expect(stderr).toContain('TURSO_AUTH_TOKEN')
    expect(stderr).not.toContain('LibsqlError')
  })
})

describe('db:status', () => {
  it('uses the .env.example placeholders under test', () => {
    for (const key of DB_KEYS) expect(template[key]).toMatch(/^YOUR_/)
  })

  it('reports real values as set', () => {
    const out = dbStatus(Object.fromEntries(DB_KEYS.map(key => [key, `real-${key}`])))
    expect(out.match(/✓ Set/g)).toHaveLength(DB_KEYS.length)
  })

  it('does not report YOUR_ placeholders as set', () => {
    const out = dbStatus(Object.fromEntries(DB_KEYS.map(key => [key, template[key]])))
    expect(out.match(/✗ Not set/g)).toHaveLength(4)
    expect(out).not.toMatch(/✓ Set/)
    expect(out).toMatch(/Selected Provider: .*none/)
  })
})
