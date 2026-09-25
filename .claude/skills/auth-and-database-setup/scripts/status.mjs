#!/usr/bin/env node
/**
 * Reports whether login (Clerk) and the database (Turso / Supabase) are switched on,
 * without ever printing a key, token, or URL.
 *
 * ON/OFF follows the "configured" rules in src/utils/env-config.ts: a missing value, an
 * unreplaced `YOUR_...` placeholder from .env.example, or (for Supabase) a URL that is
 * not http(s) means that feature is off. Key-prefix checks such as `pk_` are only hints:
 * the app accepts those values, so a swapped key still counts as ON, flagged.
 *
 * Run from the project root:
 *   node --env-file=.env .claude/skills/auth-and-database-setup/scripts/status.mjs
 */
import { pathToFileURL, URL } from 'node:url'

const isHttpUrl = v => URL.canParse(v) && ['http:', 'https:'].includes(new URL(v).protocol)

/**
 * `valid` is an app rule and failing it turns the feature OFF; `looks` is only a hint.
 * @typedef {{ key: string, valid?: (v: string) => boolean, looks?: (v: string) => boolean, expect?: string, note?: string }} Field
 */

/** @type {{ name: string, required: Field[], optional?: Field[] }[]} */
const GROUPS = [
  {
    name: 'Login (Clerk)',
    required: [
      { key: 'PUBLIC_CLERK_PUBLISHABLE_KEY', looks: v => v.startsWith('pk_'), expect: 'pk_...' },
      { key: 'CLERK_SECRET_KEY', looks: v => v.startsWith('sk_'), expect: 'sk_...' },
    ],
    optional: [
      {
        key: 'CLERK_WEBHOOK_SECRET',
        looks: v => v.startsWith('whsec_'),
        expect: 'whsec_...',
        note: 'syncs users into Supabase',
      },
    ],
  },
  {
    name: 'Database: Turso',
    required: [
      {
        key: 'TURSO_DATABASE_URL',
        // Every scheme @libsql/client accepts, including `turso dev`'s http://127.0.0.1.
        looks: v => /^(libsql|https?|wss?|file):/.test(v),
        expect: 'libsql://...',
      },
      { key: 'TURSO_AUTH_TOKEN' },
    ],
  },
  {
    name: 'Database: Supabase',
    required: [
      { key: 'SUPABASE_URL', valid: isHttpUrl, expect: 'https://...' },
      { key: 'SUPABASE_ANON_KEY' },
    ],
    optional: [
      { key: 'SUPABASE_SERVICE_ROLE_KEY', note: 'needed to sync Clerk users' },
      { key: 'PUBLIC_SUPABASE_URL', valid: isHttpUrl, expect: 'https://...', note: 'browser' },
      { key: 'PUBLIC_SUPABASE_ANON_KEY', note: 'browser' },
    ],
  },
]

/**
 * Classifies one env value. Never returns the value itself.
 * @param {string | undefined} value
 * @param {Field} field
 * @returns {'ok' | 'missing' | 'placeholder' | string}
 */
function fieldState(value, field) {
  if (!value) return 'missing'
  if (value.startsWith('YOUR_')) return 'placeholder'
  if (field.valid && !field.valid(value)) return `unusable (expected ${field.expect})`
  if (field.looks && !field.looks(value)) return `set, but expected ${field.expect}`
  return 'ok'
}

/** Whether the app would treat a field in this state as configured. */
const counts = state => state === 'ok' || state.startsWith('set, but')

/** undici's default header timeout is 5 minutes; a silent server would stall the report. */
const PROBE_TIMEOUT_MS = 10_000

/**
 * Asks Supabase whether the `users` table from scripts/migrations/001_core_schema.sql exists.
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<string>}
 */
async function supabaseSchemaLine(env, fetchImpl) {
  try {
    const url = new URL('/rest/v1/users?select=id&limit=1', env.SUPABASE_URL)
    const res = await fetchImpl(url, {
      headers: { apikey: String(env.SUPABASE_ANON_KEY) },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    })
    if (res.ok) return 'Supabase users table: found'
    // PostgREST answers "permission denied" (42501) with 401 for anonymous requests, so the
    // status alone cannot tell a bad key from missing table grants. Only the code is read.
    const code = (await res.json().catch(() => null))?.code
    if (code === '42501')
      return 'Supabase users table: exists, but the anon key has no access to it (42501)'
    if (res.status === 404) return 'Supabase users table: MISSING (404) - run the schema SQL'
    if (res.status === 401)
      return 'Supabase users table: key rejected (HTTP 401) - recopy SUPABASE_ANON_KEY'
    return `Supabase users table: unexpected HTTP ${res.status}`
  } catch (error) {
    if (error?.name === 'TimeoutError')
      return `Supabase users table: timed out after ${PROBE_TIMEOUT_MS / 1000}s`
    // Only the error code: the message can contain the project hostname.
    return `Supabase users table: could not reach SUPABASE_URL (${error?.cause?.code ?? 'network error'})`
  }
}

/**
 * Builds the status report.
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<string[]>}
 */
export async function report(env, fetchImpl = fetch) {
  const lines = []
  const on = {}

  for (const group of GROUPS) {
    const states = group.required.map(f => fieldState(env[f.key], f))
    on[group.name] = states.every(counts)
    lines.push(`${group.name}: ${on[group.name] ? 'ON' : 'OFF'}`)
    group.required.forEach((f, i) => lines.push(`  ${f.key.padEnd(30)} ${states[i]}`))
    for (const f of group.optional ?? []) {
      lines.push(`  ${f.key.padEnd(30)} ${fieldState(env[f.key], f)} (optional: ${f.note})`)
    }
  }

  // Same precedence as detectDatabaseProviders() in src/libs/database.ts.
  const turso = on['Database: Turso']
  const supabase = on['Database: Supabase']
  const explicit = env.DATABASE_PROVIDER
  const active =
    (explicit === 'turso' && turso) || (explicit === 'supabase' && supabase)
      ? explicit
      : supabase
        ? 'supabase'
        : turso
          ? 'turso'
          : 'none'
  lines.push(`Database used for messages: ${active}`)

  if (supabase) {
    lines.push(await supabaseSchemaLine(env, fetchImpl))
    // The webhook and fetchUserWithRole() write users through getSupabaseServiceRole(),
    // which returns null without this key (src/libs/supabase-native.ts).
    const needs = [
      !on['Login (Clerk)'] && 'Login ON',
      !counts(fieldState(env.SUPABASE_SERVICE_ROLE_KEY, { key: 'SUPABASE_SERVICE_ROLE_KEY' })) &&
        'SUPABASE_SERVICE_ROLE_KEY',
    ].filter(Boolean)
    lines.push(
      needs.length
        ? `Clerk user sync: not ready (needs ${needs.join(' and ')})`
        : 'Clerk user sync: ready'
    )
  }
  return lines
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(`${(await report(process.env)).join('\n')}\n`)
}
