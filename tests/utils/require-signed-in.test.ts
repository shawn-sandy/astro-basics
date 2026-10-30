// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import type { AstroGlobal } from 'astro'
import { describe, expect, it, vi } from 'vitest'

import { requireSignedIn } from '#utils/require-signed-in'

const pagesDir = fileURLToPath(new URL('../../src/pages/', import.meta.url))

/** Every file Astro could route under the protected trees, relative to src/pages. */
function protectedPageFiles() {
  return ['dashboard', 'organization'].flatMap(tree =>
    readdirSync(join(pagesDir, tree), { recursive: true, withFileTypes: true })
      .filter(entry => entry.isFile())
      .map(entry => relative(pagesDir, join(entry.parentPath, entry.name)))
  )
}

const setupNotice = new Response('setup notice', { status: 503 })
const signInRedirect = new Response(null, { status: 307 })

/** A page's `Astro` global with only what `requireSignedIn` reads. */
function fakeAstro(auth?: () => { userId: string | null }) {
  const rewrite = vi.fn(async () => setupNotice)
  const redirectToSignIn = vi.fn(() => signInRedirect)
  const locals = auth ? { auth: () => ({ ...auth(), redirectToSignIn }) } : {}
  const astro = { locals, rewrite } as unknown as AstroGlobal
  return { astro, rewrite, redirectToSignIn }
}

describe('requireSignedIn', () => {
  it('renders the setup notice when the middleware did not install Clerk', async () => {
    const { astro, rewrite } = fakeAstro()

    expect(await requireSignedIn(astro)).toBe(setupNotice)
    expect(rewrite).toHaveBeenCalledWith('/auth-setup')
  })

  it('redirects a signed-out visitor to sign-in', async () => {
    const { astro, rewrite, redirectToSignIn } = fakeAstro(() => ({ userId: null }))

    expect(await requireSignedIn(astro)).toBe(signInRedirect)
    expect(redirectToSignIn).toHaveBeenCalledOnce()
    expect(rewrite).not.toHaveBeenCalled()
  })

  it('lets a signed-in user through', async () => {
    const { astro, rewrite, redirectToSignIn } = fakeAstro(() => ({ userId: 'user_123' }))

    expect(await requireSignedIn(astro)).toBeUndefined()
    expect(redirectToSignIn).not.toHaveBeenCalled()
    expect(rewrite).not.toHaveBeenCalled()
  })
})

// The middleware's prefix match is only a backstop, so each page must refuse signed-out
// visitors itself. An endpoint (.ts) here needs its own locals.auth() check and test.
describe('pages under /dashboard and /organization', () => {
  const files = protectedPageFiles()

  it('include the known protected pages', () => {
    expect(files).toEqual(
      expect.arrayContaining([
        'dashboard/index.astro',
        'dashboard/users.astro',
        'organization/index.astro',
      ])
    )
  })

  it.each(files)('%s returns the requireSignedIn refusal first', file => {
    expect(file).toMatch(/\.astro$/)
    const [, frontmatter = ''] = readFileSync(join(pagesDir, file), 'utf8').split(/^---$/m)
    const code = frontmatter.replace(/^import\b[\s\S]*?'[^']+'$/gm, '').trimStart()
    expect(code).toMatch(/^const (\w+) = await requireSignedIn\(Astro\)\s+if \(\1\) return \1\b/)
  })
})
