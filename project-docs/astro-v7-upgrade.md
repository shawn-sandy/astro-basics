# Astro v6 → v7 Upgrade

## Summary

Upgraded `astro` and every `@astrojs/*` package from v6 to their v7-compatible
majors via `npx @astrojs/upgrade`, fixed the resulting breaking changes, and
added a 3-adapter CI build matrix (netlify, vercel, node) to keep all three
deploy targets green going forward.

## Breaking changes that applied

- **Rust compiler HTML strictness** — the new default compiler no longer
  auto-corrects invalid markup. No unclosed tags were found across the 80
  `.astro` files in this repo; the only compile failures came from third-party
  packages (see below), not our own components.
- **`compressHTML` default → `'jsx'`** — strips inter-element whitespace. A
  spot-check of the built output (`dist/client/**/*.html`) confirms adjacent
  inline elements (nav links, badges) still render with a space between them.
  No deliberate `compressHTML: true` override was needed.

## Issues found during the bump (not in the original breaking-changes list)

1. **Starlight sidebar config (`0.38` → `0.41`)** — `autogenerate` sidebar
   entries with a top-level `label` were removed in Starlight v0.39. Fixed by
   wrapping each in an `items: [{ autogenerate: {...} }]` array in
   `astro.config.mjs`.
2. **`@clerk/astro` does not support Astro v7 yet** (latest published:
   `3.4.10`, peer range still `^4.15.0 || ^5.0.0 || ^6.0.0`). Its bundled
   `UserButton/MenuItemRenderer.astro` uses a bare `return;` inside a
   `<script is:inline>` block, which Astro v7's stricter compiler rejects as
   invalid top-level JS. Patched via `patch-package`
   (`patches/@clerk+astro+3.0.23.patch`) to restructure the guard as an
   `if (hasParentMenuItem) { ... }` block instead of an early return —
   **temporary, remove this patch once Clerk ships real Astro v7 support.**
3. **`.npmrc` added** (`legacy-peer-deps=true`) — required because `@clerk/astro`
   and `astro-embed` both cap their `astro` peerDependency below `^7`, which
   makes strict npm installs fail with `ERESOLVE`. Remove once both packages
   publish v7-compatible peer ranges.
4. **`src/pages/offline.astro`** had a `<script type="module">` (not
   `is:inline`) importing from an absolute `/scripts/...` public path. Astro
   v6's bundler tolerated this; Astro v7's Rolldown-based bundler hard-fails
   on the unresolved import. Fixed by marking the script `is:inline` so the
   import is left for the browser to resolve at runtime, matching the
   `is:inline src="/scripts/init.js"` script one line above it.
5. **`lightningcss@1.32.0` crashes with `[lightningcss minify] Invalid state`**
   during CSS minification with Astro v7's Vite 8 / Rolldown build. Root cause
   not isolated to a specific stylesheet. Worked around with
   `vite.build.cssMinify: false` in `astro.config.mjs` — CSS ships unminified
   for now. Revisit once a lightningcss patch release fixes the crash.
6. **Missing `nanostores` direct dependency.** `@nanostores/react` declares
   `nanostores` as a peer, but it was never listed in `package.json` — it only
   worked because npm happened to hoist a transitive copy from
   `@clerk/astro`'s dependency tree. Astro v7's Rolldown bundler fails outright
   (`Rolldown failed to resolve import "nanostores"`) instead of tolerating an
   un-hoisted nested copy. Fixed by adding `nanostores` as a direct dependency.
   Reproduced and verified with a clean `npm ci`, matching CI exactly.
7. **`post.slug` no longer exists on content-layer entries** (replaced by
   `post.id` since the v5 content-layer migration this repo already did on
   v6). `src/pages/rss.xml.js` and `src/pages/blog.astro` were both still
   using `post.slug`, silently rendering `/posts/undefined/` links — a
   pre-existing bug independent of this upgrade, caught while adding the RSS
   readiness test. Fixed both to `post.id`.

## Content-layer test setup

`getCollection()` in Vitest requires the _dev-mode_ content data store
(`.astro/data-store.json`), which `astro sync` alone does not populate (it
only writes the build-mode cache under `node_modules/.astro/`). Added a
`pretest` npm script that runs `astro sync` and copies the build-mode store
into the dev-mode location so `npm test` reliably has content collections
available.

## CI

`.github/workflows/ci.yml` added: a build matrix across all three adapters,
plus a job running type-check, unit tests, and the e2e smoke suite.

Two steps are `continue-on-error: true` (informational, not merge-blocking)
because they carry pre-existing debt independent of this upgrade:

- **`type-check`** — the repo has ~127 pre-existing TypeScript errors
  (Supabase type strictness, `exactOptionalPropertyTypes`, etc.), confirmed
  via a git-stash comparison to predate this upgrade entirely. Fixing them is
  a separate, much larger effort.
- **The broader `vitest run --exclude tests/integration/**`\*\* — beyond the
  DB-credential-dependent integration tests (excluded outright, no secrets
  belong in a public PR workflow), ~49 more tests fail for unrelated
  pre-existing reasons (role-validator, csrf, ip-validation, etc.).

The tests that actually verify this Astro upgrade
(`tests/content-collections.test.ts`, `tests/compress-html-whitespace.test.ts`)
run as a separate, hard-blocking step ahead of the informational full suite.

## Dedupe and pinning decision

`npm dedupe` leaves a single deduped `astro@7.0.4` across the whole tree
(confirmed via `npm ls astro`). Kept caret (`^`) ranges rather than pinning to
exact versions — the tree already resolves to one copy of `astro` and every
`@astrojs/*` package, so exact pins would add maintenance overhead (manual
bumps for every patch release) without a reproducibility gain `package-lock.json`
doesn't already provide.

## Dependency versions

| Package            | v6     | v7     |
| ------------------ | ------ | ------ |
| astro              | 6.0.0  | 7.0.4  |
| @astrojs/mdx       | 5.0.4  | 7.0.0  |
| @astrojs/netlify   | 7.0.8  | 8.0.0  |
| @astrojs/node      | 10.0.6 | 11.0.0 |
| @astrojs/react     | 5.0.4  | 6.0.0  |
| @astrojs/vercel    | 10.0.6 | 11.0.0 |
| @astrojs/rss       | 4.0.14 | 4.0.19 |
| @astrojs/sitemap   | 3.7.2  | 3.7.3  |
| @astrojs/starlight | 0.38.4 | 0.41.2 |
