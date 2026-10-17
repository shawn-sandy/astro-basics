---
status: in-progress
type: fix
created: 2026-10-16
modified: 2026-10-16
workflow: never
artifact-url: https://claude.ai/artifact/7qgGa5gtDwVYLVQ9bMTsu4
issue: https://github.com/shawn-sandy/astro-basics/issues/386
glance: A site built without a Clerk key currently ships Clerk's browser startup scripts anyway, and on some page loads their "Missing publishableKey" error leaves every interactive section of the page dead. That is what made the salttampa.org card gallery ignore its Next button on about 1 load in 4. We will know it worked when a keyless build loads with zero Clerk errors and the e2e test that forces the losing script order passes.
---

# Plan: Keep every island alive on sites built without a Clerk key

## Objective

Stop `@clerk/astro` from shipping its browser startup scripts when `PUBLIC_CLERK_PUBLISHABLE_KEY` is missing or a placeholder, so islands (the parts of an Astro page that load JavaScript, such as a gallery or carousel) always hydrate on keyless builds.

## Context

The bug surfaced on salttampa.org, a site built from this template. Its card gallery's Next button did nothing on roughly 1 load in 4, and the testimonials froze with it. That session fixed the live site by adding Clerk keys in Netlify. The cause lives in this repo's `astro.config.mjs`, so every keyless deploy of the template has the same race.

How it fails, traced in `@clerk/astro` 3.0.23 and Astro's island runtime:

- `clerk()` in `astro.config.mjs` injects two browser scripts on every page: a `before-hydration` script and a `page` script. Both call Clerk's `runInjectionScript`.
- Clerk's setup runs only once, in whichever script calls it first (`runOnce` in `node_modules/@clerk/astro/dist/chunk-NBEDB76N.js`). With no key, that first call throws `@clerk/astro: Missing publishableKey`. The second call returns quietly.
- Every island runs `await import(beforeHydrationUrl)` before it starts (`node_modules/astro/dist/runtime/server/astro-island.js:58`). When the `before-hydration` script is the one that throws, that import rejects, `start()` never runs, and no island on the page hydrates.
- The order changes from load to load, which is why the failure is intermittent.

Evidence from this repo with no `.env` in the worktree (the dev server on port 4331 was confirmed to serve this worktree):

- The error fired on 8 of 8 homepage loads in the browser pane.
- `/about` has a `client:load` island. Importing its `before-hydration-url` first in a fresh same-origin document rejected with `Missing publishableKey`. Ten ordinary loads of `/about` all hydrated, because the `page` script won the race each time. That is why the test has to force the order.

Why the integration cannot simply be dropped when there is no key: `Show` from `@clerk/astro/components`, used in `src/layouts/Base.astro` on every page, imports `virtual:@clerk/astro/config`. Only the integration's Vite plugin provides that module, so removing `clerk()` breaks the build.

Risks and mitigations:

- The fix wraps Clerk's `astro:config:setup` hook and swaps in a no-op `injectScript`. If a future `@clerk/astro` release injects its scripts somewhere else, the wrapper silently stops working. Mitigation: the step 1 and 2 tests run in CI against the keyless preview build, so the error coming back fails CI.
- `loadEnv` comes from `vite`, which reaches this repo through `astro` and is not in `package.json`. This is the pattern Astro's own docs give for reading `.env` in `astro.config.mjs`. Accepted.
- CI retries failed Playwright tests twice (`retries: 2` in `playwright.config.ts`), which would hide a flaky race test. The forced-order test in step 2 is deterministic, so retries cannot mask it.

## Decisions

- Gate on the publishable key alone, with `startsWith('pk_')` — the browser scripts need only that key, and the prefix check rejects both a missing value and the `.env.example` placeholder `YOUR_CLERK_PUBLISHABLE_KEY` in one test. `src/middleware.ts` keeps its own two-key check for server-side gating.
- Keep `clerk()` registered and drop only its injected scripts — `Show` needs the virtual module the integration provides.
- Decide at build time, in `astro.config.mjs` — Astro inlines `PUBLIC_` variables when the site builds, so a key added later needs a redeploy either way, as salttampa.org found.
- Do not reuse `envConfig.isClerkConfigured()` from `src/utils/env-config.ts` — it reads `import.meta.env` and caches the result, and `.env` values are not visible there while `astro.config.mjs` loads.
- Put the regression tests in `e2e/auth-fail-closed.spec.ts` — it already runs in CI against a keyless preview build, so `.github/workflows/ci.yml` needs no change.
- Keep `@clerk/astro` at `^3.0.23` rather than pinning it — the keyless e2e tests fail CI if an upgrade moves Clerk's script injection out of `astro:config:setup`, so a pin would add upkeep without adding protection (confirmed in the planning interview).
- Import `loadEnv` from `vite` without adding `vite` to `package.json` — it is Astro's documented pattern, and `vite` ships with `astro` (confirmed in the planning interview).
- Use the red-green-verify shape — the change touches application code and Playwright can run the failing test first. The GREEN loop cap sits on step 3, the only step that iterates against tests. No SHIP phase: committing and opening a PR wait for an explicit request.
- No `## Previews` — nothing visible changes. The header's Clerk sign-in control stays hidden on keyless builds both before and after the fix.

## Files

- e2e/auth-fail-closed.spec.ts (modified) — two keyless-hydration tests, and the header comment widened to cover public pages
- astro.config.mjs (modified) — read the key with `loadEnv`, and register Clerk through a `clerkIntegration()` helper that drops its scripts without a key
- src/content/docs/guide/environment-configuration.mdx (modified) — Starlight guide note on what a keyless build does with Clerk
- project-docs/11-reference/environment-configuration.md (modified) — the same note in the project docs
- CHANGELOG.md (modified) — entry under `[Unreleased]` → `### Fixed`
- src/components/react/astro-breadcrumb.tsx (modified) — import `Breadcrumb` from `@fpkit/acss` instead of `@fpkit/react`, whose unkeyed fragment logged a React dev-mode "unique key" error that failed steps 8 and 9 on the dev server
- src/integrations/clerk/publishable-key.ts (new) — `readPublishableKey()`, which reads the key from `process.env` and the `.env` files for the build's mode, honouring `astro build --mode`; `astro.config.mjs` calls it instead of calling `loadEnv` inline
- tests/clerk-publishable-key.test.ts (new) — Vitest coverage for `readPublishableKey()`: `--mode staging`, `--mode=staging`, no mode, and a host-set `process.env` key

## Steps

### Phase: RED

1. [x] Add a test to `e2e/auth-fail-closed.spec.ts` that registers `page.on('pageerror')` before `page.goto('/about')`, waits for the page to load, and asserts that the page has at least one `astro-island` element (so the test cannot pass on a page with no islands), that no error message contains `Missing publishableKey`, and that no `astro-island` element still carries the `ssr` attribute (Astro removes it once an island hydrates); widen the file's header comment to say it also covers public pages on a keyless build. Why: the uncaught Clerk error is the symptom that shows up on every keyless load, so it fails reliably today. Verify: `test ! -f .env && PLAYWRIGHT_BASE_URL=http://localhost:4332 npm run test:e2e -- auth-fail-closed --project=chromium` exits non-zero, with the new test failing on a captured `@clerk/astro: Missing publishableKey` page error; paste the output. The base URL makes Playwright start a fresh dev server from this worktree instead of reusing one on port 4321.
2. [x] Add a second test to the same file that loads `/about`, reads the island's `before-hydration-url` attribute, imports that URL first inside a fresh same-origin `srcdoc` iframe, and asserts the import resolves; when the attribute is absent the test passes, because there is nothing for islands to wait on (expected on CI's production build after the fix, since React's integration injects its before-hydration script only in dev). Why: islands only die when Clerk's `before-hydration` script happens to run first, so ordinary loads pass most of the time; forcing that order makes the race fail every run. Verify: the step 1 command fails this test with `rejected: @clerk/astro: Missing publishableKey`; paste the output.

### Phase: GREEN

3. [x] In `astro.config.mjs`, import `loadEnv` from `vite`, read `PUBLIC_CLERK_PUBLISHABLE_KEY` with `loadEnv(process.env.NODE_ENV, process.cwd(), '')`, and replace `clerk()` in `integrations` with a JSDoc-commented `clerkIntegration()` helper that returns `clerk()` unchanged when the key starts with `pk_`, and otherwise replaces the integration's `astro:config:setup` hook with one that calls the original with `injectScript: () => {}`. Why: this keeps the Vite plugin and env schema that `Show` and the rest of Clerk's components need, while dropping the two browser scripts that throw without a key; `loadEnv` is needed because Astro does not load `.env` into `process.env` before the config runs, while Netlify's variables are already in `process.env` and `loadEnv` reads both. Verify: the step 1 command exits 0 with both new tests and the existing fail-closed tests passing; if the tests still fail after 8 iterations, stop and report the exact blocker (the failing assertion, the last diff tried, and what was ruled out) and do not report success.
4. [x] Add a short note under the Clerk sections of `src/content/docs/guide/environment-configuration.mdx` and `project-docs/11-reference/environment-configuration.md`: without a `pk_` publishable key at build time, the site keeps the Clerk integration but skips Clerk's browser scripts, so pages and islands load normally and protected routes return the 503 setup notice; to turn Clerk on, set both keys and rebuild, because the publishable key is baked in at build time. Why: the repo's rule is that behavior changes are documented in both the Starlight guide and the project docs, and "add the key and redeploy" is the step salttampa.org needed and nearly missed. Verify: `grep -c "browser scripts" src/content/docs/guide/environment-configuration.mdx project-docs/11-reference/environment-configuration.md` prints a count of at least 1 for each file.
5. [x] Add an entry to `CHANGELOG.md` under `[Unreleased]` → `### Fixed` describing the race, its symptom (interactive sections randomly dead on keyless builds), and the fix in `astro.config.mjs`. Why: the user's PR rules require a changelog entry, and template users need to know their keyless deploys were affected. Verify: `sed -n '/## \[Unreleased\]/,/^## \[[0-9]/p' CHANGELOG.md | grep -n "publishableKey"` prints a line that falls after the `### Fixed` heading.

### Phase: VERIFY

6. [x] Build twice with the Node adapter and check the client output for `__CLERK_ASTRO_DATA__`, a string that appears only in Clerk's browser startup runner: first with no key, then with a placeholder `pk_` key. Why: this proves the gate works in both directions, so the fix cannot be a blanket removal that breaks sites with real keys. Verify: `ASTRO_ADAPTER=node npm run build && ! grep -rlq __CLERK_ASTRO_DATA__ dist/client` exits 0, then `PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_placeholder ASTRO_ADAPTER=node npm run build && grep -rlq __CLERK_ASTRO_DATA__ dist/client` exits 0.
7. Run lint, formatting, and type checks on the touched code files only. Why: the user's rules forbid repo-wide formatters, and a green test run over code that does not type-check is not verified. Verify: `npx eslint astro.config.mjs e2e/auth-fail-closed.spec.ts`, `npx prettier --check astro.config.mjs e2e/auth-fail-closed.spec.ts CHANGELOG.md`, and `npm run type-check` each exit 0; if `npm run type-check` fails, confirm on `primary` whether the same errors already exist before treating them as this change's.
8. [x] Run the CI-gated Vitest suites and the full CI e2e filter. Why: these are the hard gates CI runs, and the config change touches every page. Verify: `npx vitest run tests/content-collections.test.ts tests/compress-html-whitespace.test.ts tests/email.test.ts tests/send-email.test.ts` exits 0, and `PLAYWRIGHT_BASE_URL=http://localhost:4332 npm run test:e2e -- astro-v7-upgrade auth-fail-closed --project=chromium` exits 0.
9. [x] Do an agent-driven browser pass on the dev server: start it with `mcp__Claude_Browser__preview_start` (name `dev`), confirm with `lsof` that the process on port 4331 runs from this worktree, reload `/about` 5 times, and on each load read the island's `ssr` attribute with `mcp__Claude_Browser__javascript_tool` and the console with `mcp__Claude_Browser__read_console_messages`. Why: the tests prove the mechanism, and this proves a person loading the page sees working sections and a clean console. Verify: report the measured result per load; all 5 show 0 unhydrated islands and 0 console errors, and the header shows the theme toggle with no Clerk sign-in control, the same as before the fix.

## Tests

Tier 1 — This plan changes application code

- Objective: a keyless build loads `/about` with no Clerk error and a hydrated island. File: e2e/auth-fail-closed.spec.ts; Type: smoke; Asserts: the page has at least one `astro-island`, no page error contains `Missing publishableKey`, and no `astro-island` keeps the `ssr` attribute after load; Run: PLAYWRIGHT_BASE_URL=http://localhost:4332 npm run test:e2e -- auth-fail-closed --project=chromium
- E2E: islands survive the losing script order. File: e2e/auth-fail-closed.spec.ts; Targets: Clerk's before-hydration script imported first in a fresh same-origin document; Key cases: the import resolves on a keyless build, and the test passes when no before-hydration script exists at all

## Acceptance Criteria

- [x] On a build with no `PUBLIC_CLERK_PUBLISHABLE_KEY`, loading `/about` raises no `Missing publishableKey` error in the browser console.
- [x] On a keyless build, importing an island's `before-hydration-url` first in a fresh document resolves instead of rejecting.
- [x] A keyless `ASTRO_ADAPTER=node npm run build` produces client output with no `__CLERK_ASTRO_DATA__`, and the same build with a `pk_` key produces client output that contains it.
- [x] `npm run test:e2e -- astro-v7-upgrade auth-fail-closed --project=chromium` exits 0, and the existing protected-route 503 tests still pass.
- [x] The Starlight guide, the project docs, and `CHANGELOG.md` each describe what a keyless build does with Clerk.

## Completion Report

- Step 7 (`npm run type-check` exits 0) — blocked on a failure that predates this plan: `tsc --noEmit` exits 2 with 103 errors, and a clean export of `primary` (d317bd7) produces the identical 103-error set, unchanged after the `astro-breadcrumb.tsx` fix. None is in a file this plan touches; CI runs this step with `continue-on-error: true`. `eslint` and `prettier --check` on the touched files, `astro-breadcrumb.tsx` included, both exit 0.

## Verification

With no `.env` in the worktree, run `PLAYWRIGHT_BASE_URL=http://localhost:4332 npm run test:e2e -- astro-v7-upgrade auth-fail-closed --project=chromium` and expect exit 0, with the two new tests listed as passing. Then run the two builds from step 6 and expect `__CLERK_ASTRO_DATA__` to be absent from `dist/client` without a key and present with `PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_placeholder`. Finally, open `/about` on the dev server in the browser pane, reload it 5 times, and confirm each load shows 0 unhydrated islands and 0 console errors. Before the fix, the step 2 test fails on every run, so a passing run is evidence of the fix, not of a lucky load order.

## Next Steps

- Port the fix to the salt-tampa site
  The card gallery that surfaced this bug lives in salt-tampa, which has its own copy of `astro.config.mjs`. It has keys in Netlify today, so this only matters if they are ever removed, or for a preview build without them.
  ```text
  In the salt-tampa repo, check whether astro.config.mjs registers clerk() unconditionally the way astro-basics did before it fixed this. If it does, port the astro-basics fix: read PUBLIC_CLERK_PUBLISHABLE_KEY with loadEnv from vite, and wrap clerk() so its astro:config:setup hook gets a no-op injectScript when the key does not start with pk_. Add a Playwright test that loads the homepage with no key and asserts no "Missing publishableKey" page error and that the card gallery's astro-island has no ssr attribute. Add a CHANGELOG entry. Verify: run the new test against a dev server started with no .env and confirm it passes, and confirm it fails with the fix reverted.
  ```
- Stop islands waiting on Clerk's download when a key is set
  With a valid key, on loads where Clerk's before-hydration script runs first, every island waits for Clerk's JavaScript to download from Clerk's servers before it hydrates, even on pages that never use sign-in.
  ```text
  In the astro-basics repo, measure how long islands on /about wait before hydrating when a real Clerk publishable key is set, on loads where Clerk's before-hydration script runs first (node_modules/@clerk/astro/dist/index.js injects it; node_modules/astro/dist/runtime/server/astro-island.js awaits it). Compare against a build without the key. If the delay is material, propose the smallest change that stops public pages' islands from waiting on Clerk, keeping sign-in working in the header. Write the proposal only; do not implement. Verify: report the measured hydration times for both builds, with the method used.
  ```

## Resources

- Session "Card gallery controls Clerk key" (salt-tampa) — the original reproduction: 1 of 4 loads left the gallery and testimonials unhydrated, and the console order matched the before-hydration script running first.
- `node_modules/@clerk/astro/dist/index.js` — where `clerk()` injects the `before-hydration` and `page` scripts.
- `node_modules/@clerk/astro/dist/chunk-NBEDB76N.js` — `runOnce` and `createClerkInstanceInternal`, which throw on the first call without a key.
- `node_modules/astro/dist/runtime/server/astro-island.js:58` — the `await import(beforeHydrationUrl)` every island runs before `start()`.
- `node_modules/@clerk/astro/components/control/Show.astro` — imports `virtual:@clerk/astro/config`, which is why the integration must stay registered.
- Astro docs, "Using environment variables in the Astro config" — the documented `loadEnv` pattern from `vite`.
