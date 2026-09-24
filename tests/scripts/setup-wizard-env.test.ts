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
import { spawn } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
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

/**
 * Lines not belonging to one of the changed keys, in order. Comparing these before and after
 * catches any comment, blank line or other key that was lost, reordered or duplicated.
 */
function untouchedLines(text: string, changed: string[]): string[] {
  return text.split('\n').filter(line => !changed.some(key => line.startsWith(`${key}=`)))
}

/** Wizard answers keyed by prompt text, so the test does not depend on prompt order. */
const wizardAnswers: [RegExp, string][] = [
  [/Reconfigure\?/, 'y'],
  [/Which database provider/, '3'],
  [/Turso database URL/, 'libsql://my-db.turso.io'],
  [/Turso auth token/, 'turso-token'],
  [/Supabase project URL/, 'https://abc.supabase.co'],
  [/anonymous key/, 'eyJanon'],
  [/service role key\?/, 'n'],
  [/default provider/, '3'],
]

/**
 * Run the real wizard from a copy of scripts/ in projectDir, so it edits projectDir/.env.
 * Configures both providers and picks auto-detect. Resolves with the exit code.
 */
function runWizard(projectDir: string): Promise<number | null> {
  mkdirSync(join(projectDir, 'scripts/lib'), { recursive: true })
  for (const file of ['setup-wizard.js', 'lib/env-file.js']) {
    cpSync(new URL(`../../scripts/${file}`, import.meta.url), join(projectDir, 'scripts', file))
  }

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(projectDir, 'scripts/setup-wizard.js')], {
      stdio: ['pipe', 'pipe', 'inherit'],
    })
    let output = ''
    child.stdout.on('data', chunk => {
      output += chunk
      // Prompts end in ": " with no newline; one has a colour reset before the space.
      const prompt = output.slice(output.lastIndexOf('\n') + 1).replaceAll('\x1b[0m', '')
      if (!prompt.endsWith(': ')) return
      const answer = wizardAnswers.find(([pattern]) => pattern.test(prompt))
      if (!answer) {
        child.kill()
        reject(new Error(`Unexpected wizard prompt: ${prompt}`))
        return
      }
      output = ''
      child.stdin.write(`${answer[1]}\n`)
    })
    child.on('error', reject)
    child.on('exit', resolve)
  })
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

    expect(untouchedLines(after, changed)).toEqual(untouchedLines(original, changed))

    expect(parsed.TURSO_DATABASE_URL).toBe('libsql://my-db.turso.io')
    expect(parsed.TURSO_AUTH_TOKEN).toBe('turso-token')
    expect(parsed.DATABASE_PROVIDER).toBe('turso')
    expect(parsed.ENABLE_COMMENTS).toBe('true')

    // An updated key keeps its inline comment.
    const originalUrlLine = original.split('\n').find(l => l.startsWith('TURSO_DATABASE_URL='))!
    const updatedUrlLine = after.split('\n').find(l => l.startsWith('TURSO_DATABASE_URL='))!
    expect(updatedUrlLine).toContain(originalUrlLine.slice(originalUrlLine.indexOf('#')))
  })

  it('removes a key set to undefined (auto-detect provider)', () => {
    writeFileSync(envPath, `${example}\nDATABASE_PROVIDER=turso\n`)

    const parsed = parseEnv(runWritePath({ DATABASE_PROVIDER: undefined }))

    expect(parsed).not.toHaveProperty('DATABASE_PROVIDER')
    expect(parsed.PUBLIC_SUPABASE_URL).toBe(parseEnv(example).PUBLIC_SUPABASE_URL)
  })

  it('runs the real wizard: only answered keys change and auto-detect drops DATABASE_PROVIDER', async () => {
    writeFileSync(envPath, `${example}\nEXTRA_KEY=keep-me\nDATABASE_PROVIDER=turso\n`)
    const original = readFileSync(envPath, 'utf-8')

    expect(await runWizard(dir)).toBe(0)

    const after = readFileSync(envPath, 'utf-8')
    const parsed = parseEnv(after)
    expect(parsed).not.toHaveProperty('DATABASE_PROVIDER')
    expect(parsed).toMatchObject({
      TURSO_DATABASE_URL: 'libsql://my-db.turso.io',
      TURSO_AUTH_TOKEN: 'turso-token',
      SUPABASE_URL: 'https://abc.supabase.co',
      SUPABASE_ANON_KEY: 'eyJanon',
      EXTRA_KEY: 'keep-me',
      PUBLIC_SUPABASE_URL: parseEnv(example).PUBLIC_SUPABASE_URL,
    })
    const changed = [
      'TURSO_DATABASE_URL',
      'TURSO_AUTH_TOKEN',
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'DATABASE_PROVIDER',
      'ENABLE_COMMENTS',
    ]
    expect(untouchedLines(after, changed)).toEqual(untouchedLines(original, changed))
  })

  it('sees a key on the first line of a file saved with a BOM', () => {
    writeFileSync(envPath, '\uFEFFDATABASE_PROVIDER=turso\nEXTRA_KEY=keep-me\n')

    expect(readEnvFile(envPath).DATABASE_PROVIDER).toBe('turso')
    const parsed = parseEnv(runWritePath({ DATABASE_PROVIDER: undefined }).replace(/^\uFEFF/, ''))
    expect(parsed).not.toHaveProperty('DATABASE_PROVIDER')
    expect(parsed.EXTRA_KEY).toBe('keep-me')
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
