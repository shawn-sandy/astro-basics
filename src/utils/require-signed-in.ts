import type { AstroGlobal } from 'astro'

/**
 * Access check for a page only signed-in users may see. Call it first in the
 * page's frontmatter and return its response when there is one.
 *
 * The check lives in the page because path matching in middleware can diverge
 * from how Astro routes a request (the reason `@clerk/astro` 4 removed
 * `createRouteMatcher`). The middleware's /dashboard and /organization prefix
 * match is only a backstop, and `tests/utils/require-signed-in.test.ts` fails
 * when a page under those trees does not call this.
 *
 * Without Clerk keys the middleware never installs Clerk, so `locals.auth` is
 * unset. The page then fails closed and renders the /auth-setup notice (HTTP
 * 503).
 *
 * @param astro - The page's `Astro` global.
 * @returns A redirect to sign-in or the setup notice, or `undefined` when the
 *   user is signed in.
 * @security Every page under /dashboard and /organization depends on this check
 * @example
 * const refusal = await requireSignedIn(Astro)
 * if (refusal) return refusal
 */
export async function requireSignedIn(astro: AstroGlobal): Promise<Response | undefined> {
  if (typeof astro.locals.auth !== 'function') return astro.rewrite('/auth-setup')

  const auth = astro.locals.auth()
  return auth.userId ? undefined : auth.redirectToSignIn()
}
