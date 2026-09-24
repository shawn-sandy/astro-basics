#!/usr/bin/env node
/**
 * Reports whether login (Clerk) and the database (Turso / Supabase) are switched on,
 * without ever printing a key, token, or URL.
 *
 * Mirrors the "configured" rules in src/utils/env-config.ts: a missing value or an
 * unreplaced `YOUR_...` placeholder from .env.example means that feature is off.
 *
 * Run from the project root:
 *   node --env-file=.env .claude/skills/auth-and-database-setup/scripts/status.mjs
 */
import { pathToFileURL, URL } from 'node:url'

const isHttpUrl = v => URL.canParse(v) && ['http:', 'https:'].includes(new URL(v).protocol)

/** @typedef {{ key: string, looks?: (v: string) => boolean, expect?: string, note?: string }} Field */

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
        looks: v => /^(libsql|https):\/\//.test(v),
        expect: 'libsql://...',
      },
      { key: 'TURSO_AUTH_TOKEN' },
    ],
  },
  {
    name: 'Database: Supabase',
    required: [
      { key: 'SUPABASE_URL', looks: isHttpUrl, expect: 'https://...' },
      { key: 'SUPABASE_ANON_KEY' },
    ],
    optional: [
      { key: 'SUPABASE_SERVICE_ROLE_KEY', note: 'needed to sync Clerk users' },
      { key: 'PUBLIC_SUPABASE_URL', looks: isHttpUrl, expect: 'https://...', note: 'browser' },
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
  if (field.looks && !field.looks(value)) return `wrong format (expected ${field.expect})`
  return 'ok'
}

/**
 * Asks Supabase whether the `users` table from scripts/migrations/001_core_schema.sql exists.
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<string>}
 */
async function supabaseSchemaLine(env, fetchImpl) {
  try {
    const url = new URL('/rest/v1/users?select=id&limit=1', env.SUPABASE_URL)
    const res = await fetchImpl(url, { headers: { apikey: String(env.SUPABASE_ANON_KEY) } })
    if (res.ok) return 'Supabase users table: found'
    if (res.status === 404) return 'Supabase users table: MISSING - run the schema SQL'
    if (res.status === 401 || res.status === 403)
      return `Supabase users table: key rejected (HTTP ${res.status}) - recopy SUPABASE_ANON_KEY`
    return `Supabase users table: unexpected HTTP ${res.status}`
  } catch (error) {
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
    on[group.name] = states.every(s => s === 'ok')
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

  if (supabase) lines.push(await supabaseSchemaLine(env, fetchImpl))
  return lines
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(`${(await report(process.env)).join('\n')}\n`)
}
