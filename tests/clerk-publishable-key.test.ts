import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { readPublishableKey } from '#integrations/clerk/publishable-key'

// astro.config.mjs gates Clerk's browser scripts on this key, so it must come from the same
// `.env` files Astro loads for the build. `astro build` forces NODE_ENV to production.
describe('readPublishableKey', () => {
  const root = mkdtempSync(join(tmpdir(), 'clerk-key-'))
  const stagingKey = 'pk_test_c3RhZ2luZy5leGFtcGxlLmNvbSQ'
  writeFileSync(join(root, '.env.staging'), `PUBLIC_CLERK_PUBLISHABLE_KEY=${stagingKey}\n`)
  const hostKey = process.env.PUBLIC_CLERK_PUBLISHABLE_KEY

  beforeEach(() => {
    delete process.env.PUBLIC_CLERK_PUBLISHABLE_KEY
    vi.stubEnv('NODE_ENV', 'production')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    if (hostKey === undefined) delete process.env.PUBLIC_CLERK_PUBLISHABLE_KEY
    else process.env.PUBLIC_CLERK_PUBLISHABLE_KEY = hostKey
  })

  afterAll(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('reads the .env file for `--mode staging`', () => {
    expect(readPublishableKey(['node', 'astro', 'build', '--mode', 'staging'], root)).toBe(
      stagingKey
    )
  })

  it('reads the .env file for `--mode=staging`', () => {
    expect(readPublishableKey(['node', 'astro', 'build', '--mode=staging'], root)).toBe(stagingKey)
  })

  it('ignores another mode’s .env file when no mode is given', () => {
    expect(readPublishableKey(['node', 'astro', 'build'], root)).toBeUndefined()
  })

  it('reads a key the host sets in process.env', () => {
    process.env.PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_live_aG9zdC5leGFtcGxlLmNvbSQ'
    expect(readPublishableKey(['node', 'astro', 'build'], root)).toBe(
      'pk_live_aG9zdC5leGFtcGxlLmNvbSQ'
    )
  })
})
