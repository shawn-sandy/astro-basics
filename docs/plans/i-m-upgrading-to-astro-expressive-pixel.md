# Astro v5 → v6 Upgrade Plan

## Context

The project is on Astro `^5.16.9` and the user wants to upgrade to the latest Astro 6.x release line ("Expressive Pixel"). Astro 6 bumps Vite to 7, Zod to 4, Shiki to 4, and bumps the minimum Node to 22.12.0 (we run v25.8.2, so satisfied). The two highest-impact breaking changes for this codebase are:

1. **The legacy Content Collections API is fully removed** — three collections (`posts`, `docs`, `content`) are defined the old way in `src/content/config.ts` and consumed via `entry.slug` / `entry.render()` across five pages.
2. **Adapter and integration majors must move in lockstep** — every `@astrojs/*` package needs a major bump that's compatible with Astro 6's Integration API (notably the deprecated `createExports()` / `start()` / `NodeApp` / `astro:ssr-manifest` / `astro:build:done` `routes` parameter).

Everything else in the breaking-change list is either absent (`Astro.glob`, `ASSETS_PREFIX`, `emitESMImage`, Actions `rewrite()`, `<ViewTransitions />` runtime use, CJS configs, `i18n.routing.redirectToDefaultLocale`) or already covered by current Zod usage (no `z.string().email/url/uuid/datetime/ip/cuid` validators in `src/`, `config/`, or `scripts/`).

The work is split across two PRs to limit blast radius — PR 1 is "make the runtime boot on v6", PR 2 is "migrate content + schemas".

---

## PR 1 — Core, Integrations, Adapters

### Objective

Get the project building, booting, and passing tests on Astro 6 with all integrations and adapters bumped to v6-compatible majors. Content collections stay on the legacy API for this PR by enabling Astro's `legacy.collections` flag (the documented one-PR escape hatch).

### Steps

1. **Add Node engine constraints** — _Why: Astro v6 requires Node 22.12.0; CI and contributors need to fail fast on older runtimes._
   - Add `"engines": { "node": ">=22.12.0" }` to `package.json`.
   - Create `.nvmrc` containing `22` at repo root.

2. **Drop `@sentry/astro`** — _Why: imported in `dependencies` but never added to `integrations[]` in `astro.config.mjs`; carrying it forward only complicates dep resolution._
   - Remove `@sentry/astro` from `package.json` dependencies. (Confirm no `import '@sentry/astro'` anywhere via `grep -r '@sentry/astro' src/ scripts/ config/`.)

3. **Bump `astro` core** — _Why: the foundation of the upgrade._
   - `package.json`: `astro: ^5.16.9` → `astro: ^6.0.0` (latest 6.x will resolve via `^`).

4. **Bump `@astrojs/*` integrations and adapters in lockstep** — _Why: each integration's v6-compatible major aligns with Astro 6's revised Integration API (entrypoint resolution, removed `routes` from `astro:build:done`, etc.). Mismatched versions will fail at build with cryptic Vite errors._
   - `@astrojs/mdx: ^4 → ^5`
   - `@astrojs/react: ^4 → ^5` (verify React 19 vs 18 — we're on React 18; check whether `@astrojs/react@^5` still supports React 18 or pins 19)
   - `@astrojs/sitemap: ^3 → ^4`
   - `@astrojs/starlight: ^0.37 → latest compatible with Astro 6` (Starlight typically gates on Astro peer; verify exact min version)
   - `@astrojs/netlify: ^6 → ^7`
   - `@astrojs/node: ^9 → ^10`
   - `@astrojs/vercel: ^9 → ^10`
   - `@vite-pwa/astro: ^1 → latest` (peer-deps Astro 6)
   - `astro-embed: ^0.9 → latest` and `@astro-community/astro-embed-youtube: ^0.5 → latest`
   - `@clerk/astro: ^2.10 → latest` (verify Astro 6 peer support)

5. **Bump direct `zod` dependency 3 → 4** — _Why: Astro 6 internally uses Zod 4; aligning the direct dep prevents two Zod copies in the bundle. Our schemas don't use removed string-format validators, so this is a no-op for `src/content/config.ts`._
   - `zod: ^3.25.76 → ^4.0.0` and run `npm install`.

6. **Enable the legacy collections escape hatch** — _Why: keeps PR 1 focused on infra by deferring the Content Layer migration to PR 2._
   - Add `legacy: { collections: true }` to `astro.config.mjs` (Astro 6 still ships this flag for one-major migrations).

7. **Remove the dead `<ViewTransitions />` reference** — _Why: even commented-out, it's misleading future readers since the import would now be `<ClientRouter />`._
   - `src/layouts/Base.astro:60` — delete the commented line.

8. **Verify adapter selection still resolves under v6** — _Why: the IIFE `adapter` switcher in `astro.config.mjs:117–130` doesn't change, but each adapter's `default()` factory signature could change in v6._
   - Check `@astrojs/node@^10` still accepts `{ mode: 'standalone' }`.
   - Check `@astrojs/netlify@^7` and `@astrojs/vercel@^10` still default-export factories with no required args.

9. **Vite 7 sanity check** — _Why: Vite 7 may surface SSR config changes; we have one in `astro.config.mjs:114` (`ssr: { noExternal: ['astro-imagetools'] }`)._
   - Confirm `astro-imagetools` is still actually used (grep `astro-imagetools` in `src/`); if not, remove the noExternal entry.

10. **Run quality gates** — _Why: catches type drift from new integration types, adapter signature changes, and Zod 4 type narrowing._
    - `npm run type-check`
    - `npm run lint:check`
    - `npm run build` for each adapter: `ASTRO_ADAPTER=node|netlify|vercel npm run build`
    - `npm test` (Vitest) and `npm run test:e2e` (Playwright — install with `npx playwright install` if needed)

### Critical files modified in PR 1

- `package.json` (engines, deps, removal of `@sentry/astro`)
- `.nvmrc` (new)
- `astro.config.mjs` (`legacy.collections`, possibly `ssr.noExternal` cleanup)
- `src/layouts/Base.astro` (delete commented `<ViewTransitions />`)

### Verification (PR 1)

- `node --version` reports 22.12+
- `npm run type-check` passes
- `npm run build` succeeds for all three adapters via `ASTRO_ADAPTER` switching
- `npm run dev` boots without warnings about removed APIs
- `/dashboard`, `/forum/*` still gate behind Clerk (middleware unchanged)
- `/posts/*`, `/docs/*`, `/content/*` still render — they should, because `legacy.collections: true` keeps the old `entry.slug` / `entry.render()` paths working
- `/rss.xml` (currently `src/pages/rss.xml.js`) still serves; v6's trailing-slash rule for extensioned endpoints means a request to `/rss.xml/` should now redirect or 404 — verify behavior

---

## PR 2 — Content Layer Migration + Schema Alignment

### Objective

Migrate the three collections (`posts`, `docs`, `content`) off the legacy Content Collections API onto the Content Layer API, update the five consuming pages, and remove the `legacy.collections` escape hatch.

### Steps

1. **Rename and rewrite the collections config** — _Why: Astro 6 expects the file at the new path and demands an explicit `loader` per collection._
   - Move `src/content/config.ts` → `src/content.config.ts`.
   - For each collection, replace the schema-only definition with a `glob()` loader from `astro/loaders`:

     ```ts
     import { defineCollection, z } from 'astro:content'
     import { glob } from 'astro/loaders'
     import { docsSchema } from '@astrojs/starlight/schema'

     const posts = defineCollection({
       loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
       schema: /* unchanged */,
     })
     // ... docs (Starlight handles its own loader — verify Starlight v6 docs for the correct setup)
     // ... content
     ```

   - Remove `type: 'content'` if present (none currently — already absent).

2. **Update the five consuming pages from `entry.slug` → `entry.id` and `entry.render()` → `render(entry)`** — _Why: Content Layer entries no longer carry `slug` or `render()` — slugs become `id`, and render is a top-level function._
   - `src/pages/posts/[...slug].astro:8, 25, 32` — `entry.slug` → `entry.id`; `entry.render()` → `render(entry)` (import `render` from `astro:content`).
   - `src/pages/docs/index.astro:8` — same pattern.
   - `src/pages/docs/[...slug].astro:11, 35` — same pattern.
   - `src/pages/content/index.astro:9` — `article.render()` → `render(article)`.
   - `src/pages/content/[...slug].astro:9, 19` — same pattern.

3. **Remove the legacy escape hatch** — _Why: confirms we've fully migrated and prevents silent fallback to deprecated code paths._
   - Delete `legacy: { collections: true }` from `astro.config.mjs`.

4. **Verify Starlight's docs collection** — _Why: Starlight ships its own loader (`docsLoader()`) for Content Layer; the legacy `docsSchema()`-only pattern won't work in v6._
   - Check `@astrojs/starlight` v6 migration docs: typical pattern is `defineCollection({ loader: docsLoader(), schema: docsSchema() })`.

5. **Re-run the same verification suite as PR 1**, plus content-specific checks:
   - Open `/posts/<known-slug>` — markdown renders, frontmatter resolves, headings work.
   - Open `/docs/` and `/docs/<slug>` — Starlight pages render with proper navigation.
   - Open `/content/` — single `content.mdx` entry resolves and `<CollectionList>` lists collection items.

### Critical files modified in PR 2

- `src/content.config.ts` (new, replaces `src/content/config.ts`)
- `src/content/config.ts` (deleted)
- `src/pages/posts/[...slug].astro`
- `src/pages/docs/index.astro`
- `src/pages/docs/[...slug].astro`
- `src/pages/content/index.astro`
- `src/pages/content/[...slug].astro`
- `astro.config.mjs` (remove `legacy.collections`)

### Verification (PR 2)

- All five collection-consuming pages render in `npm run dev`
- `npm run build` produces the same number of routes as before (no silent drops from collection mis-glob)
- `npm run type-check` passes — `CollectionEntry<'posts'>` type now reflects Content Layer shape with `id` instead of `slug`
- Vitest unit tests still pass; any test asserting `entry.slug` will need to be updated

---

## Out of Scope (Next Steps)

- Wire up `@sentry/astro` properly if telemetry is desired (currently dropped as dead code)
- Audit Starlight v6 sidebar/social schema changes if the version jumps significantly
- Evaluate Astro 6's new SVG rasterization in image service for any product use cases
- Consider migrating from `import.meta.env.PUBLIC_*` reads to the typed `astro:env/server` API (not breaking, but cleaner)

## Unresolved Questions

- Does `@astrojs/starlight@^0.37` support Astro 6, or do we need to bump to a newer Starlight major (e.g., 0.40+)? Needs a quick check of the Starlight changelog before PR 1.
- Does the Vercel deployment use `@astrojs/vercel/serverless` or `@astrojs/vercel` (v9+ unified the entrypoint)? Confirm the import path is `@astrojs/vercel` (already correct) and that no dynamic-import fallback elsewhere relies on the old subpath.
