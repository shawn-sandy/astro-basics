/**
 * Tests for the db:status npm script, which reports database configuration.
 *
 * It used to count the `YOUR_...` placeholders from .env.example as real values.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { describe, it, expect } from 'vitest'

const template = parseEnv(readFileSync('.env.example', 'utf-8'))

const DB_KEYS = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']

/** Runs a repo script with only the given env (plus PATH). */
const run = (script: string, args: string[], env: Record<string, string | undefined>) =>
  spawnSync(process.execPath, [script, ...args], {
    env: { PATH: process.env.PATH, ...env },
    encoding: 'utf-8',
  })

const dbStatus = (env: Record<string, string | undefined>) =>
  run('scripts/database-status.js', [], env).stdout

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
    expect(out).not.toMatch(/✓ Set/)
    expect(out).toMatch(/Status: .*Not configured/)
  })
})
