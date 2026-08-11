---
status: todo
type: feature
created: 2026-08-10
issue: https://github.com/shawn-sandy/astro-basics/issues/366
effort: high
workflow: always
glance: An agent handed this repo today cannot verify anything it does — the quality gates are red by policy, the setup wizard crashes on a fresh clone, and much of what the instructions say is false. When this plan is done, a keyless clone serves a working site, the gates are green and CI-enforced, and every capability the instructions describe is invocable and machine-checked for truth.
---

# Plan: Make every agentic affordance in astro-basics executable, verifiable, and true

## Objective

Convert astro-basics into a Claude Code-first agentic starter kit by delivering the proposal's nine features in roadmap order: a zero-config first run with fail-closed security, a green and enforced quality gate, a truthful instruction corpus backed by invocable skills, a repo-native AI-driven CMS, and a scripted deploy story for Netlify, Vercel, and Cloudflare.

## Context

This plan executes the converged proposal at docs/prompts/proposal-build-agentic-starter-kit.md. The proposal's core finding: the repo carries 5,224 lines of AI instruction across 33 files, 8 subagents, and 16 slash commands, yet almost none of it is agent-operable — every affordance is prose describing a capability rather than an executable surface an agent can invoke and verify. The gates are pre-broken (127 type errors, ~49 vitest failures, both `continue-on-error` flags in CI), three slash commands have no backing implementation, and `npm run db:wizard` — self-described as "Interactive setup for non-developers" — crashes before its first prompt on a fresh clone because 21 scripts pass `--env-file=.env` to Node — 16 of the 22 `db:*`/`setup:*` scripts plus 5 `test:*` scripts — a fatal startup error when the file is absent.

Nine decisions are locked and must not be reopened: Claude Code is the first-class target; the AI CMS is repo-native (agent authors MDX via commits — no runtime CMS); prune in place (astro-basics itself becomes the starter); fix the baseline to green before building agent machinery; collapse the instruction corpus to a thin CLAUDE.md plus skills; capability is packaged skills-first; both security defects are fixed early; Cloudflare is deferred to its own feature; and zero-config static-first is the default posture.

Known risks, with mitigations built into the steps: Feature A (green baseline) is large and unglamorous — if it stalls, the fallback is a consciously scoped gate (green-gate the starter-relevant surface, quarantine the rest), a deliberate downgrade rather than drift. Skills-first packaging has no compile-time truth — step 4's referential-integrity check is the compensating control, and its residual risk (a skill that resolves but produces wrong code) is accepted and named. Deleting instructions can delete load-bearing knowledge — steps 3 and 5 are sequenced so pattern knowledge migrates into skills before the prose that carried it is removed. GitHub Actions on this account is frequently billing-blocked, so every CI-dependent verify names a local equivalent.

## Files

- package.json (modified) — guard the 21 `--env-file=.env` script entries; add `check:refs`, Vercel deploy scripts, `@astrojs/cloudflare`
- scripts/setup-wizard.js (modified) — survive a missing `.env` and print guidance instead of crashing
- src/middleware.ts (modified) — fail closed: serve the setup-notice page with HTTP 503 on protected routes when Clerk keys are absent or placeholders
- .claude/hooks/css-refactor-hook.js (deleted) — registered nowhere, its own CONFIG block commented out
- src/pages/api/test/sync-user.ts (deleted) — unauthenticated service-role write; delete or DEV-gate
- scripts/lib/preflight-env.mjs (new) — copies `.env.example` to `.env` when absent; shared by all db/setup scripts
- src/components/astro/Navigation.astro (modified) — hide Dashboard/Forum/Organization links while auth is unconfigured
- src/pages/auth-setup.astro (new) — styled 503 setup-notice page shown for protected routes when auth is unconfigured
- .husky/pre-push (new) — local gate: `npm run type-check` plus `npm run check:refs`
- README.md (modified) — lead with the zero-config first run; fix the 4321 vs 4330/4331 port drift; state baseline status honestly
- src/types/design-tokens.ts (modified) — TS2484 export-conflict cluster at lines 489-497
- src/utils/email-validation.ts (modified) — TS18048 cluster (9 errors) from `noUncheckedIndexedAccess`
- .github/workflows/ci.yml (modified) — remove both `continue-on-error: true` lines; add the `check:refs` job
- CLAUDE.md (modified) — becomes a thin, true routing file; fix the `src/content/config.ts` reference
- CLAUDE.md.backup (deleted) — pre-refactor snapshot linked as authoritative
- copilot.instructions.md (deleted) — titled for a different project (`@shawnsandy/astro-kit`)
- .github/instructions/ (modified) — collapse the 9 exact-name duplicate pairs
- .claude/settings.json (new) — committed shared config a fresh cloner inherits
- .claude/skills/ (new) — scaffold-page, scaffold-component, scaffold-api-endpoint, add-module, author-content, and wcag-compliance-reviewer skills (the last is advertised in CLAUDE.md today but has never existed)
- .claude/agents/astro-basics-release-manager.md (modified) — add the missing frontmatter
- .claude/agents/css-refactor-agent.md (modified) — replace invalid tool names (`Bash:read`, `FileEditor`, `CodebaseSearch`)
- .claude/commands/ (modified) — back or delete the phantom `db-health`, `db-cleanup`, `db-debug`; fill or delete the empty `pull-request.md`
- scripts/check-references.mjs (new) — referential-integrity checker behind `npm run check:refs`
- src/pages/docs/[page].astro (modified) — remove the dead `data.publish` filter that empties the paginated docs route
- astro.config.mjs (modified) — Starlight sidebar to `autogenerate`; remove the hardcoded ngrok host; Cloudflare adapter branch and image service
- src/utils/ip-validation.ts (modified) — replace `node:net` `isIP` with a runtime-neutral check (Cloudflare blocker)
- src/utils/rate-limiter.ts (modified) — remove module-scope `setInterval` and per-isolate state (Cloudflare blocker)
- src/components/react/ContactForm.tsx (modified) — gate the hardcoded `data-netlify="true"` behind the site-config flag
- src/views/ContactFormView.tsx (deleted) — near-duplicate of src/components/react/view/ContactFormView.tsx
- src/styles/ (modified) — remove orphaned `_component-sample-tokens.scss` and `_header.scss`; stop committing built CSS once the build step is unskippable

## Steps

1. Make a fresh clone run with zero configuration: replace the 21 `node --env-file=.env` invocations in package.json with a shared `scripts/lib/preflight-env.mjs` preflight that copies `.env.example` to `.env` when absent — locked over in-process loading because it automates the exact README step humans already perform and gives `db:wizard` a file to edit — make `scripts/setup-wizard.js` print guidance instead of dying, rewrite README's opening to lead with clone → install → `npm run dev`, reconcile the port drift (README says 4321; `.claude/launch.json` uses 4330/4331), and state the red-baseline status honestly until step 3 lands Why: 21 scripts die before their first prompt on a fresh clone — including `db:wizard`, the documented non-developer entry point — so the locked zero-config posture is impossible until this single highest-leverage fix lands Verify: in a scratch checkout with no `.env`, `npm run db:status` and `npm run db:wizard` start and print guidance instead of Node's fatal `--env-file` error, and `npm run dev` serves the homepage with no env vars set.
2. Close both security holes: rewrite `src/middleware.ts` so that when Clerk keys are absent or placeholders the protected-route matcher (`/dashboard`, `/forum`, `/organization`) serves the setup-notice page directly with HTTP 503 — a direct response or internal rewrite, never a 3xx redirect, so the status code itself carries the refusal — instead of omitting `authMiddleware` from the `sequence()` entirely; fix the redirect target for the configured-auth path, where `forum` and `organization` currently send unauthenticated users to `/sign-in` while the real route is `/login`; and delete `src/pages/api/test/sync-user.ts` — an endpoint that accepts an arbitrary `userId` and writes via the Supabase service-role client with no auth check — or gate it behind `import.meta.env.DEV`; render blocked routes as a styled 503 setup-notice page on the Base layout ("authentication isn't configured yet", pointing at the setup path) and hide the Dashboard/Forum/Organization links in `src/components/astro/Navigation.astro` while auth is unconfigured Why: a starter a non-developer deploys must not ship a fail-open auth gate or a publicly reachable service-role write — both holes are live today on any keyless deploy — and a visitor who clicks a protected link deserves guidance, not a dead end Verify: with placeholder keys, `curl -s -o /dev/null -w '%{http_code}' http://localhost:4321/dashboard` prints 503 and a GET of the same URL contains the setup-notice text, the nav renders without the three protected links, and `POST /api/test/sync-user` returns 404 in a production build.
3. Drive `npm run type-check` and `npm test` to green without behaviour changes: fix the 127 type errors across 25 files by family — TS18048 null-guards from `noUncheckedIndexedAccess` (9 in `src/utils/email-validation.ts` alone), the TS2484 export conflicts at `src/types/design-tokens.ts:489-497`, TS2339 `never` errors from Supabase generated types in `role-guard.ts` and `user-sync.ts` — repair the ~49 vitest failures (role-validator, csrf, ip-validation), and move integration tests that need live Supabase credentials behind a separate `test:integration` script excluded from `npm test` entirely; keep `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` enabled — fixing under the flags is the point, relaxing them is the quiet version of `continue-on-error`; any fix that would change behaviour moves to another step with a comment naming why; stall trigger: if two focused working sessions do not bring type-check errors below ~30, switch to the scoped-gate fallback (green-gate the starter-relevant surface, record the quarantine list in this spec) as a conscious, recorded downgrade Why: an agent without a trustworthy gate either burns its run on 127 unrelated errors or learns to ignore red — both fatal to autonomous operation — and the error families are already clustered, so this is volume work, not research Verify: `npm run type-check` exits 0 and `npm test` exits 0 on a clean checkout with the credentialed suite excluded by default.
4. Make CI's gate real: remove both `continue-on-error: true` lines from `.github/workflows/ci.yml` (lines 58 and 75) plus the inline comment excusing the red baseline, and replace the four hand-named `npx vitest run <specific files>` gates with the same command step 3's definition of done names — the job must invoke `npm test` (plus `npm run test:e2e` for the e2e gate), not a curated subset, so command parity with local development is enforced rather than assumed; retain only the deliberate `tests/integration/**` exclusion, which step 3 moved behind `test:integration`; add a `.husky/pre-push` hook running `npm run type-check` — deliberately the fast checks only, so the hook stays fast enough that nobody bypasses it; the residual risk is explicit and accepted: during a GitHub Actions billing outage a unit-test regression can be pushed, because nothing automatically runs `npm test` locally, so an outage means running `npm test` by hand before pushing Why: removing `continue-on-error` while the job still runs four named files leaves the gate cosmetic — CI stays green with most of the suite outside it, which is the same failure this step is meant to end Verify: `grep -c continue-on-error .github/workflows/ci.yml` returns 0, `grep -c 'npx vitest run tests/' .github/workflows/ci.yml` returns 0, the workflow contains a literal `npm test` invocation, and running `npm run type-check && npm test` locally exits 0.
5. Collapse the instruction corpus to a thin, true CLAUDE.md: delete `CLAUDE.md.backup` and the link calling it authoritative, delete `copilot.instructions.md` (titled for `@shawnsandy/astro-kit`, a different project), delete the unloadable `". cursorrules"` (literal space after the dot), delete `.claude/hooks/css-refactor-hook.js` — registered in no settings file and carrying a fully commented-out CONFIG block, so it runs nowhere and never has — collapse the 9 exact-name duplicate pairs under `.github/instructions/`, reconcile `.github/copilot-instructions.md`, fix the `src/content/config.ts` → `src/content.config.ts` reference, and commit a real `.claude/settings.json` — derived from `settings.local.json` but stripped of the embedded 30-line commit message and the 4 dead `openspec` grants; CLAUDE-PATTERNS.md content that describes how to write correct code is marked for migration but not yet deleted Why: 5,224 lines across 33 files where much is false, duplicated, or unloadable actively misleads the agent, but pattern knowledge must move into skills (step 7) before its prose is deleted, so this step removes only what is dead or false Verify: `wc -l` across the surviving instruction files shows at least 1,090 lines removed and the corpus below 4,200 — the attainable ceiling for this step, since the deletable dead weight is exactly `CLAUDE.md.backup` (623) + `copilot.instructions.md` (371) + `". cursorrules"` (96) and the nine duplicate twins are 0-line aliases; the corpus only crosses the halfway mark once step 7 migrates `CLAUDE-PATTERNS.md` (966), `CLAUDE-ANTI-PATTERNS.md` (956), and `CLAUDE-VALIDATION.md` (615) into skills, so that assertion belongs there and not here — every file path referenced in the survivors resolves via a spot-check, `.claude/hooks/` contains no unregistered scripts, and a fresh clone sees the committed `.claude/settings.json`.
6. Build the referential-integrity checker: author `scripts/check-references.mjs` wired as `npm run check:refs`, parsing `.claude/**` (commands, agents, skills, settings grants) and the surviving instruction files — both structured references and backtick-quoted repo-path-shaped strings in prose, with an inline ignore marker for deliberate examples — and failing with a named list when any referenced npm script, file path, slash command, agent, or skill does not resolve; the checker also validates `.claude/agents/` frontmatter — every file parses, and every entry in its `tools:` list appears in an explicit allowed-tool set the checker owns as a named constant, which is the source of truth the invalid-tool-name test case asserts against — and flags any script under `.claude/hooks/` that no settings file registers; ships with a fixture-based test proving it catches today's real defect classes (the three phantom `db-*` commands and the `Skill(design-token-extractor)` grant for a skill that ships only as an agent) Why: skills-first capability packaging was chosen for speed over testability, and this repo already demonstrates the resulting drift three times over; this check converts that class of failure from invisible to blocking without giving up the flexibility the decision bought Verify: `npm run check:refs` fails on the current tree naming the known phantoms, and `npx vitest run tests/check-references.test.ts` passes its fixture cases.
7. Repair the agent registry and ship the capability skills: add the missing frontmatter to `.claude/agents/astro-basics-release-manager.md`, fix the invalid tool names in `css-refactor-agent.md`, collapse the two duplicate agent pairs (`code-reviewer`/`astro-basics-code-reviewer`, `release-manager`/`astro-basics-release-manager`), back the three phantom `db-*` commands with scripts or delete them, fill or delete the 1-line `pull-request.md`; then author `.claude/skills/` entries for scaffold-page, scaffold-component (enforcing astro/react/dashboard placement and the mandatory `type Props` export), scaffold-api-endpoint (auth-check-first, consistent `{ error, details? }` shape), and add-module — author `.claude/skills/wcag-compliance-reviewer/` as part of this step — `CLAUDE.md:150` advertises it and `:157` instructs using it, but only `fpkit-developer` is actually committed, so it is a phantom skill and every UI-producing skill emits semantic, WCAG 2.1 AA-conformant markup and ends by invoking it, and each migrates the corresponding CLAUDE-PATTERNS.md prose into itself before that prose is deleted; finally add the `check:refs` job to `.github/workflows/ci.yml` and append `npm run check:refs` to `.husky/pre-push` now that the tree passes it Why: this turns the five surfaces the original ask names — setup, coding, extensions, modules, pages — from description into invocable capability, and doing the PATTERNS migration here honours the delete-only-after-knowledge-moves risk Verify: each skill invoked in a scratch session produces a file that passes `npm run type-check` and the placement rules, a fixture assertion confirms every UI-producing skill's body contains the `wcag-compliance-reviewer` invocation (so the requirement is machine-checked, not honour-system), `npm run check:refs` exits 0, and ci.yml contains the check job.
8. Make content authoring a first-class agent operation: author an `author-content` skill that reads `baseSchema` from `src/content.config.ts`, emits valid frontmatter for all four required fields (`title`, `pubDate`, `description`, `author`), and never sets `publish: true` on its own — the existing zod default `publish: false` is the human review gate; fix `src/pages/docs/[page].astro:13`, which filters the docs collection on `data.publish`, a field `docsSchema` never defines, so the paginated route always yields nothing; restructure the hardcoded Starlight `sidebar` array in `astro.config.mjs` to the hybrid shape — curated top-level section order kept, each section's contents autogenerated from its directory — so new guide pages appear without config edits while the reading order survives Why: content is already git-native with an accidental review gate built into the schema — this step makes the agent the CMS while keeping a human between authorship and publication Verify: invoking the skill produces an MDX file that passes `astro check`/zod validation and is invisible on `/posts` until `publish` is flipped, and `/docs/2` (or any paginated docs page) returns entries instead of an empty list.
9. Prune the dead weight and ship the two-platform deploy story: delete the ~12 one-off historical migration scripts wired to no npm script, the near-duplicate `src/views/ContactFormView.tsx`, and the orphaned `_component-sample-tokens.scss` and `_header.scss`; make the SCSS build unskippable — Base.astro imports `../styles/index.css`, which only the standalone `sass` CLI produces, so add a `predev` one-shot compile and fold the watcher into `npm run dev` (today's `npm run start` behaviour; `start` becomes an alias) — then stop committing the built CSS; fix the `13-agents/`/`13-refactorings/` numbering collision and the devcontainer's Node 20 vs `engines.node >=22.12.0` conflict; document and script the `ASTRO_ADAPTER` switch with Vercel deploy scripts matching the existing Netlify `deploy:preview`/`deploy:prod`, remove the hardcoded ngrok host from `astro.config.mjs`, and gate `ContactForm.tsx`'s hardcoded `data-netlify="true"` behind the site-config flag Why: an agent's search space must be signal and deployment must be one invocable operation per platform on the two platforms that already work Verify: `npm run build` succeeds from a clean tree without pre-committed CSS, `ASTRO_ADAPTER=netlify` and `=vercel` builds both exit 0, and `git grep -l ngrok astro.config.mjs` returns nothing.
10. Make the codebase Workers-clean and add Cloudflare as the third platform: add `@astrojs/cloudflare` and its branch to the adapter switch in `astro.config.mjs`, replace `node:net` `isIP` in `src/utils/ip-validation.ts` (used on the request path via middleware rate limiting) with a runtime-neutral check, configure a Workers-compatible image service (Astro's default sharp service will not run there), and replace the in-memory rate limiter's module-scope `setInterval` and per-isolate state in `src/utils/rate-limiter.ts` — which is already semantically broken on all serverless targets — with a runtime-aware design: in-memory limiting stays for the node adapter where it actually works, and each serverless adapter disables it only in exchange for a committed edge policy — **including Netlify, which is the default adapter and therefore the most likely production target** — meaning a `netlify.toml` rate-limit rule, a `vercel.json` rule, and a Cloudflare equivalent (WAF rate-limiting rule or Durable-Object-backed limiter), all checked in and referenced from the README, never a bare "the platform handles it"; `rateLimitMiddleware` is currently the only quota in front of the public `POST /api/message-us`, which proceeds to a database insert, so removing it without a replacement opens message spam and resource exhaustion on the default deploy; only after this lands may the README claim all three platforms Why: Cloudflare is the one platform that cannot be reached by an env-var switch — its `workerd` runtime rejects Node built-ins the request path currently uses, so this is runtime engineering, deliberately deferred to last and sized large Verify: `ASTRO_ADAPTER=cloudflare npm run build` exits 0, `git grep -l "node:net" src/` returns nothing, `wrangler dev` (or the adapter's preview) serves the homepage locally, and the committed edge rate-limit policy exists for both serverless targets — `vercel.json` carries a rate-limit rule and the Cloudflare config carries its equivalent — with a burst of requests past the configured threshold returning 429 against a preview deployment.

## Tests

Tier 1 — This plan changes application code
- Objective: a fresh keyless clone builds and serves the static core, and the agentic surface is internally consistent. File: tests/agentic-starter.smoke.test.ts; Type: smoke; Asserts: `npm run build` succeeds with no env vars set — the npm lifecycle command, not bare `astro build`, so the `prebuild` Sass compile that produces `src/styles/index.css` actually runs on a clean checkout — the built output contains the homepage and a published post with non-empty stylesheet output, and `check:refs` exits 0; Run: npx vitest run tests/agentic-starter.smoke.test.ts
- Unit: env preflight guard. File: tests/preflight-env.test.ts; Targets: scripts/lib/preflight-env.mjs; Key cases: missing `.env` copies `.env.example` and proceeds, existing `.env` left untouched, missing both fails with guidance
- Unit: referential-integrity checker. File: tests/check-references.test.ts; Targets: scripts/check-references.mjs; Key cases: phantom command fixture fails with its name in output, fully-resolving fixture passes, an agent tool name outside the checker's allowed-tool constant fails, agent frontmatter that does not parse fails, an unregistered `.claude/hooks/` script fails, backticked prose path to a nonexistent file fails, ignore-marked example passes
- Integration: fail-closed middleware. File: tests/middleware-fail-closed.test.ts; Targets: src/middleware.ts; Key cases: placeholder Clerk keys yield status 503 plus setup-notice body for `/dashboard` (asserting the code, not merely non-200), nav omits the three protected links, `/posts` stays public, configured keys redirect unauthenticated `/forum` and `/organization` to `/login`
- Integration: content-authoring output. File: tests/author-content.test.ts; Targets: the author-content skill's frontmatter contract; Key cases: all four required fields present, `publish` absent or false, output parses under `baseSchema`
- E2E: docs pagination returns entries. File: e2e/docs-pagination.spec.ts; Targets: /docs/[page] route; Key cases: page 1 renders a non-empty list after the dead `data.publish` filter is removed
- Unit: scaffold skills invoke the accessibility reviewer. File: tests/skill-contracts.test.ts; Targets: `.claude/skills/` UI-producing entries; Key cases: each of scaffold-page and scaffold-component references `wcag-compliance-reviewer`, a fixture skill missing it fails

## Acceptance Criteria

- [ ] A fresh clone with no `.env` runs `npm install && npm run dev` and serves the homepage, posts, and guide pages
- [ ] `npm run db:wizard` on a fresh clone reaches its first interactive prompt instead of a Node startup error
- [ ] With Clerk keys absent or placeholders, `/dashboard`, `/forum`, and `/organization` respond with HTTP 503 and the setup-notice body — no 3xx redirect — and the nav shows no links to them
- [ ] With Clerk configured, unauthenticated `/forum` and `/organization` requests redirect to `/login`, not the nonexistent `/sign-in`
- [ ] `src/pages/api/test/sync-user.ts` is deleted or unreachable in a production build
- [ ] `npm run type-check` and `npm test` both exit 0 on a clean checkout, with `tsconfig.json` still enabling `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`
- [ ] A `.husky/pre-push` hook runs `npm run type-check` and `npm run check:refs`
- [ ] `.github/workflows/ci.yml` contains no `continue-on-error` lines, invokes `npm test` rather than a hand-named subset of test files, and includes a `check:refs` job
- [ ] No unregistered scripts remain under `.claude/hooks/`
- [ ] Each serverless adapter ships a committed edge rate-limit policy; none disables the limiter without a replacement
- [ ] `CLAUDE.md.backup`, `copilot.instructions.md`, `". cursorrules"`, and the 9 duplicate instruction pairs are gone; every path the surviving instructions reference resolves
- [ ] A committed `.claude/settings.json` exists with no `openspec` grants and no embedded commit-message text
- [ ] `npm run check:refs` exits 0 on the finished tree and fails when a phantom reference fixture is introduced
- [ ] Every `.claude/agents/` file registers (valid frontmatter, valid tool names, no duplicate pairs) and every slash command has a backing implementation
- [ ] Every skill CLAUDE.md advertises exists under `.claude/skills/`, including `wcag-compliance-reviewer`
- [ ] The author-content skill emits all four required frontmatter fields and never sets `publish: true` unprompted
- [ ] The paginated docs route returns entries instead of an always-empty list
- [ ] `ASTRO_ADAPTER=netlify`, `=vercel`, and `=cloudflare` production builds all exit 0

## Verification

Walk the non-developer's path end to end on a scratch clone: `git clone` → `npm install` → `npm run dev` with zero env vars must serve the homepage, `/posts`, and the Starlight guide; `npm run db:wizard` must reach its first prompt. Then walk the agent's path: `npm run type-check`, `npm test`, and `npm run check:refs` all exit 0; invoke the scaffold-component skill and confirm the generated file lands in the right directory with a `type Props` export and passes type-check; invoke author-content and confirm the new MDX entry validates against `baseSchema` and stays invisible on `/posts` until `publish: true` is set by hand. Finally walk the deploy path: `ASTRO_ADAPTER=netlify npm run build`, `ASTRO_ADAPTER=vercel npm run build`, and `ASTRO_ADAPTER=cloudflare npm run build` each exit 0 from a clean tree. With placeholder Clerk keys, a GET of `/dashboard` on the preview server returns HTTP 503 and a body containing the setup-notice text — assert on the status code and the body, not a HEAD request, since a redirect would satisfy a bare "non-200" check while violating the contract.

## Next Steps

- Design the eject path for the opinionated features
  Prune-in-place leaves forum, dashboard, and organization in every clone; removing them safely is unscoped work the proposal names as a risk.
  ```text
  In the astro-basics repo, design an agent-invocable eject path for the
  forum, dashboard, and organization features: enumerate every file, route,
  middleware matcher, npm script, and instruction reference each feature
  owns, then propose either a removal skill or a manifest-driven script.
  Verify by running the removal on a scratch branch and confirming
  npm run type-check, npm test, and npm run check:refs all still exit 0.
  ```
- Automate the publish flip as a reviewed operation
  Today a human hand-edits `publish: true`; a PR-based flow would make the review gate first-class.
  ```text
  In the astro-basics repo, add a publish-content flow: a skill or script
  that opens a pull request flipping publish: true on a named entry under
  src/content/, so agent-authored content is published through code review
  rather than a direct edit. Verify by running it against a draft entry and
  confirming the PR diff touches only that entry's frontmatter.
  ```
- Wish list: retire the parallel sass CLI pipeline
  The interview kept the predev-plus-watcher approach; importing the SCSS through Astro/Vite would delete the second build system entirely.
  ```text
  In the astro-basics repo, migrate styling from the standalone sass CLI
  (prebuild/predev scripts) to Vite-native SCSS: import src/styles/index.scss
  from src/layouts/Base.astro, remove the sass npm scripts and the committed
  CSS outputs, and diff the rendered CSS before and after across the 11
  authored SCSS files (5,623 LOC). Verify: npm run dev and npm run build
  serve identical (or intentionally-diffed) styles with the sass CLI gone.
  ```
- Wish list: expose the repo-native CMS over MCP
  A local MCP server wrapping the author-content and publish flows would let non-Claude-Code clients drive the same repo-native CMS.
  ```text
  In the astro-basics repo, prototype an MCP server exposing author-content,
  list-drafts, and publish-request tools that wrap the existing repo-native
  content skills, keeping the publish:false review gate intact. Verify with
  the MCP inspector: each tool call produces the same file state as the
  corresponding skill invocation.
  ```

## Unresolved Questions

- Does the component-library identity survive the starter conversion?
  ```text
  In the astro-basics repo, investigate whether the package should remain a
  publishable component library: package.json declares exports and files
  while "private": true blocks publishing, and src/components/index.ts
  re-exports 6 dashboard components plus 1 React component the files array
  omits. Recommend keep-and-fix (real build:lib step, corrected files list)
  or drop (delete exports, files, and src/components/index.ts), with the
  blast radius of each.
  ```
- What is the eject story for forum, dashboard, and organization?
  ```text
  In the astro-basics repo, recommend whether an agent-invocable removal
  path for the forum, dashboard, and organization features belongs in the
  starter-kit scope, and whether it should be a skill or a manifest-driven
  script. Ground the recommendation in the file inventory each feature owns.
  ```
- Does the Starlight guide remain the documentation home alongside project-docs/?
  ```text
  In the astro-basics repo, recommend a single documentation home: the
  standing rule requires documenting features in both project-docs/ (113
  files) and the Starlight guide (28 pages), which doubles the drift
  surface under agent authorship. Compare consolidation options and their
  migration cost.
  ```

## Resources

- docs/prompts/proposal-build-agentic-starter-kit.md — the converged proposal this plan executes; carries the measured baseline (Appendix A), defect register (Appendix B), Cloudflare blockers (Appendix C), and the content-authoring I/O contract (Appendix D)
- CloudCannon, "Git-based CMS vs headless API CMS for AI" — the external grounding for the repo-native CMS decision: markdown-in-git is a native LLM format
- Astro on-demand rendering docs (docs.astro.build) — confirms the four official adapters and per-route prerender control underpinning the deploy story
- GitCMS (gitcms.dev) — commercial validation that "Claude as content agent over git" works; astro-basics ships it repo-native without the SaaS dependency
