import type { APIContext, AstroGlobal } from 'astro'

const protectedPath = /^\/(dashboard|organization)/i

/**
 * Whether a request falls under /dashboard or /organization, matched as
 * broadly as the old `createRouteMatcher(['/dashboard(.*)', '/organization(.*)'])`.
 *
 * This is the middleware's backstop, so a page added under those trees without
 * its own check still fails closed. It tests two things, because neither is
 * enough alone. `url` is Astro's normalized URL, decoded with repeated slashes
 * collapsed, which matches `/%64ashboard`, `/%2564ashboard` and `//dashboard`,
 * and paths with no page such as `/dashboard/nope`. But it also resolves dot
 * segments and routing does not, so `/dashboard/%252e%252e/x` reads as `/x` while
 * Astro serves it from any catch-all under /dashboard. `routePattern`, the route
 * Astro matched, catches that. `request.url` is neither. Setting `base` in
 * astro.config.mjs would mean stripping it from `url` first.
 *
 * @param context - The middleware's context.
 * @returns True for paths and routes under the protected trees.
 * @security Second layer of route protection; `requireSignedIn` is the first
 */
export const isProtectedRoute = ({
  url,
  routePattern,
}: Pick<APIContext, 'url' | 'routePattern'>): boolean =>
  protectedPath.test(url.pathname) || protectedPath.test(routePattern)

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
