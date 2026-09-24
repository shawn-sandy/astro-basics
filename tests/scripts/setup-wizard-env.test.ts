// @vitest-environment node
/**
 * Setup Wizard .env Tests
 *
 * Regression tests for `npm run db:wizard`: it used to rebuild .env from a fixed key list,
 * dropping every other key (PUBLIC_SUPABASE_*, AXIOM_*, EMAIL_*, ...) and all comments.
 *
 * @module tests/scripts/setup-wizard-env.test
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { URL } from 'node:url'
import { parseEnv } from 'node:util'
import { readEnvFile, updateEnvFile } from '../../scripts/lib/env-file.js'

const example = readFileSync(new URL('../../.env.example', import.meta.url), 'utf-8')

let dir: string
let envPath: string

/** Mirrors runSetup(): read .env, apply what the user entered, write it back. */
function runWritePath(changes: Record<string, string | undefined>): string {
  updateEnvFile(envPath, { ...readEnvFile(envPath), ...changes })
  return readFileSync(envPath, 'utf-8')
}

describe('setup wizard .env write path', () => {
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'setup-wizard-env-'))
    envPath = join(dir, '.env')
    writeFileSync(envPath, `${example}\nEXTRA_KEY=keep-me\n`)
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('updates only the keys it manages and keeps every other line, comments included', () => {
    const original = readFileSync(envPath, 'utf-8')
    const before = parseEnv(original)
    const changed = [
      'TURSO_DATABASE_URL',
      'TURSO_AUTH_TOKEN',
      'DATABASE_PROVIDER',
      'ENABLE_COMMENTS',
    ]

    const after = runWritePath({
      TURSO_DATABASE_URL: 'libsql://my-db.turso.io',
      TURSO_AUTH_TOKEN: 'turso-token',
      DATABASE_PROVIDER: 'turso',
      ENABLE_COMMENTS: 'true',
    })
    const parsed = parseEnv(after)

    expect(parsed.EXTRA_KEY).toBe('keep-me')
    expect(parsed.PUBLIC_SUPABASE_URL).toBe(before.PUBLIC_SUPABASE_URL)
    expect(parsed.PUBLIC_SUPABASE_ANON_KEY).toBe(before.PUBLIC_SUPABASE_ANON_KEY)

    // Every line not belonging to a changed key survives verbatim (comments, blanks, other keys).
    const afterLines = after.split('\n')
    for (const line of original.split('\n')) {
      if (changed.some(key => line.startsWith(`${key}=`))) continue
      expect(afterLines).toContain(line)
    }

    expect(parsed.TURSO_DATABASE_URL).toBe('libsql://my-db.turso.io')
    expect(parsed.TURSO_AUTH_TOKEN).toBe('turso-token')
    expect(parsed.DATABASE_PROVIDER).toBe('turso')
    expect(parsed.ENABLE_COMMENTS).toBe('true')

    // An updated key keeps its inline comment.
    const originalUrlLine = original.split('\n').find(l => l.startsWith('TURSO_DATABASE_URL='))!
    const updatedUrlLine = afterLines.find(l => l.startsWith('TURSO_DATABASE_URL='))!
    expect(updatedUrlLine).toContain(originalUrlLine.slice(originalUrlLine.indexOf('#')))
  })

  it('removes a key set to undefined (auto-detect provider)', () => {
    writeFileSync(envPath, `${example}\nDATABASE_PROVIDER=turso\n`)

    const parsed = parseEnv(runWritePath({ DATABASE_PROVIDER: undefined }))

    expect(parsed).not.toHaveProperty('DATABASE_PROVIDER')
    expect(parsed.PUBLIC_SUPABASE_URL).toBe(parseEnv(example).PUBLIC_SUPABASE_URL)
  })

  it('strips inline comments when reading values', () => {
    writeFileSync(envPath, 'SUPABASE_URL=https://abc.supabase.co   # Project URL\n')

    expect(readEnvFile(envPath).SUPABASE_URL).toBe('https://abc.supabase.co')
  })

  it('creates .env when it does not exist yet', () => {
    rmSync(envPath)
    expect(existsSync(envPath)).toBe(false)

    const parsed = parseEnv(runWritePath({ TURSO_DATABASE_URL: 'libsql://my-db.turso.io' }))

    expect(parsed.TURSO_DATABASE_URL).toBe('libsql://my-db.turso.io')
  })
})
